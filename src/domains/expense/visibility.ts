/**
 * Which requests each finance role is allowed to see.
 *
 * Consumed by `GET /api/expenses` (the list scope) and `GET /api/expenses/[id]`
 * (the single-record guard). Both must agree, or fetching by id becomes a way
 * around the list filter — so the rule lives here once rather than being
 * spelled out at each route.
 */

import { POST_APPROVAL_STATUSES, RequestStatus } from "../../enums/statuses";
import { SystemRole } from "../../enums/roles";

/**
 * Statuses the Finance Officer's queries may return.
 *
 * PENDING_APPROVAL is included because the officer is an approval step in the
 * configured chain, and a request awaiting their decision rests at exactly that
 * status. Scoping them to POST_APPROVAL_STATUSES alone — as this did — hid
 * every request that was waiting on them: the request left the departmental
 * approver and was never visible to anyone again, so both the standard and the
 * over-budget flows stalled permanently at this step.
 *
 * The status alone is too wide, though: it also covers the departmental
 * approver's own stage. `isVisibleToFinanceOfficer` narrows it to the requests
 * whose active step is actually theirs.
 */
export const FINANCE_OFFICER_STATUSES: RequestStatus[] = [
  RequestStatus.PENDING_APPROVAL,
  ...POST_APPROVAL_STATUSES,
];

/** The status list a role's list query filters on, or null for unrestricted. */
export function statusScopeForRole(role: string | undefined): RequestStatus[] | null {
  if (role === SystemRole.FINANCE_OFFICER) return FINANCE_OFFICER_STATUSES;
  // The manager only ever releases cash against an already approved instruction.
  if (role === SystemRole.FINANCE_MANAGER) return POST_APPROVAL_STATUSES;
  return null;
}

/**
 * Whether a request in the officer's status scope is genuinely theirs to see.
 *
 * A PENDING_APPROVAL request belongs to whichever step it is resting on, so the
 * officer sees it only when that step is theirs — never while it is still with
 * the departmental approver. Everything post-approval is theirs by definition:
 * they audited the payload, and their History screen is the record of it.
 */
export function isVisibleToFinanceOfficer(
  status: string | undefined,
  activeStepRole: SystemRole | string | undefined
): boolean {
  if (status === RequestStatus.PENDING_APPROVAL) {
    return activeStepRole === SystemRole.FINANCE_OFFICER;
  }
  return POST_APPROVAL_STATUSES.includes(status as RequestStatus);
}
