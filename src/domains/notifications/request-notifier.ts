import { User } from "../../models/User";
import { EmailService } from "../email/email.service";
import { LoggerService } from "../logs/logger.service";
import { RequestStatus } from "../../enums/statuses";
import { SystemRole } from "../../enums/roles";
import { humanizeRequestStatus } from "./status-labels";
import { isNotifiableStatus } from "./notifiable-events";

/**
 * Sends the initiator an email when their request changes hands.
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
        humanizeRequestStatus(request.status),
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
}
