/**
 * Permission vocabulary backing the Admin role matrix
 * (designs/system-admin/Admin_ Role Permissions Matrix.png).
 *
 * These are the single source of truth for both the matrix UI and the
 * server-side `requirePermission` guard in `src/middlewares/auth.ts` — the grid
 * an admin edits and the check the API performs read the same keys.
 */

/** A protected area of the system — one row in the permissions matrix. */
export enum PermissionResource {
  EXPENSE_REQUESTS = "EXPENSE_REQUESTS",
  CORPORATE_CARDS = "CORPORATE_CARDS",
  DEPARTMENTAL_BUDGETS = "DEPARTMENTAL_BUDGETS",
  FORECAST_MODELS = "FORECAST_MODELS",
  AUDIT_LOGS = "AUDIT_LOGS",
  COMPLIANCE_REPORTS = "COMPLIANCE_REPORTS",
  ROLE_DEFINITIONS = "ROLE_DEFINITIONS",
  USERS = "USERS",
  DEPARTMENTS = "DEPARTMENTS",
}

/** An operation on a resource — one column in the permissions matrix. */
export enum PermissionAction {
  VIEW = "VIEW",
  CREATE = "CREATE",
  EDIT = "EDIT",
  APPROVE = "APPROVE",
  DELETE = "DELETE",
}

/** Human labels for the matrix rows; keeps copy out of the component. */
export const PERMISSION_RESOURCE_LABELS: Record<PermissionResource, string> = {
  [PermissionResource.EXPENSE_REQUESTS]: "Expense Requests",
  [PermissionResource.CORPORATE_CARDS]: "Corporate Cards",
  [PermissionResource.DEPARTMENTAL_BUDGETS]: "Departmental Budgets",
  [PermissionResource.FORECAST_MODELS]: "Forecast Models",
  [PermissionResource.AUDIT_LOGS]: "Audit Logs",
  [PermissionResource.COMPLIANCE_REPORTS]: "Compliance Reports",
  [PermissionResource.ROLE_DEFINITIONS]: "Role Definitions",
  [PermissionResource.USERS]: "Users",
  [PermissionResource.DEPARTMENTS]: "Departments",
};

/** Human labels for the matrix columns. */
export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  [PermissionAction.VIEW]: "View",
  [PermissionAction.CREATE]: "Create",
  [PermissionAction.EDIT]: "Edit",
  [PermissionAction.APPROVE]: "Approve",
  [PermissionAction.DELETE]: "Delete",
};
