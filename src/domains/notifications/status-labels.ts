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
  // Reads as an outcome rather than a filing state: this label is what both the
  // initiator and every reviewer who handled the request see in their email.
  [RequestStatus.CLOSED]: "Completed — payment released and ledger closed",
  [RequestStatus.REJECTED]: "Rejected",
  [RequestStatus.RETURNED]: "Returned to you for clarification",
  [RequestStatus.CANCELLED]: "Withdrawn",
};

export function humanizeRequestStatus(status: RequestStatus | string): string {
  return LABELS[status as RequestStatus] ?? String(status).replace(/_/g, " ");
}

/**
 * What to tell the initiator their request is doing.
 *
 * A request held for a missing budget period carries INSUFFICIENT_BUDGET, but
 * telling its owner it was "flagged as over budget" would be false — nothing
 * has been ruled over budget, the department simply has no allocation yet, and
 * there is nothing for the initiator to fix.
 */
export function requestStateLabel(request: {
  status: RequestStatus | string;
  awaitingBudgetPeriod?: boolean;
}): string {
  if (request.awaitingBudgetPeriod) {
    return "Held until an administrator sets the department's budget";
  }
  return humanizeRequestStatus(request.status);
}
