import { connectToDatabase } from "../../config/db";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { User } from "../../models/User";
import { BudgetService } from "../budget/budget.service";
import { WorkflowService } from "../workflow/workflow.service";
import { LoggerService } from "../logs/logger.service";
import { RequestNotifier } from "../notifications/request-notifier";
import { RequestStatus } from "../../enums/statuses";
import { SystemRole } from "../../enums/roles";
import { AuditAction } from "../../enums/auditActions";
import { WorkflowActionType } from "../../enums/workflowActions";
import { IAttachment, IUser } from "../../types";

const getActorId = (actor: any): string => {
  return (actor?._id || actor?.id)?.toString() || "";
};

/**
 * Accepts either shape of supporting-document payload.
 *
 * Requests carry a list of attachments, but the previous contract sent a single
 * `supportingDocument` string. Both are normalised here so an older client — or
 * the seed script — keeps working without a separate code path.
 */
function normaliseAttachments(data: any, actor: any): IAttachment[] {
  const stamp = (attachment: Partial<IAttachment>): IAttachment => ({
    name: attachment.name || "",
    url: attachment.url || attachment.name || "",
    publicId: attachment.publicId,
    size: attachment.size,
    mimeType: attachment.mimeType,
    uploadedById: getActorId(actor) || undefined,
    uploadedByName: actor?.name,
    uploadedAt: new Date(),
  });

  if (Array.isArray(data.supportingDocuments) && data.supportingDocuments.length > 0) {
    return data.supportingDocuments.map(stamp);
  }

  if (data.supportingDocument) {
    return [stamp({ name: data.supportingDocument, url: data.supportingDocument })];
  }

  return [];
}

export class ExpenseService {
  /**
   * Generates a unique request number, e.g. EXP-2026-0001.
   *
   * Derives the sequence from the highest existing number for the year rather
   * than a document count: counting collides whenever two requests are created
   * concurrently, and `requestNumber` carries a unique index, so one of the two
   * submissions used to fail with a duplicate-key error. The retry loop closes
   * the remaining race between reading the max and inserting.
   */
  private static async generateRequestNumber(attempt = 0): Promise<string> {
    await connectToDatabase();
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;

    const latest = await ExpenseRequest.findOne({ requestNumber: { $regex: `^${prefix}` } })
      .sort({ requestNumber: -1 })
      .select("requestNumber")
      .lean();

    const lastSequence = latest ? Number(latest.requestNumber.slice(prefix.length)) || 0 : 0;
    const candidate = `${prefix}${String(lastSequence + 1 + attempt).padStart(4, "0")}`;

    // A parallel request may have claimed this number between the read above and
    // our insert; step forward until we find a free one.
    const taken = await ExpenseRequest.exists({ requestNumber: candidate });
    if (taken) {
      if (attempt > 25) {
        throw new Error("Unable to allocate a unique request number. Please retry.");
      }
      return this.generateRequestNumber(attempt + 1);
    }

    return candidate;
  }

  /**
   * Create a new draft expense request
   */
  public static async createRequest(actor: IUser | any, data: any) {
    await connectToDatabase();
    
    const supportingDocuments = normaliseAttachments(data, actor);
    if (supportingDocuments.length === 0) {
      throw new Error("Supporting documentation / invoice is mandatory.");
    }
    
    const actorId = getActorId(actor);
    if (!actorId) {
      throw new Error("Initiator ID is required.");
    }

    let departmentId = actor.departmentId || data.departmentId;

    if (!departmentId) {
      const dbUser = await User.findById(actorId);
      if (dbUser && dbUser.departmentId) {
        departmentId = dbUser.departmentId;
      }
    }

    if (!departmentId) {
      const Department = (await import("../../models/Department")).Department;
      const defaultDept = await Department.findOne();
      if (defaultDept) {
        departmentId = defaultDept._id;
      }
    }

    if (!departmentId) {
      throw new Error("Department ID is required.");
    }

    const requestNumber = await this.generateRequestNumber();
    
    const request = new ExpenseRequest({
      requestNumber,
      departmentId,
      initiatorId: actorId,
      category: data.category,
      description: data.description,
      amount: Number(data.amount),
      supportingDocuments,
      vendorName: data.vendorName,
      vendorBankDetails: {
        accountNumber: data.vendorBankDetails.accountNumber,
        bankName: data.vendorBankDetails.bankName,
        accountName: data.vendorBankDetails.accountName,
      },
      requiredPaymentDate: new Date(data.requiredPaymentDate),
      status: RequestStatus.DRAFT,
      currentStepIndex: 0,
      history: []
    });

    await request.save();
    
    const logActor = { id: actorId, name: actor.name, role: actor.role };
    await LoggerService.logAudit(
      AuditAction.EXPENSE_CREATED,
      `Draft request ${requestNumber} created for ₦${request.amount.toLocaleString()}`,
      { requestId: request._id },
      logActor
    );
    
    return request;
  }

  /**
   * Submits a request and triggers the automatic budget validation
   */
  public static async submitRequest(requestId: string, actor: IUser) {
    await connectToDatabase();
    
    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== RequestStatus.DRAFT && request.status !== RequestStatus.RETURNED) {
      throw new Error("Only draft or returned requests can be submitted.");
    }

    const previousStatus = request.status;
    request.status = RequestStatus.SUBMITTED;
    await request.save();
    
    const actorId = getActorId(actor);
    const logActor = { id: actorId, name: actor.name, role: actor.role };
    
    // Add to history
    request.history.push({
      statusBefore: previousStatus,
      statusAfter: RequestStatus.SUBMITTED,
      actorId: actorId,
      actorName: actor.name,
      actorRole: actor.role,
      action: "Submit Request",
      timestamp: new Date()
    });

    // Run Budget Validation
    request.status = RequestStatus.BUDGET_CHECK;
    await request.save();
    
    const budgetCheck = await BudgetService.validateRequestBudget(
      request.departmentId.toString(),
      request.amount,
      request.requiredPaymentDate
    );

    if (budgetCheck.isValid) {
      // Sufficient budget -> Lock budget and move to first step of workflow
      await BudgetService.lockBudget(request._id.toString());
      
      const nextRouting = await WorkflowService.getNextStepForRequest(request);
      if (nextRouting) {
        request.status = RequestStatus.PENDING_APPROVAL;
        request.currentStepIndex = nextRouting.index;
        
        request.history.push({
          statusBefore: RequestStatus.BUDGET_CHECK,
          statusAfter: RequestStatus.PENDING_APPROVAL,
          actorId: actorId,
          actorName: "System Engine",
          actorRole: SystemRole.ADMIN,
          action: `Budget Validated. Routed to: ${nextRouting.step.stepName}`,
          timestamp: new Date()
        });
        
        await request.save();
        await LoggerService.logAudit(
          AuditAction.EXPENSE_SUBMITTED_APPROVED_BUDGET,
          `Request ${request.requestNumber} passed budget check and routed to ${nextRouting.step.stepName}`,
          undefined,
          logActor
        );
      } else {
        // No steps configured -> Auto approve to finance
        request.status = RequestStatus.APPROVED;
        await request.save();
      }
    } else {
      // Insufficient budget -> route to Finance Head for exceptional approval
      request.status = RequestStatus.PENDING_EXCEPTIONAL;
      request.history.push({
        statusBefore: RequestStatus.BUDGET_CHECK,
        statusAfter: RequestStatus.PENDING_EXCEPTIONAL,
        actorId: actorId,
        actorName: "System Engine",
        actorRole: SystemRole.ADMIN,
        action: `Budget Overrun. Flagged: ${budgetCheck.message}`,
        timestamp: new Date()
      });
      
      await request.save();
      
      await LoggerService.logAudit(
        AuditAction.BUDGET_OVERRUN,
        `Request ${request.requestNumber} triggered a budget overrun alert. Flagged: PENDING_EXCEPTIONAL`,
        { budgetCheck },
        logActor
      );
    }

    // Tell the initiator their request moved. Non-blocking by design.
    await RequestNotifier.notifyInitiator(request);

    return request;
  }

  /**
   * Processes exceptional budget approval from Finance Head
   */
  public static async processExceptionalBudget(requestId: string, actor: IUser, action: WorkflowActionType, comment?: string, adjustedAmount?: number) {
    await connectToDatabase();
    if (actor.role !== SystemRole.FINANCE_HEAD) {
      throw new Error("Only the Finance Head can perform exceptional budget actions.");
    }

    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== RequestStatus.PENDING_EXCEPTIONAL) {
      throw new Error("Request is not awaiting exceptional budget approval.");
    }

    const previousStatus = request.status;
    const actorId = getActorId(actor);
    const logActor = { id: actorId, name: actor.name, role: actor.role };

    if (action === WorkflowActionType.APPROVE) {
      request.exceptionalBudgetApproved = true;
      request.exceptionalApprovedBy = actorId as any;
      
      if (adjustedAmount && adjustedAmount > 0) {
        request.originalAmount = request.amount;
        request.amount = adjustedAmount;
      }

      // Lock budget (bypassing normal checks, locks whatever amount is now approved)
      await BudgetService.lockBudget(request._id.toString());

      // Move to regular workflow approvals starting at step 0
      request.status = RequestStatus.PENDING_APPROVAL;
      request.currentStepIndex = 0;
      
      request.history.push({
        statusBefore: previousStatus,
        statusAfter: RequestStatus.PENDING_APPROVAL,
        actorId: actorId,
        actorName: actor.name,
        actorRole: actor.role,
        action: "Approve One-Time Budget Expansion",
        comment,
        timestamp: new Date()
      });
      
      await request.save();
      await LoggerService.logAudit(
        AuditAction.EXCEPTIONAL_BUDGET_APPROVED,
        `Finance Head approved exceptional budget expansion for request ${request.requestNumber}`,
        { comment, amount: request.amount },
        logActor
      );
    } else if (action === WorkflowActionType.REJECT) {
      request.status = RequestStatus.REJECTED;
      request.history.push({
        statusBefore: previousStatus,
        statusAfter: RequestStatus.REJECTED,
        actorId: actorId,
        actorName: actor.name,
        actorRole: actor.role,
        action: "Reject Exceptional Budget",
        comment,
        timestamp: new Date()
      });
      
      await request.save();
      await LoggerService.logAudit(
        AuditAction.EXCEPTIONAL_BUDGET_REJECTED,
        `Finance Head rejected budget expansion for request ${request.requestNumber}`,
        { comment },
        logActor
      );
    } else {
      // RETURN to initiator
      request.status = RequestStatus.RETURNED;
      request.history.push({
        statusBefore: previousStatus,
        statusAfter: RequestStatus.RETURNED,
        actorId: actorId,
        actorName: actor.name,
        actorRole: actor.role,
        action: "Return for Budget Adjustments",
        comment,
        timestamp: new Date()
      });
      
      await request.save();
      await LoggerService.logAudit(
        AuditAction.EXCEPTIONAL_BUDGET_RETURNED,
        `Finance Head returned request ${request.requestNumber} for budget correction`,
        { comment },
        logActor
      );
    }

    // Tell the initiator their request moved. Non-blocking by design.
    await RequestNotifier.notifyInitiator(request);

    return request;
  }

  /**
   * Processes a standard workflow step action (Approve, Reject, Return) by an approver
   */
  public static async processWorkflowAction(requestId: string, actor: IUser, action: WorkflowActionType, comment?: string) {
    await connectToDatabase();
    
    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== RequestStatus.PENDING_APPROVAL) {
      throw new Error("Request is not awaiting standard workflow approval.");
    }

    // Resolve current active step config
    const nextRouting = await WorkflowService.getNextStepForRequest(request);
    if (!nextRouting) {
      throw new Error("No pending workflow step found for this request.");
    }

    // Validate that the actor has the required role for the active step
    if (actor.role !== nextRouting.step.role) {
      throw new Error(`Unauthorized. This step requires the role: ${nextRouting.step.role}`);
    }

    const previousStatus = request.status;
    const actorId = getActorId(actor);
    const logActor = { id: actorId, name: actor.name, role: actor.role };

    if (action === WorkflowActionType.APPROVE) {
      // Look up next step in the sequence
      request.currentStepIndex = nextRouting.index + 1;
      const nextStep = await WorkflowService.getNextStepForRequest(request);
      
      if (nextStep) {
        // More approvals needed
        request.history.push({
          statusBefore: previousStatus,
          statusAfter: RequestStatus.PENDING_APPROVAL,
          actorId: actorId,
          actorName: actor.name,
          actorRole: actor.role,
          action: `Approve Step: ${nextRouting.step.stepName}`,
          comment,
          timestamp: new Date()
        });
        await request.save();
        
        await LoggerService.logAudit(
          AuditAction.EXPENSE_STEP_APPROVED,
          `Request ${request.requestNumber} approved by ${actor.name} at step '${nextRouting.step.stepName}'. Routed to '${nextStep.step.stepName}'`,
          undefined,
          logActor
        );
      } else {
        // Workflow completed -> Ready for Finance processing
        request.status = RequestStatus.SENT_TO_FINANCE;
        request.history.push({
          statusBefore: previousStatus,
          statusAfter: RequestStatus.SENT_TO_FINANCE,
          actorId: actorId,
          actorName: actor.name,
          actorRole: actor.role,
          action: "Final Workflow Approval Completed",
          comment,
          timestamp: new Date()
        });
        await request.save();
        
        await LoggerService.logAudit(
          AuditAction.EXPENSE_WORKFLOW_COMPLETED,
          `Request ${request.requestNumber} completed all workflow approvals. Sent to Finance.`,
          undefined,
          logActor
        );
      }
    } else if (action === WorkflowActionType.REJECT) {
      // Unlock budget and mark request as rejected
      await BudgetService.unlockBudget(request._id.toString());
      request.status = RequestStatus.REJECTED;
      
      request.history.push({
        statusBefore: previousStatus,
        statusAfter: RequestStatus.REJECTED,
        actorId: actorId,
        actorName: actor.name,
        actorRole: actor.role,
        action: "Reject Request",
        comment,
        timestamp: new Date()
      });
      await request.save();
      
      await LoggerService.logAudit(
        AuditAction.EXPENSE_REJECTED,
        `Request ${request.requestNumber} rejected by ${actor.name} during '${nextRouting.step.stepName}'`,
        { comment },
        logActor
      );
    } else {
      // RETURN to initiator for correction
      // Unlock budget while it is returned, to free up budget space.
      // It will be re-locked/validated upon resubmission.
      await BudgetService.unlockBudget(request._id.toString());
      request.status = RequestStatus.RETURNED;
      
      request.history.push({
        statusBefore: previousStatus,
        statusAfter: RequestStatus.RETURNED,
        actorId: actorId,
        actorName: actor.name,
        actorRole: actor.role,
        action: "Return to Initiator",
        comment,
        timestamp: new Date()
      });
      await request.save();
      
      await LoggerService.logAudit(
        AuditAction.EXPENSE_RETURNED,
        `Request ${request.requestNumber} returned to initiator by ${actor.name} for clarification`,
        { comment },
        logActor
      );
    }

    // Tell the initiator their request moved. Non-blocking by design.
    await RequestNotifier.notifyInitiator(request);

    return request;
  }

  /**
   * Finance Officer processes the payment and uploads the bank file instructions
   */
  public static async processFinanceUpload(requestId: string, actor: IUser) {
    await connectToDatabase();
    if (actor.role !== SystemRole.FINANCE_OFFICER) {
      throw new Error("Unauthorized. Only Finance Officers can verify and upload bank files.");
    }

    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== RequestStatus.SENT_TO_FINANCE) {
      throw new Error("Request is not awaiting finance audit.");
    }

    const actorId = getActorId(actor);
    const previousStatus = request.status;
    request.status = RequestStatus.UPLOADED_TO_BANK;
    
    request.history.push({
      statusBefore: previousStatus,
      statusAfter: RequestStatus.UPLOADED_TO_BANK,
      actorId: actorId,
      actorName: actor.name,
      actorRole: actor.role,
      action: "Confirm Documentation & Upload Instruction to Bank Platform",
      timestamp: new Date()
    });

    await request.save();
    
    const logActor = { id: actorId, name: actor.name, role: actor.role };
    await LoggerService.logAudit(
      AuditAction.EXPENSE_BANK_UPLOADED,
      `Finance Officer ${actor.name} uploaded payment file for request ${request.requestNumber} to the bank platform`,
      undefined,
      logActor
    );

    // Tell the initiator their request moved. Non-blocking by design.
    await RequestNotifier.notifyInitiator(request);

    return request;
  }

  /**
   * Finance Manager releases the payment (releases cash flow) on the independent bank system
   * This represents the "segregation of duties" control rule.
   */
  public static async processPaymentRelease(
    requestId: string,
    actor: IUser,
    reference: string,
    receiptFileName?: string
  ) {
    await connectToDatabase();
    if (actor.role !== SystemRole.FINANCE_MANAGER) {
      throw new Error("Unauthorized. Only Finance Managers/Payment Releasers can authorize cash release.");
    }

    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== RequestStatus.UPLOADED_TO_BANK) {
      throw new Error("Request has not been uploaded to the bank yet.");
    }

    const actorId = getActorId(actor);
    const previousStatus = request.status;
    
    // Save bank transaction records
    request.paymentReference = reference;
    request.paymentReceipt = receiptFileName || "bank_receipt.pdf";
    request.paymentDate = new Date();
    request.status = RequestStatus.PAID;
    
    request.history.push({
      statusBefore: previousStatus,
      statusAfter: RequestStatus.PAID,
      actorId: actorId,
      actorName: actor.name,
      actorRole: actor.role,
      action: "Authorize Payment Release",
      comment: `Reference: ${reference}`,
      timestamp: new Date()
    });

    await request.save();
    
    const logActor = { id: actorId, name: actor.name, role: actor.role };
    await LoggerService.logAudit(
      AuditAction.PAYMENT_RELEASED,
      `Payment released for request ${request.requestNumber}. Reference: ${reference}`,
      { reference, receipt: request.paymentReceipt },
      logActor
    );

    // Trigger budget period commit (reduces pending, increases utilised)
    await BudgetService.commitBudget(request._id.toString());
    
    // Final Auto-Closure
    request.status = RequestStatus.CLOSED;
    request.history.push({
      statusBefore: RequestStatus.PAID,
      statusAfter: RequestStatus.CLOSED,
      actorId: actorId as any,
      actorName: "System Engine",
      actorRole: SystemRole.ADMIN,
      action: "Final Closure & Audit Logs Solidified",
      timestamp: new Date()
    });
    
    await request.save();
    await LoggerService.logApp(
      AuditAction.EXPENSE_CLOSED,
      `Request ${request.requestNumber} transitioned to CLOSED. Ledger and audits locked.`
    );

    // Tell the initiator their request moved. Non-blocking by design.
    await RequestNotifier.notifyInitiator(request);

    return request;
  }
}
