import { connectToDatabase } from "../../config/db";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { User } from "../../models/User";
import { Department } from "../../models/Department";
import { BudgetService } from "../budget/budget.service";
import { WorkflowService } from "../workflow/workflow.service";
import { ILogActor, LoggerService } from "../logs/logger.service";
import { RequestNotifier } from "../notifications/request-notifier";
import { BANK_STAGE_STATUSES, OVER_BUDGET_STATUSES, RequestStatus } from "../../enums/statuses";
import { SystemRole } from "../../enums/roles";
import { AuditAction } from "../../enums/auditActions";
import { WorkflowActionType } from "../../enums/workflowActions";
import { DEFAULT_EXPENSE_CATEGORY } from "../../enums/expenseCategories";
import { SYSTEM_ACTOR_NAME } from "../identity/reference";
import { IAttachment, IUser } from "../../types";
import { formatNaira } from "../../components/ui/format";

/**
 * The authenticated caller as the API routes hand it over: a User document or
 * the session state from `authenticate()`, which also carries the client IP.
 */
type WorkflowActor = IUser & { id?: string; ipAddress?: string };

// Structural: the session state from `authenticate()` carries `id` while a User
// document carries `_id`, and both reach this service.
const getActorId = (actor?: { _id?: unknown; id?: string } | null): string => {
  const raw = actor?._id ?? actor?.id;
  return raw ? String(raw) : "";
};

/** Naira amounts in log lines, through the same helper the UI renders with. */
const money = formatNaira;

/**
 * The part of a request document the workflow helpers touch — enough to push
 * history and persist, without pulling in Mongoose's full document generics.
 */
type WorkflowRequestDoc = {
  requestNumber: string;
  status: RequestStatus;
  history: {
    push(entry: {
      statusBefore: RequestStatus;
      statusAfter: RequestStatus;
      actorId: string;
      actorName: string;
      actorRole: SystemRole;
      action: string;
      comment?: string;
      timestamp: Date;
    }): unknown;
  };
  save(): Promise<unknown>;
};

/**
 * What the budget-gate helpers below read and write on a request: the workflow
 * fields plus the budget state. Structural rather than the Mongoose document
 * type, so the helpers stay callable from both this service and a test double.
 */
type BudgetGateRequestDoc = WorkflowRequestDoc & {
  _id: { toString(): string };
  departmentId: { toString(): string };
  initiatorId: unknown;
  amount: number;
  requiredPaymentDate: Date;
  awaitingBudgetPeriod?: boolean;
  budgetShortfall?: number;
  currentStepIndex?: number;
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
  public static async createRequest(actor: WorkflowActor, data: any) {
    await connectToDatabase();
    
    const supportingDocuments = normaliseAttachments(data, actor);
    if (supportingDocuments.length === 0) {
      throw new Error("Supporting documentation / invoice is mandatory.");
    }
    
    const actorId = getActorId(actor);
    if (!actorId) {
      throw new Error("Initiator ID is required.");
    }

    // The department is re-derived from the initiator, never taken from the
    // payload — it decides which budget the request draws down. The DB lookup
    // covers a session issued before the department was assigned. There is no
    // fallback department: previously an initiator with none was booked against
    // whichever department happened to be first in the collection.
    let departmentId = actor.departmentId;

    if (!departmentId) {
      const dbUser = await User.findById(actorId);
      departmentId = dbUser?.departmentId;
    }

    if (!departmentId) {
      throw new Error(
        "Your account is not assigned to a department. Ask an administrator to assign one before raising a request."
      );
    }

    // An archived department accepts no new spending — this is what the Delete
    // Department modal promises, and without the check archiving would be
    // cosmetic for anyone still assigned to it.
    const department = await Department.findById(departmentId).select("name isActive").lean();
    if (department && department.isActive === false) {
      throw new Error(
        `Invalid request: the '${department.name}' department has been archived and cannot accept new requests. Ask an administrator to restore it or reassign your account.`
      );
    }

    const requestNumber = await this.generateRequestNumber();
    
    const request = new ExpenseRequest({
      requestNumber,
      departmentId,
      initiatorId: actorId,
      // The initiator does not choose a category; the model requires one and
      // reporting groups on it, so an unclassified request lands in the default
      // bucket rather than an empty string.
      category: data.category || DEFAULT_EXPENSE_CATEGORY,
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
    
    // `ipAddress` rides along on the authenticated actor so audit rows carry
    // the real client address; the viewer no longer substitutes a fake one.
    const logActor = { id: actorId, name: actor.name, role: actor.role, ipAddress: actor.ipAddress };
    await LoggerService.logAudit(
      AuditAction.EXPENSE_CREATED,
      `Draft request ${requestNumber} created for ${money(request.amount)}`,
      { requestId: request._id },
      logActor
    );
    
    return request;
  }

  /**
   * Submits a request and triggers the automatic budget validation
   */
  public static async submitRequest(requestId: string, actor: WorkflowActor) {
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
    // `ipAddress` rides along on the authenticated actor so audit rows carry
    // the real client address; the viewer no longer substitutes a fake one.
    const logActor = { id: actorId, name: actor.name, role: actor.role, ipAddress: actor.ipAddress };
    
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

    // The shortfall is recorded but does not divert the request: an overrun is
    // visible from the moment it is submitted, while the decision to fund it
    // waits until the Approver and Finance Officer have passed it. Nobody is
    // asked to authorise an exception for a request the business may still
    // reject on its merits.
    request.budgetShortfall = budgetCheck.isValid ? 0 : Math.max(0, budgetCheck.variance ?? 0);

    // No period at all is not an overrun — there is nothing to reserve against
    // and nothing for an approver to rule on, so the request is held here and
    // released automatically once an administrator creates the period.
    if (budgetCheck.reason === "NO_PERIOD") {
      return this.holdForBudgetPeriod(request, actorId, logActor);
    }

    if (!budgetCheck.isValid) {
      // Flagged, not rerouted. The status still passes through
      // INSUFFICIENT_BUDGET so the overrun is on the record and the
      // budget-overrun audit, over-budget badges and exception reporting all
      // have the event they key off.
      request.status = RequestStatus.INSUFFICIENT_BUDGET;
      request.history.push({
        statusBefore: RequestStatus.BUDGET_CHECK,
        statusAfter: RequestStatus.INSUFFICIENT_BUDGET,
        actorId: actorId,
        actorName: SYSTEM_ACTOR_NAME,
        actorRole: SystemRole.ADMIN,
        action: `Budget Overrun. Flagged: ${budgetCheck.message}`,
        timestamp: new Date()
      });
      await request.save();

      await LoggerService.logAudit(
        AuditAction.BUDGET_OVERRUN,
        `Request ${request.requestNumber} triggered a budget overrun alert. Flagged for exceptional approval after the approval chain.`,
        { budgetCheck },
        logActor
      );
    }

    return this.reserveAndRoute(request, budgetCheck, actorId, logActor);
  }

  /**
   * Parks a request whose department has no budget period covering its payment
   * date, instead of failing the submission outright.
   *
   * The amount is deliberately not reserved: there is no period to reserve it
   * in. `awaitingBudgetPeriod` is what `releaseRequestsAwaitingBudget` looks
   * for, and it is the only thing separating this state from an ordinary
   * overrun parked at the same status.
   */
  private static async holdForBudgetPeriod(
    request: BudgetGateRequestDoc,
    actorId: string,
    logActor: ILogActor
  ) {
    const department = await Department.findById(request.departmentId).select("name").lean();
    const departmentName = department?.name ?? "the department";
    const paymentDate = new Date(request.requiredPaymentDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const statusBefore = request.status;
    request.status = RequestStatus.INSUFFICIENT_BUDGET;
    request.awaitingBudgetPeriod = true;
    request.history.push({
      statusBefore,
      statusAfter: RequestStatus.INSUFFICIENT_BUDGET,
      actorId,
      actorName: SYSTEM_ACTOR_NAME,
      actorRole: SystemRole.ADMIN,
      action: "Held — awaiting budget period",
      comment:
        `${departmentName} has no budget period covering ${paymentDate}. ` +
        `The request will continue automatically once an administrator sets one.`,
      timestamp: new Date(),
    });
    await request.save();

    await LoggerService.logAudit(
      AuditAction.BUDGET_PERIOD_MISSING,
      `Request ${request.requestNumber} is held: ${departmentName} has no budget period covering ${paymentDate}.`,
      { requestId: request._id.toString(), departmentId: request.departmentId?.toString() },
      logActor
    );

    await RequestNotifier.notifyInitiator(request);

    return request;
  }

  /**
   * Reserves the amount and routes the request into the approval chain.
   *
   * Shared by submission and by the release that follows a late budget period,
   * so a released request reserves, routes, logs and notifies exactly as one
   * submitted against a funded department does.
   */
  private static async reserveAndRoute(
    request: BudgetGateRequestDoc,
    budgetCheck: { isValid: boolean },
    actorId: string,
    logActor: ILogActor,
    /** Appended to the routing history entry when a late period unblocked it. */
    releaseNote?: string
  ) {
    // Reserve the amount either way. An over-budget request still commits the
    // department to the spend while it is in flight — leaving it unreserved
    // would let a second request be measured against funds this one is already
    // claiming, and understate the deficit the Finance Head is later shown.
    await BudgetService.lockBudget(request._id.toString());

    const nextRouting = await WorkflowService.getNextStepForRequest(request);
    if (nextRouting) {
      const statusBefore = request.status;
      request.status = RequestStatus.PENDING_APPROVAL;
      request.currentStepIndex = nextRouting.index;

      const routed = budgetCheck.isValid
        ? `Budget Validated. Routed to: ${nextRouting.step.stepName}`
        : `Routed to ${nextRouting.step.stepName} carrying a budget overrun`;

      request.history.push({
        statusBefore,
        statusAfter: RequestStatus.PENDING_APPROVAL,
        actorId: actorId,
        actorName: SYSTEM_ACTOR_NAME,
        actorRole: SystemRole.ADMIN,
        action: releaseNote ? `${releaseNote} ${routed}` : routed,
        timestamp: new Date()
      });

      await request.save();

      if (budgetCheck.isValid) {
        await LoggerService.logAudit(
          AuditAction.EXPENSE_SUBMITTED_APPROVED_BUDGET,
          `Request ${request.requestNumber} passed budget check and routed to ${nextRouting.step.stepName}`,
          undefined,
          logActor
        );

        // Budget approved and allocation deducted — the flow notifies the
        // requestor (below, with every other transition) *and* finance.
        await RequestNotifier.notifyFinanceOfAllocation(request);
      }
    } else {
      // No steps configured -> Auto approve to finance
      request.status = RequestStatus.APPROVED;
      await request.save();
    }

    // Tell the initiator their request moved. Non-blocking by design.
    await RequestNotifier.notifyInitiator(request);

    return request;
  }

  /**
   * Releases the requests a newly-created budget period unblocks.
   *
   * Called after an administrator sets a department's budget: every request
   * held by `holdForBudgetPeriod` whose required payment date falls inside the
   * new window is re-checked, reserved and routed, exactly as if it had been
   * submitted against a funded department. Without this the held requests sat
   * at INSUFFICIENT_BUDGET permanently — `submitRequest` accepts only DRAFT and
   * RETURNED, so nobody, initiator or admin, could move them on.
   *
   * A request that is still over budget after the allocation is released all
   * the same, carrying its overrun to the approval chain: that is the normal
   * path for an overrun and the Finance Head decides it at the end.
   */
  public static async releaseRequestsAwaitingBudget(
    period: { departmentId: unknown; startDate: Date; endDate: Date; periodName: string },
    // The administrator who set the budget, as the route holds them — only the
    // audit fields are needed, so the full user document is not required.
    actor: { id?: string; _id?: unknown; name?: string; role?: SystemRole; ipAddress?: string }
  ): Promise<{ released: number; requestNumbers: string[]; failed: string[] }> {
    await connectToDatabase();

    const held = await ExpenseRequest.find({
      departmentId: period.departmentId,
      awaitingBudgetPeriod: true,
      requiredPaymentDate: { $gte: period.startDate, $lte: period.endDate },
    });

    const actorId = getActorId(actor);
    const logActor = { id: actorId, name: actor.name, role: actor.role, ipAddress: actor.ipAddress };
    const requestNumbers: string[] = [];
    const failed: string[] = [];

    for (const request of held) {
      // Each release is independent: one request that cannot be routed must not
      // strand the rest, and the budget save itself has already succeeded.
      try {
        const budgetCheck = await BudgetService.validateRequestBudget(
          request.departmentId.toString(),
          request.amount,
          request.requiredPaymentDate
        );

        // The period exists now, so this can only be a genuine shortfall.
        request.budgetShortfall = budgetCheck.isValid ? 0 : Math.max(0, budgetCheck.variance ?? 0);

        // Cleared in memory only: `reserveAndRoute` persists it as part of the
        // save that routes the request, so a failure before that point leaves
        // the flag set in the database and the request eligible for a retry
        // rather than silently unheld and unrouted.
        request.awaitingBudgetPeriod = false;

        await this.reserveAndRoute(
          request,
          budgetCheck,
          actorId,
          logActor,
          `Released by budget period '${period.periodName}'.`
        );

        requestNumbers.push(request.requestNumber);
      } catch (error) {
        failed.push(request.requestNumber);
        await LoggerService.logException(
          AuditAction.BUDGET_PERIOD_MISSING,
          `Request ${request.requestNumber} could not be released against period '${period.periodName}'.`,
          error,
          logActor
        );
      }
    }

    if (requestNumbers.length > 0) {
      await LoggerService.logAudit(
        AuditAction.BUDGET_PERIOD_CREATED,
        `Period '${period.periodName}' released ${requestNumbers.length} held request(s): ${requestNumbers.join(", ")}.`,
        { periodName: period.periodName, requestNumbers },
        logActor
      );
    }

    return { released: requestNumbers.length, requestNumbers, failed };
  }

  /**
   * Processes exceptional budget approval from Finance Head
   */
  public static async processExceptionalBudget(requestId: string, actor: WorkflowActor, action: WorkflowActionType, comment?: string, adjustedAmount?: number) {
    await connectToDatabase();
    if (actor.role !== SystemRole.FINANCE_HEAD) {
      throw new Error("Only the Finance Head can perform exceptional budget actions.");
    }

    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    // Both states mean "over budget, waiting on the Finance Head" — the queue
    // lists them together. Accepting only PENDING_EXCEPTIONAL stranded records
    // parked at INSUFFICIENT_BUDGET: they were reviewable but never decidable.
    if (!OVER_BUDGET_STATUSES.includes(request.status)) {
      throw new Error("Request is not awaiting exceptional budget approval.");
    }
    // Held, not over budget: there is no period to expand and no item to expand
    // it on, so an approval here would fail deep inside `grantOneTimeExpansion`
    // with a message about attachments rather than the real blocker.
    if (request.awaitingBudgetPeriod) {
      throw new Error(
        `Invalid request: ${request.requestNumber} is held because its department has no budget period covering the required payment date. An administrator must set one; the request then rejoins the approval chain on its own.`
      );
    }

    const previousStatus = request.status;
    const actorId = getActorId(actor);
    // `ipAddress` rides along on the authenticated actor so audit rows carry
    // the real client address; the viewer no longer substitutes a fake one.
    const logActor = { id: actorId, name: actor.name, role: actor.role, ipAddress: actor.ipAddress };

    if (action === WorkflowActionType.APPROVE) {
      request.exceptionalBudgetApproved = true;
      request.exceptionalApprovedBy = actorId as any;
      request.exceptionalApprovedAt = new Date();

      if (adjustedAmount && adjustedAmount > 0) {
        request.originalAmount = request.amount;
        request.amount = adjustedAmount;
      }

      // The deficit still outstanding on the item this request is booked
      // against, measured the same way the routing decision measured it.
      const shortfall = await BudgetService.getItemShortfallForRequest(request._id.toString());
      request.exceptionalBudgetAmount = shortfall;

      // "One-time budget increase granted... Allocation adjusted." Raising the
      // item's ceiling by exactly the deficit is what brings the reservation
      // back inside budget: without it the grant was recorded only on the
      // request, and the department read as permanently over-committed.
      if (shortfall > 0) {
        await BudgetService.grantOneTimeExpansion(
          request._id.toString(),
          shortfall,
          logActor,
          comment
        );
      }

      // The exception is raised only after every approver has signed off, so a
      // granted expansion sends the request onward to Finance for payment
      // rather than back through an approval chain it has already cleared.
      request.budgetShortfall = 0;
      request.status = RequestStatus.SENT_TO_FINANCE;

      request.history.push({
        statusBefore: previousStatus,
        statusAfter: RequestStatus.SENT_TO_FINANCE,
        actorId: actorId,
        actorName: actor.name,
        actorRole: actor.role,
        action: "Approve One-Time Budget Item Expansion",
        comment,
        timestamp: new Date()
      });

      await request.save();
      await LoggerService.logAudit(
        AuditAction.EXCEPTIONAL_BUDGET_APPROVED,
        `Finance Head granted a ${money(shortfall)} expansion on '${request.budgetItemName ?? "the budget item"}' for request ${request.requestNumber}. Sent to Finance.`,
        { comment, amount: request.amount, shortfall },
        logActor
      );

      // The officer approved before this reached the Finance Head, so funding
      // the deficit resumes the bank leg rather than sending it back for a
      // review that has already happened.
      await this.advanceToBankStage(request, actor, logActor);
    } else if (action === WorkflowActionType.REJECT) {
      // Give the reservation back. The amount was locked at submission, so a
      // refused request that kept it would hold its budget item short by the
      // full amount for the rest of the period — the request is dead, but the
      // money would stay committed to it.
      await BudgetService.unlockBudget(request._id.toString());
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
      // RETURN to initiator. Same reasoning as the rejection above: the
      // reservation is released while the request sits with the initiator and
      // is re-taken when they resubmit.
      await BudgetService.unlockBudget(request._id.toString());
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
   * Moves an approved request through the bank leg into the Finance Manager's
   * queue: instruction uploaded, cash not yet released.
   *
   * The Finance Officer's approval *is* this step — their review confirms the
   * payee and documents, and approving uploads the instruction. Both source
   * flows agree: the officer's stage spans SENT_TO_FINANCE → UPLOADED, and an
   * approved request "is sent to the Finance Manager". Keeping it as one action
   * is what stops the officer having to approve and then separately upload.
   */
  private static async advanceToBankStage(
    request: WorkflowRequestDoc,
    actor: WorkflowActor,
    logActor: ILogActor
  ) {
    const actorId = getActorId(actor);
    // The officer is the one who confirms payee and documents. When the Finance
    // Head's expansion is what unblocked the request, the upload is the system
    // resuming a leg the officer already approved — attributing it to the Head
    // would put them on the record as having done the officer's check.
    const isOfficer = actor.role === SystemRole.FINANCE_OFFICER;

    request.status = RequestStatus.UPLOADED_TO_BANK;
    request.history.push({
      statusBefore: RequestStatus.SENT_TO_FINANCE,
      statusAfter: RequestStatus.UPLOADED_TO_BANK,
      actorId,
      actorName: isOfficer ? actor.name : SYSTEM_ACTOR_NAME,
      actorRole: isOfficer ? actor.role : SystemRole.ADMIN,
      action: isOfficer
        ? "Confirm Documentation & Upload Instruction to Bank Platform"
        : "Budget expansion granted — instruction released to the bank platform",
      timestamp: new Date(),
    });
    await request.save();

    await LoggerService.logAudit(
      AuditAction.EXPENSE_BANK_UPLOADED,
      `Payment file for request ${request.requestNumber} uploaded to the bank platform`,
      undefined,
      logActor
    );

    // Segregation of duties: whoever prepared the instruction does not release
    // the cash, so the request moves into the Finance Manager's queue.
    request.status = RequestStatus.AWAITING_RELEASE;
    request.history.push({
      statusBefore: RequestStatus.UPLOADED_TO_BANK,
      statusAfter: RequestStatus.AWAITING_RELEASE,
      actorId,
      actorName: SYSTEM_ACTOR_NAME,
      actorRole: SystemRole.ADMIN,
      action: "Awaiting Finance Manager release on the bank platform",
      timestamp: new Date(),
    });
    await request.save();
  }

  /**
   * Processes a standard workflow step action (Approve, Reject, Return) by an approver
   */
  public static async processWorkflowAction(
    requestId: string,
    actor: WorkflowActor,
    action: WorkflowActionType,
    comment?: string,
    budgetItemId?: string
  ) {
    await connectToDatabase();

    let request = await ExpenseRequest.findById(requestId);
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
    // `ipAddress` rides along on the authenticated actor so audit rows carry
    // the real client address; the viewer no longer substitutes a fake one.
    const logActor = { id: actorId, name: actor.name, role: actor.role, ipAddress: actor.ipAddress };

    // The approver books the request against a budget item as part of approving
    // it. Done before the transition so a rejected attachment (wrong department,
    // unknown item) fails the whole decision rather than advancing a request
    // that nothing draws down.
    if (action === WorkflowActionType.APPROVE && actor.role === SystemRole.APPROVER) {
      if (budgetItemId) {
        await BudgetService.attachRequestToItem(requestId, budgetItemId, logActor);
        request = await ExpenseRequest.findById(requestId);
      }

      if (!request.budgetItemId) {
        throw new Error(
          "Select the budget item this request draws on before approving it. Every request must be attached to a budget item."
        );
      }
    }

    if (action === WorkflowActionType.APPROVE) {
      // Look up next step in the sequence
      request.currentStepIndex = nextRouting.index + 1;
      const nextStep = await WorkflowService.getNextStepForRequest(request);

      // Re-measured against the item the approver attached rather than the
      // department total the submit-time check saw — an item can be exhausted
      // while the department still has room, and vice versa.
      const itemShortfall = nextStep ? 0 : await BudgetService.getItemShortfallForRequest(requestId);
      request.budgetShortfall = itemShortfall;

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
      } else if (itemShortfall > 0 && !request.exceptionalBudgetApproved) {
        // Approvals are done but the request overruns its budget item, so the
        // last approver's sign-off sends it to the Finance Head rather than on
        // to payment. This is the one point in the flow where an exception is
        // raised: by now the business has agreed the spend is warranted, and
        // the only remaining question is whether to fund the deficit.
        request.status = RequestStatus.PENDING_EXCEPTIONAL;
        request.history.push({
          statusBefore: previousStatus,
          statusAfter: RequestStatus.PENDING_EXCEPTIONAL,
          actorId: actorId,
          actorName: actor.name,
          actorRole: actor.role,
          action: `Approved — routed to Finance Head for budget item expansion`,
          comment,
          timestamp: new Date()
        });
        await request.save();

        await LoggerService.logAudit(
          AuditAction.EXPENSE_STEP_APPROVED,
          `Request ${request.requestNumber} cleared approvals with a ${money(request.budgetShortfall)} overrun on '${request.budgetItemName ?? "its budget item"}'. Sent to the Finance Head for expansion.`,
          undefined,
          logActor
        );
      } else {
        // Workflow completed and funded -> on to Finance for payment
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

        // The Finance Officer's approval carries the request across the bank
        // leg and into the Manager's queue. Any other role finishing the chain
        // leaves it at SENT_TO_FINANCE for an officer to pick up.
        if (actor.role === SystemRole.FINANCE_OFFICER) {
          await this.advanceToBankStage(request, actor, logActor);
        }
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
  public static async processFinanceUpload(requestId: string, actor: WorkflowActor) {
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

    // `ipAddress` rides along on the authenticated actor so audit rows carry
    // the real client address; the viewer no longer substitutes a fake one.
    const logActor = { id: actorId, name: actor.name, role: actor.role, ipAddress: actor.ipAddress };
    await LoggerService.logAudit(
      AuditAction.EXPENSE_BANK_UPLOADED,
      `Finance Officer ${actor.name} uploaded payment file for request ${request.requestNumber} to the bank platform`,
      undefined,
      logActor
    );

    // The upload hands the request to the Finance Manager, so it moves on into
    // that queue rather than resting on the officer's own action. Segregation of
    // duties is the point of the stage: the officer prepares the instruction,
    // a different role releases the cash.
    request.status = RequestStatus.AWAITING_RELEASE;
    request.history.push({
      statusBefore: RequestStatus.UPLOADED_TO_BANK,
      statusAfter: RequestStatus.AWAITING_RELEASE,
      actorId: actorId,
      actorName: SYSTEM_ACTOR_NAME,
      actorRole: SystemRole.ADMIN,
      action: "Awaiting Finance Manager release on the bank platform",
      timestamp: new Date()
    });
    await request.save();

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
    actor: WorkflowActor,
    reference: string,
    /** Stored document reference for the transfer evidence. Required — see below. */
    receiptFileName: string
  ) {
    await connectToDatabase();
    if (actor.role !== SystemRole.FINANCE_MANAGER) {
      throw new Error("Unauthorized. Only Finance Managers/Payment Releasers can authorize cash release.");
    }

    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    // AWAITING_RELEASE is where the upload now leaves a request; UPLOADED_TO_BANK
    // is still accepted so records written before that transition existed — the
    // seeded ones included — remain releasable rather than stranded.
    if (!BANK_STAGE_STATUSES.includes(request.status)) {
      throw new Error("Request has not been uploaded to the bank yet.");
    }

    // The receipt is the evidence the release rests on. It used to fall back to
    // a hardcoded "bank_receipt.pdf" that pointed at no stored document, so a
    // release with no evidence was indistinguishable from one with it.
    if (!receiptFileName?.trim()) {
      throw new Error("Attach the payment receipt or evidence of transfer before releasing the payment.");
    }

    const actorId = getActorId(actor);
    const previousStatus = request.status;

    // Save bank transaction records
    request.paymentReference = reference;
    request.paymentReceipt = receiptFileName.trim();
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
    
    // `ipAddress` rides along on the authenticated actor so audit rows carry
    // the real client address; the viewer no longer substitutes a fake one.
    const logActor = { id: actorId, name: actor.name, role: actor.role, ipAddress: actor.ipAddress };
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
      actorName: SYSTEM_ACTOR_NAME,
      actorRole: SystemRole.ADMIN,
      action: "Final Closure & Audit Logs Solidified",
      timestamp: new Date()
    });
    
    await request.save();
    // `logAudit`, not `logApp`: closure is the terminal event of a payment and
    // belongs in the audit trail with the rest of the chain. As an APP entry it
    // carried no actor, no details and no IP, so the one row proving a request
    // was closed out matched neither the Audit Trail's user filter nor its
    // reference-by-details filter.
    await LoggerService.logAudit(
      AuditAction.EXPENSE_CLOSED,
      `Request ${request.requestNumber} transitioned to CLOSED. Ledger and audits locked.`,
      { requestId: request._id.toString(), requestNumber: request.requestNumber, reference },
      logActor
    );

    // Tell the initiator their request moved, then everyone who handled it that
    // it is done. Reviewers see only their own queue, so this completion notice
    // is the one thing that ever reports the outcome back to them.
    await RequestNotifier.notifyInitiator(request);
    await RequestNotifier.notifyParticipants(request);

    return request;
  }
}
