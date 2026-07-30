// Central mapping between user roles and the dashboard routes they can access.
// Used by the root redirector and the in-dashboard navigation guard.

export function getAllowedRoutesForRole(role?: string): string[] {
  switch (role) {
    case "INITIATOR":
      return ["/requests", "/history", "/settings"];
    case "FINANCE_HEAD":
      return ["/pending-exceptions", "/departmental-spend", "/exception-history", "/settings"];
    case "FINANCE_OFFICER":
    case "FINANCE_MANAGER":
      return ["/approvals", "/history", "/settings"];
    case "ADMIN":
      return [
        "/dashboard",
        "/departmental-spend",
        "/reports",
        "/users-roles",
        "/audit-trail",
        "/settings",
        "/workflow",
        "/logs",
        "/users",
      ];
    default:
      // APPROVER and any other authenticated role
      return ["/dashboard", "/approvals", "/history", "/requests", "/settings"];
  }
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
