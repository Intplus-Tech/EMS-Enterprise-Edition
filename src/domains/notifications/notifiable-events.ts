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
  // A request rests here after the officer's upload, so this is the status the
  // initiator's email reports; the bell collapses it into the upload it followed
  // (see `collapsesInto` below) rather than announcing the pair twice.
  [RequestStatus.AWAITING_RELEASE]: "IN_PROGRESS",
};

/**
 * Transitions the workflow writes as a pair, and the half that represents the
 * whole event to a reader.
 *
 * Three stages of the flow are recorded in one atomic step: the budget flag is
 * immediately routed to the Finance Head, the bank upload immediately hands
 * over to the Finance Manager, and the payment release immediately closes the
 * request. Both halves are real states — the email reports whichever one the
 * request came to rest on — but they are one thing happening, so the bell must
 * not raise a notification for each. Releasing a payment used to put two
 * "Payment Completed" cards in the initiator's bell for the single release.
 */
const COLLAPSED_PAIRS: Partial<Record<RequestStatus, RequestStatus>> = {
  [RequestStatus.PENDING_EXCEPTIONAL]: RequestStatus.INSUFFICIENT_BUDGET,
  [RequestStatus.AWAITING_RELEASE]: RequestStatus.UPLOADED_TO_BANK,
  [RequestStatus.CLOSED]: RequestStatus.PAID,
};

/**
 * True when `status` is the trailing half of a pair whose leading half is the
 * status immediately before it in the request's history — meaning a
 * notification was already raised for this event.
 */
export function collapsesInto(status?: string | null, previousStatus?: string | null): boolean {
  const leadsWith = COLLAPSED_PAIRS[status as RequestStatus];
  return Boolean(leadsWith) && leadsWith === previousStatus;
}

/** True when a transition into `status` is worth telling the initiator about. */
export function isNotifiableStatus(status: RequestStatus | string): boolean {
  return Boolean(NOTIFIABLE_TRANSITIONS[status as RequestStatus]);
}

/** The bell's category for a transition, or null when it is not surfaced. */
export function notificationTypeFor(status: RequestStatus | string): NotificationType | null {
  return NOTIFIABLE_TRANSITIONS[status as RequestStatus] ?? null;
}

/**
 * The end of the payment flow: cash released and the ledger closed.
 *
 * Everyone who handled the request — the approver, the Finance Officer, and on
 * the over-budget path the Finance Head — is told when it completes. Their
 * queue-derived notifications disappear the moment a request leaves their
 * stage, so without this the only person who ever learned the outcome was the
 * initiator; every reviewer had to go looking for it.
 */
export const COMPLETION_STATUSES: RequestStatus[] = [
  RequestStatus.PAID,
  RequestStatus.CLOSED,
];

/** True once a request has been paid and closed out. */
export function isCompletionStatus(status?: string | null): boolean {
  return COMPLETION_STATUSES.includes(status as RequestStatus);
}
