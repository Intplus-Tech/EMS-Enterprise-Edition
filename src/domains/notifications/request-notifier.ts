import { User } from "../../models/User";
import { EmailService } from "../email/email.service";
import { LoggerService } from "../logs/logger.service";
import { RequestStatus } from "../../enums/statuses";
import { SystemRole } from "../../enums/roles";
import { requestStateLabel } from "./status-labels";
import { isNotifiableStatus } from "./notifiable-events";
import { idOf, isSystemEntry } from "../identity/reference";

/**
 * Emails the people with a stake in a request when it changes hands: its
 * initiator at every transition, and everyone who handled it once it completes.
 *
 * `EmailService.sendExpenseNotification` and its templates already existed but
 * were never called, so nobody was told their request had been approved,
 * returned or paid. Wired into `ExpenseService` at each transition.
 *
 * Which transitions qualify is defined once in `notifiable-events` and shared
 * with the in-app bell, so the two channels cannot report different events.
 */

export class RequestNotifier {
  /**
   * Notifies a request's initiator of its new status.
   *
   * Never throws: a mail outage must not roll back a completed approval, so
   * failures are logged and swallowed.
   */
  public static async notifyInitiator(
    request: {
      _id: { toString(): string };
      requestNumber: string;
      initiatorId: unknown;
      status: RequestStatus;
      /** Qualifies INSUFFICIENT_BUDGET — see `requestStateLabel`. */
      awaitingBudgetPeriod?: boolean;
    },
    origin?: string
  ): Promise<void> {
    try {
      if (!isNotifiableStatus(request.status)) return;

      const initiatorId =
        (request.initiatorId as { _id?: unknown })?._id ?? request.initiatorId;
      const initiator = await User.findById(initiatorId).select("email name isActive");

      // Nothing to send to a deleted or deactivated account.
      if (!initiator?.email || !initiator.isActive) return;

      const actionUrl = origin ? `${origin}/requests` : undefined;

      await EmailService.sendExpenseNotification(
        initiator.email,
        initiator.name,
        request.requestNumber,
        requestStateLabel(request),
        actionUrl,
        origin
      );
    } catch (error) {
      await LoggerService.logException(
        "EXPENSE_NOTIFICATION_FAILED",
        `Could not email the initiator about request ${request.requestNumber}`,
        error
      );
    }
  }

  /**
   * Tells the budget owners that an allocation has just been committed.
   *
   * The budget-validation flow ends its approval scenario with "notification
   * sent to Requestor *and Finance*" — only the requestor was ever told, so the
   * people accountable for the allocation learned of a deduction against it
   * whenever they next happened to open the dashboard.
   *
   * Never throws, for the same reason as `notifyInitiator`: a mail outage must
   * not roll back a budget decision that has already been applied.
   */
  public static async notifyFinanceOfAllocation(
    request: { requestNumber: string; amount: number; status: RequestStatus },
    origin?: string
  ): Promise<void> {
    try {
      const owners = await User.find({
        role: SystemRole.FINANCE_HEAD,
        isActive: true,
      }).select("email name");

      const actionUrl = origin ? `${origin}/departmental-spend` : undefined;

      await Promise.all(
        owners
          .filter((owner: { email?: string }) => Boolean(owner.email))
          .map((owner: { email: string; name: string }) =>
            EmailService.sendExpenseNotification(
              owner.email,
              owner.name,
              request.requestNumber,
              `Budget approved — allocation deducted`,
              actionUrl,
              origin
            )
          )
      );
    } catch (error) {
      await LoggerService.logException(
        "BUDGET_NOTIFICATION_FAILED",
        `Could not notify finance about the allocation for request ${request.requestNumber}`,
        error
      );
    }
  }

  /**
   * Tells everyone who handled a request that it has completed.
   *
   * The approver, the Finance Officer and — on the over-budget path — the
   * Finance Head all acted on the request and then lost sight of it: their
   * notifications are derived from what is currently in their queue, so a
   * completed request produced nothing for any of them. Only the initiator was
   * ever told the outcome.
   *
   * The recipient list comes off the request's own history rather than a role
   * lookup, so it names the specific people who handled *this* request and
   * automatically covers whatever chain an administrator has configured. The
   * initiator is excluded because `notifyInitiator` already writes to them, and
   * system rows carry no real account to write to.
   *
   * Never throws, for the same reason as `notifyInitiator`: a mail outage must
   * not roll back a payment that has already been released.
   */
  public static async notifyParticipants(
    request: {
      requestNumber: string;
      initiatorId: unknown;
      status: RequestStatus;
      history?: { actorId?: unknown; actorName?: string }[];
    },
    origin?: string
  ): Promise<void> {
    try {
      const initiatorId = idOf(
        (request.initiatorId as { _id?: unknown })?._id ?? request.initiatorId
      );

      // Distinct reviewers, in the order they touched the request. System rows
      // are skipped: they are written under the acting user's id, so counting
      // them would mail whoever happened to be acting when the flow routed
      // itself — including the initiator's own submission.
      const reviewerIds = Array.from(
        new Set(
          (request.history ?? [])
            .filter((entry) => !isSystemEntry(entry))
            .map((entry) => idOf(entry.actorId))
            .filter((id) => id && id !== initiatorId)
        )
      );

      if (reviewerIds.length === 0) return;

      const reviewers = await User.find({
        _id: { $in: reviewerIds },
        isActive: true,
      }).select("email name");

      const actionUrl = origin ? `${origin}/history` : undefined;
      const label = requestStateLabel(request);

      await Promise.all(
        reviewers
          .filter((reviewer: { email?: string }) => Boolean(reviewer.email))
          .map((reviewer: { email: string; name: string }) =>
            EmailService.sendExpenseNotification(
              reviewer.email,
              reviewer.name,
              request.requestNumber,
              label,
              actionUrl,
              origin
            )
          )
      );
    } catch (error) {
      await LoggerService.logException(
        "EXPENSE_NOTIFICATION_FAILED",
        `Could not email the reviewers of request ${request.requestNumber}`,
        error
      );
    }
  }
}
