import { connectToDatabase } from "../../config/db";
import { BudgetPeriod } from "../../models/BudgetPeriod";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { Department } from "../../models/Department";
import { LoggerService, ILogActor } from "../logs/logger.service";
import { AuditAction } from "../../enums/auditActions";
import { RequestStatus } from "../../enums/statuses";
import { IBudgetLineItem } from "../../types/domain";
import {
  BudgetContextDto,
  BudgetItemOptionDto,
  BudgetLineContextDto,
  BudgetPeriodDto,
  BudgetTrendPointDto,
  DepartmentSpendDto,
} from "../../types/api";
import { formatNaira } from "../../components/ui/format";

/**
 * Statuses whose amount is already counted inside `pendingBudget`.
 *
 * The reservation is taken at submission — including for an over-budget request,
 * which still commits the department while it is in flight — and released only
 * on rejection, return or payment. INSUFFICIENT_BUDGET and PENDING_EXCEPTIONAL
 * therefore belong here: omitting them made a request awaiting the Finance Head
 * look unreserved, so the deficit was measured as if its own amount were still
 * available and came out at more than double the true gap.
 */
export const LOCKED_STATUSES: RequestStatus[] = [
  RequestStatus.INSUFFICIENT_BUDGET,
  RequestStatus.PENDING_EXCEPTIONAL,
  RequestStatus.PENDING_APPROVAL,
  RequestStatus.APPROVED,
  RequestStatus.SENT_TO_FINANCE,
  RequestStatus.UPLOADED_TO_BANK,
  RequestStatus.AWAITING_RELEASE,
];

/**
 * Amounts in log lines and validation messages go through the same helper the
 * screens use, so a message quoting a figure and the table showing it can never
 * disagree on symbol or grouping. `format.ts` is pure — no React, no I/O — so
 * server code may depend on it.
 */
const money = formatNaira;

/**
 * Outcome of the submission-time budget gate.
 *
 * Typed explicitly so `reason` is readable on every branch — the success case
 * carries none, and callers switch on it rather than parsing `message`.
 */
export interface BudgetCheckResult {
  isValid: boolean;
  /** How the check failed. Absent when it passed. */
  reason?: "NO_PERIOD" | "INSUFFICIENT";
  remaining: number;
  periodName?: string;
  /** The shortfall, on an INSUFFICIENT result. */
  variance?: number;
  message?: string;
}

/** Minimal shape the ceiling helpers need, so they work on lean docs too. */
type ItemLike = {
  amount?: number;
  utilisedAmount?: number;
  pendingAmount?: number;
  expansions?: { amount?: number }[];
};

type PeriodLike = {
  totalBudget?: number;
  utilisedBudget?: number;
  pendingBudget?: number;
  lineItems?: ItemLike[];
};

/** One granted expansion, as stored on a budget item. */
type BudgetExpansionLike = {
  requestId?: unknown;
  amount: number;
  approvedById?: unknown;
  approvedByName?: string;
  reason?: string;
  approvedAt?: Date;
};

/**
 * A budget item as the Set Budget screen sends it: the administrator's fields
 * plus the item's own id, which is what lets an edit keep its ledger.
 */
type IncomingBudgetItem = IBudgetLineItem & { id?: string };

/** A budget item once loaded off a period document, with its ledger writable. */
type BudgetItemDoc = {
  _id: unknown;
  name: string;
  description?: string;
  amount: number;
  utilisedAmount: number;
  pendingAmount: number;
  expansions: BudgetExpansionLike[];
};

/** Total of the one-time expansions granted against a single budget item. */
export function itemExpansionTotal(item: ItemLike): number {
  return (item.expansions ?? []).reduce((sum, e) => sum + (e.amount || 0), 0);
}

/** A budget item's own ceiling: what was allocated plus what was granted. */
export function itemCeiling(item: ItemLike): number {
  return (item.amount || 0) + itemExpansionTotal(item);
}

/** Headroom left on a single budget item. */
export function itemAvailable(item: ItemLike): number {
  return itemCeiling(item) - (item.utilisedAmount || 0) - (item.pendingAmount || 0);
}

/**
 * Every expansion granted anywhere inside the period.
 *
 * A department is only ever over budget because one of its items is, so grants
 * are recorded on the item and the department's ceiling is the roll-up. Summing
 * here keeps the department-level figures correct without storing the same
 * number twice and risking the two drifting apart.
 */
export function expansionTotal(period: PeriodLike): number {
  return (period.lineItems ?? []).reduce((sum, item) => sum + itemExpansionTotal(item), 0);
}

/**
 * The ceiling a period can actually spend to.
 *
 * An exceptional approval raises the ceiling rather than rewriting the
 * administrator's allocation, so every availability calculation has to read
 * this instead of `totalBudget`. Reading the raw field made a granted expansion
 * invisible: the period stayed "over budget" for the rest of its life and the
 * next request against it was flagged on a deficit that had already been
 * authorised and funded.
 */
export function effectiveBudget(period: PeriodLike): number {
  return (period.totalBudget || 0) + expansionTotal(period);
}

/** Unspent headroom: the effective ceiling less what is utilised and locked. */
export function availableBudget(period: PeriodLike): number {
  return effectiveBudget(period) - (period.utilisedBudget || 0) - (period.pendingBudget || 0);
}

export class BudgetService {
  /**
   * Explains a missing budget period in terms of the fix, not the fault.
   *
   * A request reaches the Finance Head precisely because the budget check
   * failed, and "no period configured for the payment date" is one of the ways
   * it fails — so this is the first thing an approver sees on a department that
   * has never been given a budget. Naming the department, the date and the
   * screen that resolves it turns a dead end into an instruction.
   */
  private static async missingPeriodMessage(
    request: { departmentId: unknown; requiredPaymentDate: Date },
    blockedAction: "approved" | "paid"
  ): Promise<string> {
    const department = await Department.findById(request.departmentId).select("name");
    const departmentName = department?.name ?? "this department";
    const paymentDate = new Date(request.requiredPaymentDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return (
      `${departmentName} has no budget period covering ${paymentDate}, ` +
      `so this request cannot be ${blockedAction} yet. ` +
      `An administrator must create one from Dashboard → Set Budget, with a period ` +
      `that includes ${paymentDate}. Retry once it is in place.`
    );
  }

  /**
   * Find the active budget period for a department based on a target date
   */
  public static async getBudgetPeriodForDate(departmentId: string, date: Date) {
    await connectToDatabase();
    
    // Find a period where date falls between startDate and endDate
    const period = await BudgetPeriod.findOne({
      departmentId,
      startDate: { $lte: date },
      endDate: { $gte: date }
    });
    
    return period;
  }

  /**
   * Validate if a department has enough remaining budget for a request
   * Returns:
   *   - { isValid: true, remaining: number } if valid
   *   - { isValid: false, remaining: number, message: string } if insufficient
   *
   * `reason` separates the two ways the check fails. They are not the same
   * event: NO_PERIOD means there is nothing to reserve against and the request
   * has to be held, while INSUFFICIENT means the department is genuinely over
   * its ceiling and the request travels on carrying the overrun. The caller
   * used to have to tell them apart by reading the message text.
   */
  public static async validateRequestBudget(
    departmentId: string,
    amount: number,
    date: Date
  ): Promise<BudgetCheckResult> {
    const period = await this.getBudgetPeriodForDate(departmentId, date);

    if (!period) {
      return {
        isValid: false,
        reason: "NO_PERIOD" as const,
        remaining: 0,
        message: "No active budget period configured for the requested payment date."
      };
    }

    const available = availableBudget(period);

    if (available >= amount) {
      return {
        isValid: true,
        remaining: available - amount,
        periodName: period.periodName
      };
    }

    // The variance the flow's Scenario B reports: requested (M) against
    // available (N), and the gap between them that needs justifying.
    return {
      isValid: false,
      reason: "INSUFFICIENT" as const,
      remaining: available,
      periodName: period.periodName,
      variance: amount - available,
      message: `Insufficient budget available. Required: ${money(amount)}, Available: ${money(available)}.`
    };
  }

  /**
   * Locks the budget when a request is submitted/pending (moves to pendingBudget)
   */
  public static async lockBudget(requestId: string) {
    await connectToDatabase();
    
    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    
    // If request has already had exceptional approval, we still lock the budget,
    // which may push the period's pendingBudget over totalBudget. This is correct as exceptional approval expands it.
    const period = await this.getBudgetPeriodForDate(request.departmentId.toString(), request.requiredPaymentDate);
    if (!period) {
      // Refused rather than skipped: approving with nowhere to record the
      // reservation would leave the amount untracked in every spend figure.
      // An administrator can create the period, so the caller is told exactly
      // that instead of being handed a bare failure.
      throw new Error(await this.missingPeriodMessage(request, "approved"));
    }

    period.pendingBudget += request.amount;

    // Post to the item the approver attached the request to, so the item's own
    // ledger stays in step with the department roll-up. Requests that never got
    // an item still move the period, which is what keeps historical records and
    // the unattached path working.
    const item = this.findItem(period, request.budgetItemId);
    if (item) item.pendingAmount += request.amount;

    await period.save();

    await LoggerService.logApp(
      AuditAction.BUDGET_LOCKED,
      `Locked ${money(request.amount)} in pending budget for period ${period.periodName}${
        item ? ` (item '${item.name}')` : ""
      } for request ${request.requestNumber}`
    );
  }

  /** The budget item a request is attached to, or null when it has none. */
  private static findItem(
    period: { lineItems?: unknown[] },
    budgetItemId?: unknown
  ): BudgetItemDoc | null {
    if (!budgetItemId) return null;
    const items = (period.lineItems ?? []) as BudgetItemDoc[];
    return items.find((i) => String(i._id) === String(budgetItemId)) ?? null;
  }

  /**
   * Unlocks the budget (reduces pendingBudget) if request is rejected or cancelled
   */
  public static async unlockBudget(requestId: string) {
    await connectToDatabase();
    
    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    
    const period = await this.getBudgetPeriodForDate(request.departmentId.toString(), request.requiredPaymentDate);
    if (!period) {
      // Deliberately skips where lock and commit refuse. This is the give-back
      // direction: nothing was ever reserved, and blocking a rejection or a
      // cancellation on missing configuration would trap the request with no
      // way out for the requester. Logged so the gap is still visible.
      await LoggerService.logApp(
        AuditAction.BUDGET_PERIOD_MISSING,
        `No budget period covers the payment date for request ${request.requestNumber}; nothing to release.`
      );
      return;
    }

    period.pendingBudget = Math.max(0, period.pendingBudget - request.amount);

    const item = this.findItem(period, request.budgetItemId);
    if (item) item.pendingAmount = Math.max(0, item.pendingAmount - request.amount);

    await period.save();

    await LoggerService.logApp(
      AuditAction.BUDGET_UNLOCKED,
      `Unlocked ${money(request.amount)} from pending budget for period ${period.periodName}${
        item ? ` (item '${item.name}')` : ""
      } for request ${request.requestNumber}`
    );
  }

  /**
   * Records a one-time budget increase against the item a request is attached to.
   *
   * This is the "Allocation adjusted" step of the budget-validation flow, and it
   * is granted at item grain because that is where the Finance Head rules: a
   * department is over budget only because one of its items is. Before this
   * existed, an exceptional approval locked the amount anyway and pushed
   * `pendingBudget` past `totalBudget`, so the grant left no trace on the
   * period — the department read as permanently over-committed and every later
   * request was measured against a deficit that had already been authorised.
   *
   * Returns the granted amount, or 0 when there is nothing to grant.
   */
  public static async grantOneTimeExpansion(
    requestId: string,
    amount: number,
    actor: ILogActor,
    reason?: string
  ): Promise<number> {
    await connectToDatabase();

    if (!amount || amount <= 0) return 0;

    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");

    const period = await this.getBudgetPeriodForDate(
      request.departmentId.toString(),
      request.requiredPaymentDate
    );
    if (!period) {
      // Same reasoning as lockBudget: there is nowhere to record the increase,
      // and granting it silently would leave the amount untracked everywhere.
      throw new Error(await this.missingPeriodMessage(request, "approved"));
    }

    const item = this.findItem(period, request.budgetItemId);
    if (!item) {
      // The approver attaches a request to an item before it can reach the
      // Finance Head, so an unattached request here means the chain was skipped.
      // Refused rather than silently expanded at department level: that would
      // put the grant somewhere no report attributes it to.
      throw new Error(
        `Request ${request.requestNumber} is not attached to a budget item, so there is nothing to expand. The approver must attach it before an expansion can be granted.`
      );
    }

    // One grant per request: a Finance Head revisiting a decision must not
    // stack a second expansion on top of the first.
    const already = (item.expansions ?? []).some(
      (e: { requestId?: unknown }) => String(e.requestId) === String(request._id)
    );
    if (already) return 0;

    item.expansions.push({
      requestId: request._id,
      amount,
      approvedById: actor?.id,
      approvedByName: actor?.name,
      reason,
      approvedAt: new Date(),
    });
    await period.save();

    await LoggerService.logAudit(
      AuditAction.BUDGET_EXPANDED,
      `One-time expansion of ${money(amount)} granted on budget item '${item.name}' (period ${period.periodName}) for request ${request.requestNumber}. Item allocation adjusted to ${money(itemCeiling(item))}; department ceiling now ${money(effectiveBudget(period))}.`,
      { requestId, amount, periodName: period.periodName, budgetItem: item.name },
      actor
    );

    return amount;
  }

  /**
   * Attaches a request to one of its department's budget items.
   *
   * The approver does this as part of approving: every request must draw on a
   * named item so the item's ledger — and the department roll-up built from it —
   * reflect real commitments rather than a single undifferentiated total.
   *
   * Re-attaching before payment is allowed and moves any reservation across, so
   * an approver who picks the wrong item can correct it without the pending
   * amount being stranded on the original.
   */
  public static async attachRequestToItem(requestId: string, budgetItemId: string, actor: ILogActor) {
    await connectToDatabase();

    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");

    const period = await this.getBudgetPeriodForDate(
      request.departmentId.toString(),
      request.requiredPaymentDate
    );
    if (!period) throw new Error(await this.missingPeriodMessage(request, "approved"));

    const target = this.findItem(period, budgetItemId);
    if (!target) {
      // The item has to belong to the department's own period — otherwise a
      // request could be booked against another department's allocation.
      throw new Error(
        `Invalid request: that budget item does not belong to ${period.periodName}. Choose one of the department's own items.`
      );
    }

    const previous = this.findItem(period, request.budgetItemId);
    if (previous && String(previous._id) === String(target._id)) return request;

    // Carry an existing reservation over rather than double-counting it.
    const isLocked = LOCKED_STATUSES.includes(request.status as RequestStatus);
    if (isLocked) {
      if (previous) previous.pendingAmount = Math.max(0, previous.pendingAmount - request.amount);
      target.pendingAmount += request.amount;
    }
    await period.save();

    request.budgetItemId = target._id as never;
    request.budgetItemName = target.name;
    await request.save();

    await LoggerService.logAudit(
      AuditAction.BUDGET_ITEM_ATTACHED,
      `Request ${request.requestNumber} attached to budget item '${target.name}' in ${period.periodName}${
        previous ? ` (moved from '${previous.name}')` : ""
      }`,
      { requestId, budgetItemId, budgetItem: target.name },
      actor
    );

    return request;
  }

  /**
   * The deficit a request leaves on the budget item it is attached to, or 0
   * when the item covers it.
   *
   * This is what makes a request a "budget item expansion request". It is asked
   * at the end of the approval chain rather than at submission because the item
   * is not chosen until an approver picks one — the submit-time check can only
   * see the department total, which says nothing about whether the specific item
   * the spend will be booked against can absorb it.
   *
   * The request's own reservation is already inside the item's `pendingAmount`,
   * so it is added back before the gap is measured.
   */
  public static async getItemShortfallForRequest(requestId: string): Promise<number> {
    await connectToDatabase();

    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");

    const period = await this.getBudgetPeriodForDate(
      request.departmentId.toString(),
      request.requiredPaymentDate
    );
    if (!period) return request.amount;

    const item = this.findItem(period, request.budgetItemId);
    // Unattached requests fall back to the department position; nothing else
    // can be said about an overrun until an item has been chosen.
    if (!item) return Math.max(0, request.amount - (availableBudget(period) + request.amount));

    const isLocked = LOCKED_STATUSES.includes(request.status as RequestStatus);
    const availableBefore = itemAvailable(item) + (isLocked ? request.amount : 0);
    return Math.max(0, request.amount - availableBefore);
  }

  /** The budget items an approver may attach a request to, with live headroom. */
  public static async getItemsForRequest(requestId: string): Promise<BudgetItemOptionDto[]> {
    await connectToDatabase();

    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");

    const period = await this.getBudgetPeriodForDate(
      request.departmentId.toString(),
      request.requiredPaymentDate
    );
    if (!period) return [];

    return (period.lineItems ?? []).map((item: BudgetItemDoc) => ({
      id: String(item._id),
      name: item.name,
      description: item.description,
      allocated: item.amount,
      expansionsGranted: itemExpansionTotal(item),
      utilised: item.utilisedAmount || 0,
      pending: item.pendingAmount || 0,
      available: itemAvailable(item),
      // Whether this request would overrun the item it is being attached to —
      // what makes it a "budget item expansion request" further down the chain.
      coversRequest: itemAvailable(item) >= request.amount,
      isAttached: String(item._id) === String(request.budgetItemId),
    }));
  }

  /**
   * Commits the budget (moves from pendingBudget to utilisedBudget) when request is Paid
   */
  public static async commitBudget(requestId: string) {
    await connectToDatabase();
    
    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    
    const period = await this.getBudgetPeriodForDate(request.departmentId.toString(), request.requiredPaymentDate);
    if (!period) {
      // Reachable only if the period was deleted after the request was
      // approved. Same remedy as lockBudget: restore the period, then release.
      throw new Error(await this.missingPeriodMessage(request, "paid"));
    }

    // Reduce pending budget and increase utilised budget, on the attached item
    // as well as the department roll-up it feeds.
    period.pendingBudget = Math.max(0, period.pendingBudget - request.amount);
    period.utilisedBudget += request.amount;

    const item = this.findItem(period, request.budgetItemId);
    if (item) {
      item.pendingAmount = Math.max(0, item.pendingAmount - request.amount);
      item.utilisedAmount += request.amount;
    }

    await period.save();
    
    await LoggerService.logAudit(
      AuditAction.BUDGET_COMMITTED,
      `Committed ${money(request.amount)} to utilised budget for department. Period: ${period.periodName}. Request: ${request.requestNumber}`
    );
  }

  /**
   * Calculates departmental spend metrics across all registered departments.
   *
   * Reports only what is configured: a department with no budget period returns
   * zeroes and `hasBudget: false` so the oversight screens can prompt an admin
   * to set one. It previously invented a ₦250,000 allocation, which made an
   * unconfigured department indistinguishable from a funded one.
   */
  public static async getDepartmentalSpendSummaries(): Promise<DepartmentSpendDto[]> {
    await connectToDatabase();

    const departments = await Department.find({}).sort({ name: 1 });

    return Promise.all(
      departments.map(async (dept) => {
        const [periods, requests] = await Promise.all([
          BudgetPeriod.find({ departmentId: dept._id }),
          ExpenseRequest.find({ departmentId: dept._id }).populate("initiatorId", "name"),
        ]);

        // Granted expansions are part of the ceiling the department may spend
        // to, so they belong in the total the oversight screens measure against.
        const totalBudget = periods.reduce((sum, p) => sum + effectiveBudget(p), 0);
        const utilised = periods.reduce((sum, p) => sum + (p.utilisedBudget || 0), 0);
        const pending = periods.reduce((sum, p) => sum + (p.pendingBudget || 0), 0);
        const committed = utilised + pending;
        const remaining = Math.max(0, totalBudget - committed);
        const pctUsed =
          totalBudget > 0 ? Math.min(100, Math.round((committed / totalBudget) * 1000) / 10) : 0;

        const overBudgetCount = requests.filter(
          (r) =>
            r.status === RequestStatus.INSUFFICIENT_BUDGET ||
            r.status === RequestStatus.PENDING_EXCEPTIONAL ||
            r.exceptionalBudgetApproved
        ).length;

        // Highest-spending initiator, shown on the departmental oversight card.
        const spendByRequester = new Map<string, number>();
        requests.forEach((r) => {
          const name = (r.initiatorId as { name?: string } | null)?.name;
          if (!name) return;
          spendByRequester.set(name, (spendByRequester.get(name) ?? 0) + r.amount);
        });
        const topRequester =
          [...spendByRequester.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

        return {
          id: dept._id.toString(),
          name: dept.name,
          description: dept.description || "",
          totalBudget,
          utilised,
          pending,
          remaining,
          pctUsed,
          topRequester,
          overBudgetCount,
          hasBudget: periods.length > 0,
          isActive: dept.isActive !== false,
        };
      })
    );
  }

  /**
   * How a department's earlier periods were consumed, newest first.
   *
   * Feeds the deficit analysis: a department that has closed its last three
   * periods at 98% is telling the approver something different from one that
   * has never breached 60%. Capped because this is a sparkline, not a report.
   */
  private static async getUtilisationHistory(
    departmentId: string,
    excludePeriodId?: unknown,
    limit = 6
  ): Promise<BudgetTrendPointDto[]> {
    const periods = await BudgetPeriod.find({ departmentId })
      .sort({ startDate: -1 })
      .limit(limit + 1);

    return periods
      .filter((p) => !excludePeriodId || String(p._id) !== String(excludePeriodId))
      .slice(0, limit)
      .map((p) => {
        const ceiling = effectiveBudget(p);
        const committed = (p.utilisedBudget || 0) + (p.pendingBudget || 0);
        return {
          periodName: p.periodName,
          totalBudget: ceiling,
          utilised: p.utilisedBudget || 0,
          pctUsed: ceiling > 0 ? Math.min(999, Math.round((committed / ceiling) * 1000) / 10) : 0,
          startDate: p.startDate.toISOString(),
        };
      });
  }

  /**
   * Resolves the budget picture behind a single request, for the approval and
   * exceptional-approval screens.
   *
   * These screens previously computed their own figures from the request amount
   * (a hardcoded ₦250,000 ceiling and a `amount * 0.8` "utilised" line), so the
   * numbers an approver read while authorising an over-budget request bore no
   * relation to the department's actual position.
   */
  public static async getBudgetContextForRequest(requestId: string): Promise<BudgetContextDto> {
    await connectToDatabase();

    const request = await ExpenseRequest.findById(requestId).populate("departmentId", "name");
    if (!request) throw new Error("Request not found");

    const departmentName = (request.departmentId as { name?: string } | null)?.name ?? "Unknown";
    const departmentId = request.departmentId?._id?.toString() ?? String(request.departmentId);
    const period = await this.getBudgetPeriodForDate(departmentId, request.requiredPaymentDate);

    // Utilisation of the department's other periods, newest first. This is the
    // "Historical Trends" half of the flow's deficit analysis: an approver
    // ruling on an overrun needs to see whether the department routinely runs
    // hot or whether this request is an outlier.
    const historicalTrend = await this.getUtilisationHistory(departmentId, period?._id);

    // No configured period — report the absence rather than inventing a ceiling.
    if (!period) {
      return {
        requestId,
        requestAmount: request.amount,
        departmentName,
        periodLabel: "",
        hasBudget: false,
        totalBudget: 0,
        expansionsGranted: 0,
        utilisedYTD: 0,
        pending: 0,
        remaining: 0,
        criticalGap: request.amount,
        itemShortfall: request.amount,
        attachedItem: null,
        variance: { requested: request.amount, available: 0, amount: request.amount, pct: 100 },
        historicalTrend,
        lineItems: [],
      };
    }

    const available = availableBudget(period);

    // The request's own pending amount is already inside `pendingBudget` once it
    // has been locked, so exclude it when measuring the shortfall it creates.
    const isLocked = LOCKED_STATUSES.includes(request.status as RequestStatus);
    const availableBeforeThisRequest = isLocked ? available + request.amount : available;
    const criticalGap = Math.max(0, request.amount - availableBeforeThisRequest);

    // Items now carry their own ledger, so `remaining` is the item's real
    // headroom rather than the allocation-minus-this-request approximation that
    // stood in while spend was only tracked at period level.
    const lineItems = (period.lineItems ?? []).map((item: BudgetItemDoc) => ({
      id: String(item._id),
      category: item.name,
      allocated: itemCeiling(item),
      remaining: itemAvailable(item),
      utilised: item.utilisedAmount || 0,
      pending: item.pendingAmount || 0,
      expansionsGranted: itemExpansionTotal(item),
      // The item this request is booked against, which is what the approver and
      // Finance Head are ruling on. Falls back to a category-name match for
      // records raised before requests were attached to items.
      isRequestCategory: request.budgetItemId
        ? String(item._id) === String(request.budgetItemId)
        : item.name.toLowerCase() === String(request.category).toLowerCase(),
    }));

    // The item under review, and the deficit it carries. The request's own
    // reservation is already inside the item's pending figure once locked, so
    // it is added back before the gap is measured — the same arithmetic the
    // routing decision and the grant both use, so all three agree.
    const attachedItem =
      (lineItems as BudgetLineContextDto[]).find((item) => item.isRequestCategory) ?? null;
    const itemShortfall = attachedItem
      ? Math.max(0, request.amount - (attachedItem.remaining + (isLocked ? request.amount : 0)))
      : criticalGap;

    return {
      requestId,
      requestAmount: request.amount,
      departmentName,
      periodLabel: `${departmentName} - ${period.periodName}`,
      hasBudget: true,
      // The ceiling as it now stands, expansions included, so the figure the
      // approver reads is the one the availability check actually used.
      totalBudget: effectiveBudget(period),
      expansionsGranted: expansionTotal(period),
      utilisedYTD: period.utilisedBudget,
      pending: period.pendingBudget,
      remaining: availableBeforeThisRequest,
      criticalGap,
      // What an expansion would actually have to cover. Measured on the item,
      // because that is the grain the Finance Head grants at — reporting the
      // department gap here showed ₦0 whenever the department had headroom but
      // the single item the spend is charged to did not.
      itemShortfall,
      attachedItem,
      // Requested (M) against available (N) — the variance the flow says must be
      // justified before a Finance Head can rule on the overrun.
      variance: {
        requested: request.amount,
        available: availableBeforeThisRequest,
        amount: criticalGap,
        pct:
          availableBeforeThisRequest > 0
            ? Math.round((criticalGap / availableBeforeThisRequest) * 1000) / 10
            : 100,
      },
      historicalTrend,
      lineItems,
    };
  }

  /** Every configured budget period, for the Admin budget management screens. */
  public static async listPeriods(): Promise<BudgetPeriodDto[]> {
    await connectToDatabase();

    const periods = await BudgetPeriod.find({})
      .populate("departmentId", "name")
      .sort({ startDate: -1 });

    return periods.map((p) => ({
      id: p._id.toString(),
      departmentId: p.departmentId?._id?.toString() ?? String(p.departmentId),
      departmentName: (p.departmentId as { name?: string } | null)?.name ?? "Unknown",
      periodName: p.periodName,
      totalBudget: effectiveBudget(p),
      expansionsGranted: expansionTotal(p),
      utilisedBudget: p.utilisedBudget,
      pendingBudget: p.pendingBudget,
      availableBudget: availableBudget(p),
      lineItems: (p.lineItems ?? []).map((item: BudgetItemDoc) => ({
        id: String(item._id),
        name: item.name,
        description: item.description,
        // The administrator's own allocation, kept separate from what a Finance
        // Head granted so the Set Budget screen edits the former without ever
        // writing the latter back as though it were budgeted.
        amount: item.amount,
        utilised: item.utilisedAmount || 0,
        pending: item.pendingAmount || 0,
        expansionsGranted: itemExpansionTotal(item),
        available: itemAvailable(item),
      })),
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
    }));
  }

  /**
   * Carries each existing item's ledger onto the incoming allocation.
   *
   * The Set Budget screen sends items as the administrator edited them —
   * name, description and amount — with no spend figures, because those are
   * not theirs to set. Writing that array straight over `lineItems` replaced
   * whole subdocuments, so every re-save silently reset `utilisedAmount`,
   * `pendingAmount` and any granted expansions to zero: the department's
   * recorded spend would vanish and requests already reserved against an item
   * would be double-counted the next time anything drew on it.
   *
   * Items are matched by id where the client round-tripped one, and otherwise
   * by name — which is how an item added in the modal (no id yet) still finds
   * its predecessor. An item the administrator removed keeps no ledger; that is
   * the intended effect of deleting it.
   */
  private static mergeItemLedgers(
    existing: { lineItems?: BudgetItemDoc[] } | null,
    incoming: IncomingBudgetItem[]
  ): IBudgetLineItem[] {
    const previous = existing?.lineItems ?? [];
    if (previous.length === 0) return incoming;

    const byId = new Map(previous.map((item) => [String(item._id), item]));
    const byName = new Map(previous.map((item) => [item.name.trim().toLowerCase(), item]));

    return incoming.map((item) => {
      // Id first: it is the only thing that survives a rename. The name lookup
      // is the fallback for an item the client could not identify — one added
      // in the modal, or a payload from before ids were round-tripped.
      const incomingId = item._id ?? item.id;
      const match =
        (incomingId ? byId.get(String(incomingId)) : undefined) ??
        byName.get(item.name.trim().toLowerCase());

      if (!match) return item;

      return {
        ...item,
        _id: match._id as string | undefined,
        utilisedAmount: match.utilisedAmount || 0,
        pendingAmount: match.pendingAmount || 0,
        // Ids arrive as ObjectIds off the document; Mongoose casts them back on
        // save, so normalising here keeps the domain type honest either way.
        expansions: (match.expansions ?? []).map((grant) => ({
          ...grant,
          requestId: String(grant.requestId),
          approvedById: grant.approvedById ? String(grant.approvedById) : undefined,
        })),
      };
    });
  }

  /**
   * Creates or replaces a department's allocation for a period.
   *
   * Upserts on (departmentId, periodName) to match the schema's compound unique
   * index, so re-saving the Set Budget modal adjusts the existing period rather
   * than failing on a duplicate key. `utilisedBudget` / `pendingBudget` are
   * never touched here — they are ledger state owned by the workflow.
   */
  public static async upsertBudgetPeriod(
    data: {
      departmentId: string;
      periodName: string;
      totalBudget: number;
      lineItems?: IncomingBudgetItem[];
      startDate: string | Date;
      endDate: string | Date;
    },
    actor: ILogActor
  ) {
    await connectToDatabase();

    const department = await Department.findById(data.departmentId);
    if (!department) throw new Error("Department not found");

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate <= startDate) {
      throw new Error("Invalid request: the period end date must fall after the start date.");
    }

    const existing = await BudgetPeriod.findOne({
      departmentId: data.departmentId,
      periodName: data.periodName,
    });

    // Refuse to drop an item that still carries commitments.
    //
    // Removing it takes its `utilisedAmount` and `pendingAmount` out of the
    // period while the department's own totals still include them, and orphans
    // every request whose `budgetItemId` points at it — those requests then
    // move no ledger at all, and a Finance Head asked to expand one is told it
    // is attached to nothing. Zeroing the allocation is the supported way to
    // retire an item that has been spent against.
    if (existing) {
      const keptIds = new Set(
        (data.lineItems ?? [])
          .map((item) => item._id ?? item.id)
          .filter(Boolean)
          .map(String)
      );
      const keptNames = new Set(
        (data.lineItems ?? []).map((item) => item.name.trim().toLowerCase())
      );

      const orphaned = (existing.lineItems ?? []).filter((item: BudgetItemDoc) => {
        const stillPresent =
          keptIds.has(String(item._id)) || keptNames.has(item.name.trim().toLowerCase());
        const committed = (item.utilisedAmount || 0) + (item.pendingAmount || 0);
        return !stillPresent && committed > 0;
      });

      if (orphaned.length > 0) {
        const names = orphaned.map((item: BudgetItemDoc) => `'${item.name}'`).join(", ");
        throw new Error(
          `Invalid request: ${names} cannot be removed because spending is already recorded against ${orphaned.length > 1 ? "them" : "it"}. Set the allocation to zero instead of deleting the item.`
        );
      }
    }

    // Refuse to shrink an allocation below what is already spent or locked —
    // that would render the period permanently over-committed.
    if (existing) {
      // Spend funded by a granted expansion is not the base allocation's to
      // cover, so it is excluded before the floor is applied — otherwise every
      // exception would permanently raise the minimum an administrator could
      // set the department's own allocation to.
      const committed = existing.utilisedBudget + existing.pendingBudget;
      const baseCommitted = Math.max(0, committed - expansionTotal(existing));
      if (data.totalBudget < baseCommitted) {
        throw new Error(
          `Invalid request: ${money(baseCommitted)} is already utilised or locked in '${data.periodName}'. The allocation cannot be set below that.`
        );
      }
    }

    const period = await BudgetPeriod.findOneAndUpdate(
      { departmentId: data.departmentId, periodName: data.periodName },
      {
        departmentId: data.departmentId,
        periodName: data.periodName,
        totalBudget: data.totalBudget,
        lineItems: this.mergeItemLedgers(existing, data.lineItems ?? []),
        startDate,
        endDate,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await LoggerService.logAudit(
      existing ? AuditAction.BUDGET_PERIOD_UPDATED : AuditAction.BUDGET_PERIOD_CREATED,
      `Budget for '${department.name}' period '${data.periodName}' set to ${money(data.totalBudget)}`,
      { departmentId: data.departmentId, periodName: data.periodName, totalBudget: data.totalBudget },
      actor
    );

    return period;
  }
}
