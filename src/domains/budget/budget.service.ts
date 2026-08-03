import { connectToDatabase } from "../../config/db";
import { BudgetPeriod } from "../../models/BudgetPeriod";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { Department } from "../../models/Department";
import { LoggerService, ILogActor } from "../logs/logger.service";
import { AuditAction } from "../../enums/auditActions";
import { RequestStatus } from "../../enums/statuses";
import { IBudgetLineItem } from "../../types/domain";
import { BudgetContextDto, BudgetPeriodDto, DepartmentSpendDto } from "../../types/api";

/** Statuses whose amount is already counted inside `pendingBudget`. */
const LOCKED_STATUSES: RequestStatus[] = [
  RequestStatus.PENDING_APPROVAL,
  RequestStatus.APPROVED,
  RequestStatus.SENT_TO_FINANCE,
  RequestStatus.UPLOADED_TO_BANK,
  RequestStatus.AWAITING_RELEASE,
];

/** Amounts in log lines and validation messages are Naira, matching the UI. */
const NAIRA = "₦";
const money = (amount: number) => `${NAIRA}${Number(amount || 0).toLocaleString()}`;

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
   */
  public static async validateRequestBudget(departmentId: string, amount: number, date: Date) {
    const period = await this.getBudgetPeriodForDate(departmentId, date);
    
    if (!period) {
      return {
        isValid: false,
        remaining: 0,
        message: "No active budget period configured for the requested payment date."
      };
    }

    const availableBudget = period.totalBudget - period.utilisedBudget - period.pendingBudget;
    
    if (availableBudget >= amount) {
      return {
        isValid: true,
        remaining: availableBudget - amount,
        periodName: period.periodName
      };
    }

    return {
      isValid: false,
      remaining: availableBudget,
      periodName: period.periodName,
      message: `Insufficient budget available. Required: ${money(amount)}, Available: ${money(availableBudget)}.`
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
    await period.save();

    await LoggerService.logApp(
      AuditAction.BUDGET_LOCKED,
      `Locked ${money(request.amount)} in pending budget for period ${period.periodName} for request ${request.requestNumber}`
    );
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
    await period.save();

    await LoggerService.logApp(
      AuditAction.BUDGET_UNLOCKED,
      `Unlocked ${money(request.amount)} from pending budget for period ${period.periodName} for request ${request.requestNumber}`
    );
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

    // Reduce pending budget and increase utilised budget
    period.pendingBudget = Math.max(0, period.pendingBudget - request.amount);
    period.utilisedBudget += request.amount;
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

        const totalBudget = periods.reduce((sum, p) => sum + (p.totalBudget || 0), 0);
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

    // No configured period — report the absence rather than inventing a ceiling.
    if (!period) {
      return {
        requestId,
        requestAmount: request.amount,
        departmentName,
        periodLabel: "",
        hasBudget: false,
        totalBudget: 0,
        utilisedYTD: 0,
        pending: 0,
        remaining: 0,
        criticalGap: request.amount,
        lineItems: [],
      };
    }

    const available = period.totalBudget - period.utilisedBudget - period.pendingBudget;

    // The request's own pending amount is already inside `pendingBudget` once it
    // has been locked, so exclude it when measuring the shortfall it creates.
    const isLocked = LOCKED_STATUSES.includes(request.status as RequestStatus);
    const availableBeforeThisRequest = isLocked ? available + request.amount : available;
    const criticalGap = Math.max(0, request.amount - availableBeforeThisRequest);

    const lineItems = (period.lineItems ?? []).map((item: IBudgetLineItem) => ({
      category: item.name,
      allocated: item.amount,
      // Spend is tracked at period level, not per line, so a line's remaining
      // figure is its allocation less this request when the categories match.
      remaining:
        item.name.toLowerCase() === String(request.category).toLowerCase()
          ? item.amount - request.amount
          : item.amount,
      isRequestCategory: item.name.toLowerCase() === String(request.category).toLowerCase(),
    }));

    return {
      requestId,
      requestAmount: request.amount,
      departmentName,
      periodLabel: `${departmentName} - ${period.periodName}`,
      hasBudget: true,
      totalBudget: period.totalBudget,
      utilisedYTD: period.utilisedBudget,
      pending: period.pendingBudget,
      remaining: availableBeforeThisRequest,
      criticalGap,
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
      totalBudget: p.totalBudget,
      utilisedBudget: p.utilisedBudget,
      pendingBudget: p.pendingBudget,
      availableBudget: p.totalBudget - p.utilisedBudget - p.pendingBudget,
      lineItems: (p.lineItems ?? []).map((item: IBudgetLineItem) => ({
        name: item.name,
        description: item.description,
        amount: item.amount,
      })),
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
    }));
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
      lineItems?: IBudgetLineItem[];
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

    // Refuse to shrink an allocation below what is already spent or locked —
    // that would render the period permanently over-committed.
    if (existing) {
      const committed = existing.utilisedBudget + existing.pendingBudget;
      if (data.totalBudget < committed) {
        throw new Error(
          `Invalid request: ${money(committed)} is already utilised or locked in '${data.periodName}'. The allocation cannot be set below that.`
        );
      }
    }

    const period = await BudgetPeriod.findOneAndUpdate(
      { departmentId: data.departmentId, periodName: data.periodName },
      {
        departmentId: data.departmentId,
        periodName: data.periodName,
        totalBudget: data.totalBudget,
        lineItems: data.lineItems ?? [],
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
