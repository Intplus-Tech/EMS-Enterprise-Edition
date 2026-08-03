// The sidebar, per role — one entry per navigable page.
//
// This is the single source of truth for what a role can reach: `roleRoutes.ts`
// derives its allow-list from these same entries, so a page added to the nav can
// never be blocked by the route guard (and vice versa). The sidebar used to
// hardcode four near-identical JSX branches with two different active-item
// treatments, which is how INITIATOR and APPROVER ended up with a grey
// highlight while FINANCE_HEAD and ADMIN got the blue one from the designs.

import type { RequestStatus } from "../../enums/statuses";

/** Shape of the dashboard data a badge count is derived from. */
export interface NavBadgeContext {
  expenses: { status: RequestStatus | string; currentStepIndex?: number }[];
  role?: string;
}

export interface NavItem {
  route: string;
  label: string;
  /** Lucide icon name, resolved by the sidebar via `Icons[name]`. */
  icon: string;
  /**
   * Count shown as a pill on the right of the item. Returning 0 hides it, so
   * an empty queue shows no badge rather than a "0".
   */
  badge?: (ctx: NavBadgeContext) => number;
}

/** Requests the initiator still has to act on. */
const draftOrReturnedCount = ({ expenses }: NavBadgeContext) =>
  expenses.filter((e) => ["DRAFT", "RETURNED"].includes(String(e.status))).length;

/** Over-budget requests sitting with the Finance Head. */
const openExceptionCount = ({ expenses }: NavBadgeContext) =>
  expenses.filter((e) =>
    ["PENDING_EXCEPTIONAL", "INSUFFICIENT_BUDGET"].includes(String(e.status))
  ).length;

/**
 * Requests waiting on *this* approver. Each role owns a different stage, so the
 * badge counts only the queue that role can actually clear.
 */
const awaitingMyDecisionCount = ({ expenses, role }: NavBadgeContext) =>
  expenses.filter((e) => {
    const status = String(e.status);
    if (role === "FINANCE_HEAD") return status === "PENDING_EXCEPTIONAL";
    if (role === "APPROVER") return status === "PENDING_APPROVAL" && e.currentStepIndex === 0;
    if (role === "FINANCE_OFFICER") return status === "SENT_TO_FINANCE";
    if (role === "FINANCE_MANAGER") return status === "UPLOADED_TO_BANK";
    return false;
  }).length;

const SETTINGS: NavItem = { route: "/settings", label: "Settings", icon: "Settings" };

const INITIATOR_NAV: NavItem[] = [
  { route: "/requests", label: "Requests", icon: "Receipt", badge: draftOrReturnedCount },
  { route: "/history", label: "History", icon: "History" },
  SETTINGS,
];

const FINANCE_HEAD_NAV: NavItem[] = [
  {
    route: "/pending-exceptions",
    label: "Pending Exceptions",
    icon: "AlertTriangle",
    badge: openExceptionCount,
  },
  { route: "/departmental-spend", label: "Departmental Spend", icon: "PieChart" },
  { route: "/exception-history", label: "Exception History", icon: "BarChart2" },
  SETTINGS,
];

// Finance Officer and Finance Manager both work a single processing queue; the
// label reads "Pipeline Overview" for them because they monitor the pipeline
// rather than approve into it.
const FINANCE_PROCESSING_NAV: NavItem[] = [
  {
    route: "/approvals",
    label: "Pipeline Overview",
    icon: "CheckSquare",
    badge: awaitingMyDecisionCount,
  },
  { route: "/history", label: "History", icon: "History" },
  SETTINGS,
];

// The six items in designs/system-admin/Admin_ System Overview Dashboard.png, in
// that order, plus Workflow Rules.
//
// Three further entries used to sit *below* Settings, two of which duplicated a
// designed screen: "Users & Invites" repeated the Users & Roles directory and
// "System Audits" repeated the Audit Trail viewer, each with its own subtly
// different table. Both are gone; the invitation actions the first one carried
// now live in the ACTIONS column of Users & Roles. Workflow Rules has no design
// but also no substitute, so it stays.
const ADMIN_NAV: NavItem[] = [
  { route: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { route: "/departmental-spend", label: "Departmental Spend", icon: "PieChart" },
  { route: "/reports", label: "Report", icon: "BarChart2" },
  { route: "/users-roles", label: "Users & Roles", icon: "Users" },
  { route: "/audit-trail", label: "Audit Trail", icon: "FileText" },
  { route: "/workflow", label: "Workflow Rules", icon: "GitFork" },
  SETTINGS,
];

// APPROVER and any other authenticated role.
const DEFAULT_NAV: NavItem[] = [
  { route: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  {
    route: "/approvals",
    label: "Pending Approvals",
    icon: "CheckSquare",
    badge: awaitingMyDecisionCount,
  },
  { route: "/history", label: "History", icon: "History" },
  { route: "/requests", label: "Requests", icon: "Receipt" },
  SETTINGS,
];

export function getNavItemsForRole(role?: string): NavItem[] {
  switch (role) {
    case "INITIATOR":
      return INITIATOR_NAV;
    case "FINANCE_HEAD":
      return FINANCE_HEAD_NAV;
    case "FINANCE_OFFICER":
    case "FINANCE_MANAGER":
      return FINANCE_PROCESSING_NAV;
    case "ADMIN":
      return ADMIN_NAV;
    default:
      return DEFAULT_NAV;
  }
}
