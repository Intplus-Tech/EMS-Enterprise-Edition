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
