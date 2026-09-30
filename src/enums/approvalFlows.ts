/**
 * Approval flows a department can be assigned.
 *
 * Stored on each Department (the admin's choice) and snapshotted onto each
 * ExpenseRequest at submission, so switching a department's flow never re-routes
 * a request that is already part-way through the other chain.
 */
export enum ApprovalFlow {
  /** Requester → Approver 1 → Final Approver → Uploader (the configurable chain). */
  STANDARD = "STANDARD",
  /** Requester → Finance Head → Uploader. Approver 1 and Final Approver are bypassed. */
  FINANCE_HEAD_DIRECT = "FINANCE_HEAD_DIRECT",
}

/** Records created before flows existed carry no value and follow the standard chain. */
export const DEFAULT_APPROVAL_FLOW = ApprovalFlow.STANDARD;

/** Resolves a stored (possibly missing or unknown) flow value to a real flow. */
export function normalizeApprovalFlow(flow: string | null | undefined): ApprovalFlow {
  return Object.values(ApprovalFlow).includes(flow as ApprovalFlow)
    ? (flow as ApprovalFlow)
    : DEFAULT_APPROVAL_FLOW;
}
