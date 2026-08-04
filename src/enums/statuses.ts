/**
 * Expense Request Lifecycle Status Model
 */
export enum RequestStatus {
  DRAFT = "DRAFT",                                         // Initiator preparing, not submitted
  SUBMITTED = "SUBMITTED",                                 // Submitted, triggers budget check
  BUDGET_CHECK = "BUDGET_CHECK",                           // Automatic system budget checking
  INSUFFICIENT_BUDGET = "INSUFFICIENT_BUDGET",             // Exceeded budget, flags for Finance Head
  PENDING_EXCEPTIONAL = "PENDING_EXCEPTIONAL",             // Awaiting Finance Head expansion approval
  PENDING_APPROVAL = "PENDING_APPROVAL",                   // Awaiting standard approval sequence
  APPROVED = "APPROVED",                                   // Approved, ready for finance
  SENT_TO_FINANCE = "SENT_TO_FINANCE",                     // Received by finance
  UPLOADED_TO_BANK = "UPLOADED_TO_BANK",                   // Finance Officer uploaded bank file
  AWAITING_RELEASE = "AWAITING_RELEASE",                   // Awaiting release from Finance Manager
  PAID = "PAID",                                           // Payment released, confirmation details uploaded
  CLOSED = "CLOSED",                                       // Final closure: ledger updated, history locked
  REJECTED = "REJECTED",                                   // Declined by Approver or Finance Head
  RETURNED = "RETURNED",                                   // Returned to Initiator for correction/info
  CANCELLED = "CANCELLED"                                  // Cancelled by initiator before completion
}

/**
 * Statuses a request can hold once it has cleared the approval chain.
 *
 * This is the Finance Officer's entire world: they audit payment payloads and
 * upload bank instructions, so nothing that is still being approved — or that
 * was refused — is any of their business. Note the final approval lands on
 * SENT_TO_FINANCE, not APPROVED (APPROVED comes off the exceptional-budget
 * path), so "approved requests only" has to mean this set rather than the
 * single APPROVED value, or the officer's own queue would be empty.
 *
 * REJECTED and CANCELLED are absent by design: a refused request never cleared
 * approval, so it is not part of the payment pipeline.
 */
export const POST_APPROVAL_STATUSES: RequestStatus[] = [
  RequestStatus.APPROVED,
  RequestStatus.SENT_TO_FINANCE,
  RequestStatus.UPLOADED_TO_BANK,
  RequestStatus.AWAITING_RELEASE,
  RequestStatus.PAID,
  RequestStatus.CLOSED,
];

/**
 * The two states of the "insufficient budget" branch of the request flow.
 *
 * A request is first flagged (INSUFFICIENT_BUDGET) and then handed to the
 * Finance Head (PENDING_EXCEPTIONAL). Both mean "over budget, nobody has ruled
 * on it yet", so every over-budget queue, badge and filter must match the pair
 * rather than either one — five screens had drifted into their own inline
 * copies of this list.
 */
export const OVER_BUDGET_STATUSES: RequestStatus[] = [
  RequestStatus.INSUFFICIENT_BUDGET,
  RequestStatus.PENDING_EXCEPTIONAL,
];

/**
 * The bank leg of the pipeline: the Finance Officer has uploaded the payment
 * instruction and the Finance Manager has not yet released the cash.
 *
 * UPLOADED_TO_BANK is the moment of upload and AWAITING_RELEASE is the queue the
 * request then sits in. Screens that gate the Finance Manager's release action
 * must accept both, because records created before the AWAITING_RELEASE
 * transition existed are parked on the former.
 */
export const BANK_STAGE_STATUSES: RequestStatus[] = [
  RequestStatus.UPLOADED_TO_BANK,
  RequestStatus.AWAITING_RELEASE,
];

/** String-set membership test, for the many UI call sites holding raw statuses. */
export function isStatusIn(statuses: RequestStatus[], status?: string | null): boolean {
  return statuses.includes(String(status) as RequestStatus);
}
