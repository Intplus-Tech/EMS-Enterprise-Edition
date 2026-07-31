import { RequestStatus } from "../../enums/statuses";

/**
 * Reader-facing wording for each lifecycle status.
 *
 * Emails and notifications address the initiator directly, so they need prose
 * ("Awaiting departmental approval") rather than the enum's wire value
 * ("PENDING_APPROVAL") that the status badges render.
 */
const LABELS: Record<RequestStatus, string> = {
  [RequestStatus.DRAFT]: "Draft",
  [RequestStatus.SUBMITTED]: "Submitted",
  [RequestStatus.BUDGET_CHECK]: "Undergoing budget check",
  [RequestStatus.INSUFFICIENT_BUDGET]: "Flagged as over budget",
  [RequestStatus.PENDING_EXCEPTIONAL]: "Awaiting Finance Head budget approval",
  [RequestStatus.PENDING_APPROVAL]: "Awaiting departmental approval",
  [RequestStatus.APPROVED]: "Approved",
  [RequestStatus.SENT_TO_FINANCE]: "Sent to Finance for processing",
  [RequestStatus.UPLOADED_TO_BANK]: "Uploaded to the bank platform",
  [RequestStatus.AWAITING_RELEASE]: "Awaiting payment release",
  [RequestStatus.PAID]: "Paid",
  [RequestStatus.CLOSED]: "Closed",
  [RequestStatus.REJECTED]: "Rejected",
  [RequestStatus.RETURNED]: "Returned to you for clarification",
  [RequestStatus.CANCELLED]: "Withdrawn",
};

export function humanizeRequestStatus(status: RequestStatus | string): string {
  return LABELS[status as RequestStatus] ?? String(status).replace(/_/g, " ");
}
