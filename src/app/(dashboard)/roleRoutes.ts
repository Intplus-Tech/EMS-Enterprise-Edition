// Central mapping between user roles and the dashboard routes they can access.
// Used by the root redirector and the in-dashboard navigation guard.
//
// The allow-list is derived from the sidebar definition rather than repeated
// here: the two lists were identical but maintained separately, so adding a
// page to one and forgetting the other would either hide a reachable page or
// bounce the user off a page their own sidebar linked to.

import { getNavItemsForRole } from "./navItems";

export function getAllowedRoutesForRole(role?: string): string[] {
  return getNavItemsForRole(role).map((item) => item.route);
}

export function getDefaultRouteForRole(role?: string): string {
  switch (role) {
    case "INITIATOR":
      return "/requests";
    case "FINANCE_HEAD":
      return "/exception-history";
    case "FINANCE_OFFICER":
    case "FINANCE_MANAGER":
      return "/approvals";
    case "ADMIN":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}
