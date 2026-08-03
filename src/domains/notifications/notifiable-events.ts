/**
 * The single list of transitions an initiator is told about, and the category
 * each one is surfaced under.
 *
 * There are two delivery channels — email (`RequestNotifier`) and the in-app
 * bell (`notification.builder`) — and each used to keep its own list. They had
 * drifted: email covered eight statuses, the bell covered five, so a request
 * moving to PENDING_EXCEPTIONAL, UPLOADED_TO_BANK or CLOSED sent mail while the
 * bell stayed silent, and a request CANCELLED by a department deletion notified
 * through neither. One map now drives both, so adding an event cannot reach one
 * channel and miss the other.
 */

import { RequestStatus } from "../../enums/statuses";

/** Category the bell groups a notification under; drives its icon and colour. */
export type NotificationType =
  | "RETURNED"
  | "REJECTED"
  | "APPROVED"
  | "PAID"
  | "CANCELLED"
  | "IN_PROGRESS"
  | "ACTION_REQUIRED";

/**
 * Transition → category. A status absent from this map is an intermediate
 * machine state (BUDGET_CHECK, SUBMITTED, …) that nobody needs to hear about.
 */
export const NOTIFIABLE_TRANSITIONS: Partial<Record<RequestStatus, NotificationType>> = {
  [RequestStatus.RETURNED]: "RETURNED",
  [RequestStatus.REJECTED]: "REJECTED",
  [RequestStatus.PAID]: "PAID",
  [RequestStatus.CLOSED]: "PAID",
  // Withdrawal is usually the initiator's own doing — the builder skips a user's
  // own actions — but a department deletion cancels their requests for them.
  [RequestStatus.CANCELLED]: "CANCELLED",
  [RequestStatus.PENDING_APPROVAL]: "APPROVED",
  [RequestStatus.SENT_TO_FINANCE]: "APPROVED",
  // Progress the initiator can see but not act on. Previously invisible in the
  // bell even though the request had stalled awaiting a Finance Head decision.
  [RequestStatus.PENDING_EXCEPTIONAL]: "IN_PROGRESS",
  [RequestStatus.INSUFFICIENT_BUDGET]: "IN_PROGRESS",
  [RequestStatus.UPLOADED_TO_BANK]: "IN_PROGRESS",
};

/** True when a transition into `status` is worth telling the initiator about. */
export function isNotifiableStatus(status: RequestStatus | string): boolean {
  return Boolean(NOTIFIABLE_TRANSITIONS[status as RequestStatus]);
}

/** The bell's category for a transition, or null when it is not surfaced. */
export function notificationTypeFor(status: RequestStatus | string): NotificationType | null {
  return NOTIFIABLE_TRANSITIONS[status as RequestStatus] ?? null;
}
