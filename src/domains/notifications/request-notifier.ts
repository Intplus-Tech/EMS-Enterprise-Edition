import { User } from "../../models/User";
import { EmailService } from "../email/email.service";
import { LoggerService } from "../logs/logger.service";
import { RequestStatus } from "../../enums/statuses";
import { humanizeRequestStatus } from "./status-labels";

/**
 * Sends the initiator an email when their request changes hands.
 *
 * `EmailService.sendExpenseNotification` and its templates already existed but
 * were never called, so nobody was told their request had been approved,
 * returned or paid. Wired into `ExpenseService` at each transition.
 */

/** Transitions worth emailing about. Intermediate machine states are skipped. */
const NOTIFIABLE: RequestStatus[] = [
  RequestStatus.PENDING_APPROVAL,
  RequestStatus.PENDING_EXCEPTIONAL,
  RequestStatus.SENT_TO_FINANCE,
  RequestStatus.UPLOADED_TO_BANK,
  RequestStatus.PAID,
  RequestStatus.CLOSED,
  RequestStatus.REJECTED,
  RequestStatus.RETURNED,
];

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
      if (!NOTIFIABLE.includes(request.status)) return;

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
}
