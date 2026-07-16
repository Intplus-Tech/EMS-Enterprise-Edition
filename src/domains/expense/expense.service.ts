import { connectToDatabase } from "../../config/db";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { BudgetService } from "../budget/budget.service";
import { WorkflowService } from "../workflow/workflow.service";
import { LoggerService } from "../logs/logger.service";
import { RequestStatus } from "../../enums/statuses";
import { SystemRole } from "../../enums/roles";
import { IUser } from "../../types";

export class ExpenseService {
  /**
   * Helper to generate a unique request number, e.g. EXP-2026-0001
   */
  private static async generateRequestNumber(): Promise<string> {
    await connectToDatabase();
    const year = new Date().getFullYear();
    const count = await ExpenseRequest.countDocuments();
    const sequence = String(count + 1).padStart(4, '0');
    return `EXP-${year}-${sequence}`;
  }

  /**
   * Create a new draft expense request
   */
  public static async createRequest(actor: IUser, data: any) {
    await connectToDatabase();
    
    if (!data.supportingDocument) {
      throw new Error("Supporting documentation / invoice is mandatory.");
    }
    
    const requestNumber = await this.generateRequestNumber();
    
    const request = new ExpenseRequest({
      requestNumber,
      departmentId: actor.departmentId || data.departmentId,
      initiatorId: actor._id,
      category: data.category,
      description: data.description,
      amount: Number(data.amount),
      supportingDocument: data.supportingDocument,
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
    
    const logActor = { id: actor._id, name: actor.name, role: actor.role };
    await LoggerService.logAudit(
      "EXPENSE_CREATED",
      `Draft request ${requestNumber} created for $${request.amount.toFixed(2)}`,
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
    
    const logActor = { id: actor._id, name: actor.name, role: actor.role };
    
    // Add to history
    request.history.push({
      statusBefore: previousStatus,
      statusAfter: RequestStatus.SUBMITTED,
      actorId: actor._id!,
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
          actorId: actor._id!,
          actorName: "System Engine",
          actorRole: SystemRole.ADMIN,
          action: `Budget Validated. Routed to: ${nextRouting.step.stepName}`,
          timestamp: new Date()
        });
        
        await request.save();
        await LoggerService.logAudit(
          "EXPENSE_SUBMITTED_APPROVED_BUDGET",
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
        actorId: actor._id!,
        actorName: "System Engine",
        actorRole: SystemRole.ADMIN,
        action: `Budget Overrun. Flagged: ${budgetCheck.message}`,
        timestamp: new Date()
      });
      
      await request.save();
      
      await LoggerService.logAudit(
        "BUDGET_OVERRUN",
        `Request ${request.requestNumber} triggered a budget overrun alert. Flagged: PENDING_EXCEPTIONAL`,
        { budgetCheck },
        logActor
      );
    }

    return request;
  }

  /**
   * Processes exceptional budget approval from Finance Head
   */
  public static async processExceptionalBudget(requestId: string, actor: IUser, action: "APPROVE" | "REJECT" | "RETURN", comment?: string, adjustedAmount?: number) {
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
    const logActor = { id: actor._id, name: actor.name, role: actor.role };

    if (action === "APPROVE") {
      request.exceptionalBudgetApproved = true;
      request.exceptionalApprovedBy = actor._id;
      
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
        actorId: actor._id!,
        actorName: actor.name,
        actorRole: actor.role,
        action: "Approve One-Time Budget Expansion",
        comment,
        timestamp: new Date()
      });
      
      await request.save();
      await LoggerService.logAudit(
        "EXCEPTIONAL_BUDGET_APPROVED",
        `Finance Head approved exceptional budget expansion for request ${request.requestNumber}`,
        { comment, amount: request.amount },
        logActor
      );
    } else if (action === "REJECT") {
      request.status = RequestStatus.REJECTED;
      request.history.push({
        statusBefore: previousStatus,
        statusAfter: RequestStatus.REJECTED,
        actorId: actor._id!,
        actorName: actor.name,
        actorRole: actor.role,
        action: "Reject Exceptional Budget",
        comment,
        timestamp: new Date()
      });
      
      await request.save();
      await LoggerService.logAudit(
        "EXCEPTIONAL_BUDGET_REJECTED",
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
        actorId: actor._id!,
        actorName: actor.name,
        actorRole: actor.role,
        action: "Return for Budget Adjustments",
        comment,
        timestamp: new Date()
      });
      
      await request.save();
      await LoggerService.logAudit(
        "EXCEPTIONAL_BUDGET_RETURNED",
        `Finance Head returned request ${request.requestNumber} for budget correction`,
        { comment },
        logActor
      );
    }

    return request;
  }

  /**
   * Processes a standard workflow step action (Approve, Reject, Return) by an approver
   */
  public static async processWorkflowAction(requestId: string, actor: IUser, action: "APPROVE" | "REJECT" | "RETURN", comment?: string) {
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
    const logActor = { id: actor._id, name: actor.name, role: actor.role };

    if (action === "APPROVE") {
      // Look up next step in the sequence
      request.currentStepIndex = nextRouting.index + 1;
      const nextStep = await WorkflowService.getNextStepForRequest(request);
      
      if (nextStep) {
        // More approvals needed
        request.history.push({
          statusBefore: previousStatus,
          statusAfter: RequestStatus.PENDING_APPROVAL,
          actorId: actor._id!,
          actorName: actor.name,
          actorRole: actor.role,
          action: `Approve Step: ${nextRouting.step.stepName}`,
          comment,
          timestamp: new Date()
        });
        await request.save();
        
        await LoggerService.logAudit(
          "EXPENSE_STEP_APPROVED",
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
          actorId: actor._id!,
          actorName: actor.name,
          actorRole: actor.role,
          action: "Final Workflow Approval Completed",
          comment,
          timestamp: new Date()
        });
        await request.save();
        
        await LoggerService.logAudit(
          "EXPENSE_WORKFLOW_COMPLETED",
          `Request ${request.requestNumber} completed all workflow approvals. Sent to Finance.`,
          undefined,
          logActor
        );
      }
    } else if (action === "REJECT") {
      // Unlock budget and mark request as rejected
      await BudgetService.unlockBudget(request._id.toString());
      request.status = RequestStatus.REJECTED;
      
      request.history.push({
        statusBefore: previousStatus,
        statusAfter: RequestStatus.REJECTED,
        actorId: actor._id!,
        actorName: actor.name,
        actorRole: actor.role,
        action: "Reject Request",
        comment,
        timestamp: new Date()
      });
      await request.save();
      
      await LoggerService.logAudit(
        "EXPENSE_REJECTED",
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
        actorId: actor._id!,
        actorName: actor.name,
        actorRole: actor.role,
        action: "Return to Initiator",
        comment,
        timestamp: new Date()
      });
      await request.save();
      
      await LoggerService.logAudit(
        "EXPENSE_RETURNED",
        `Request ${request.requestNumber} returned to initiator by ${actor.name} for clarification`,
        { comment },
        logActor
      );
    }

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

    const previousStatus = request.status;
    request.status = RequestStatus.UPLOADED_TO_BANK;
    
    request.history.push({
      statusBefore: previousStatus,
      statusAfter: RequestStatus.UPLOADED_TO_BANK,
      actorId: actor._id!,
      actorName: actor.name,
      actorRole: actor.role,
      action: "Confirm Documentation & Upload Instruction to Bank Platform",
      timestamp: new Date()
    });

    await request.save();
    
    const logActor = { id: actor._id, name: actor.name, role: actor.role };
    await LoggerService.logAudit(
      "EXPENSE_BANK_UPLOADED",
      `Finance Officer ${actor.name} uploaded payment file for request ${request.requestNumber} to the bank platform`,
      undefined,
      logActor
    );

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

    const previousStatus = request.status;
    
    // Save bank transaction records
    request.paymentReference = reference;
    request.paymentReceipt = receiptFileName || "bank_receipt.pdf";
    request.paymentDate = new Date();
    request.status = RequestStatus.PAID;
    
    request.history.push({
      statusBefore: previousStatus,
      statusAfter: RequestStatus.PAID,
      actorId: actor._id!,
      actorName: actor.name,
      actorRole: actor.role,
      action: "Authorize Payment Release",
      comment: `Reference: ${reference}`,
      timestamp: new Date()
    });

    await request.save();
    
    const logActor = { id: actor._id, name: actor.name, role: actor.role };
    await LoggerService.logAudit(
      "PAYMENT_RELEASED",
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
      actorId: actor._id!,
      actorName: "System Engine",
      actorRole: SystemRole.ADMIN,
      action: "Final Closure & Audit Logs Solidified",
      timestamp: new Date()
    });
    
    await request.save();
    await LoggerService.logApp(
      "EXPENSE_CLOSED",
      `Request ${request.requestNumber} transitioned to CLOSED. Ledger and audits locked.`
    );

    return request;
  }
}
