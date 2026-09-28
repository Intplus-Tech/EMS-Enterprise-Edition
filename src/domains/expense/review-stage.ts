/**
 * Whose desk a request is resting on, and whether the viewer has already ruled
 * on it as it now stands.
 *
 * Consumed by the approvals queue (`ApprovalsTab`, deciding which sub-tab a
 * request lands in) and by the request detail dialog (`ExpenseDetailModal`,
 * deciding whether the decision buttons render). The two carried their own
 * copies of these rules and both got them wrong in the same way, which between
 * them made a returned request vanish once the initiator answered it: the queue
 * filed the reply under "Completed" and the dialog stripped the buttons off it,
 * so there was nowhere left on screen showing work the approver still owed.
 *
 * Pure functions over the request JSON the list route returns — no React, no I/O.
 */

import { RequestStatus } from "../../enums/statuses";
import { SystemRole } from "../../enums/roles";
import { currentUserId, isSystemEntry, sameId } from "../identity/reference";

/** The signed-in user, in either session shape. */
interface Viewer {
  id?: string;
  _id?: unknown;
  role?: string;
}

/** One row of `ExpenseRequest.history`, as it reaches the client. */
interface HistoryEntry {
  actorId?: unknown;
  actorName?: string;
  statusAfter?: string;
}

/** The part of a request these rules read. */
interface ReviewableRequest {
  status?: string;
  currentStepIndex?: number;
  currentStageName?: string;
  currentStageRole?: string;
  history?: HistoryEntry[];
}

/**
 * Is the request waiting on a decision from `role` right now?
 *
 * PENDING_APPROVAL covers the departmental approver and the Finance Officer
 * alike, so the status cannot tell the two queues apart. `currentStageRole` is
 * resolved server-side against the configured chain and is the answer whenever
 * it is present; the step-index heuristics below only serve records fetched
 * before that field existed, and keep them in the right queue rather than
 * dropping them out of every tab.
 */
export function isRestingOnRole(
  request: ReviewableRequest | null | undefined,
  role: string | undefined
): boolean {
  if (!request || request.status !== RequestStatus.PENDING_APPROVAL) return false;
  if (request.currentStageRole) return request.currentStageRole === role;

  const index = typeof request.currentStepIndex === "number" ? request.currentStepIndex : 0;
  if (role === SystemRole.APPROVER) return index === 0;
  if (role === SystemRole.FINANCE_OFFICER) {
    return index > 0 || request.currentStageName === "Finance Officer Review";
  }
  // The legacy heuristics only ever knew the default two-step chain. For any
  // other role there is nothing to rule the request out on, and both callers
  // have always treated that as "yes".
  return true;
}

/**
 * Has the viewer personally ruled on the request *as it now stands*?
 *
 * Two things this must not count, both of which hid live work from the person
 * who owed it:
 *
 *  - Another holder of the same role. Matching on `actorRole`, as both callers
 *    did, meant a colleague's sign-off discharged the viewer's own step.
 *  - A decision on a superseded revision. Returning a request for clarification
 *    is a question, not a verdict: the initiator amends the request and sends
 *    it straight back to the same desk. Counting the pre-return history filed
 *    that reply as already dealt with. History up to and including the last
 *    return is therefore ignored — it was given on a payload that no longer
 *    exists.
 */
export function hasRuledOnRequest(
  request: ReviewableRequest | null | undefined,
  viewer: Viewer | null | undefined
): boolean {
  const viewerId = currentUserId(viewer);
  if (!viewerId) return false;

  const history = Array.isArray(request?.history) ? (request!.history as HistoryEntry[]) : [];

  // Start of the current revision: everything after the most recent return.
  let revisionStart = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.statusAfter === RequestStatus.RETURNED) {
      revisionStart = i + 1;
      break;
    }
  }

  return history
    .slice(revisionStart)
    // Rows the flow writes for itself carry the acting user's id, so an id
    // match alone cannot tell "this person decided" from "this happened".
    .some((entry) => !isSystemEntry(entry) && sameId(entry.actorId, viewerId));
}

/**
 * For the departmental approver: has this request moved off their desk?
 *
 * The one rule the approvals queue splits "Processing" from "Completed" on.
 * Resting on their own step trumps everything else — a request the initiator
 * has answered is back with them, whatever they did to the revision that was
 * returned.
 */
export function hasLeftApproverDesk(
  request: ReviewableRequest | null | undefined,
  viewer: Viewer | null | undefined
): boolean {
  if (isRestingOnRole(request, viewer?.role)) return false;

  // Still in the chain, but resting on a later step: someone else owns it now.
  if (request?.status === RequestStatus.PENDING_APPROVAL) return true;

  // Past the chain entirely — with finance, or with the Finance Head.
  if (
    request?.status === RequestStatus.SENT_TO_FINANCE ||
    request?.status === RequestStatus.PENDING_EXCEPTIONAL
  ) {
    return true;
  }

  return hasRuledOnRequest(request, viewer);
}
