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
