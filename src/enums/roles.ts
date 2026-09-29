/**
 * System Roles for Authorization and Workflow Routing
 */
export enum SystemRole {
  ADMIN = "ADMIN",                     // Manages system settings, dynamic workflow config, users, departments
  INITIATOR = "INITIATOR",             // Submits expense requests
  APPROVER = "APPROVER",               // Departmental approver for normal workflow
  FINANCE_OFFICER = "FINANCE_OFFICER", // Checks bank payload, uploads instructions
  FINANCE_MANAGER = "FINANCE_MANAGER", // Releases bank payment and closes request
  FINANCE_HEAD = "FINANCE_HEAD"        // Approves exceptional (over-budget) requests
}

/**
 * What each role is called on screen. The enum values are stored on users,
 * permissions and audit entries, so only these display names change when the
 * business renames a role — every label in the UI must come from here.
 */
export const ROLE_LABELS: Record<SystemRole, string> = {
  [SystemRole.ADMIN]: "System Admin",
  [SystemRole.INITIATOR]: "Requester",
  [SystemRole.APPROVER]: "Approver 1",
  [SystemRole.FINANCE_OFFICER]: "Final Approver",
  [SystemRole.FINANCE_MANAGER]: "Uploader",
  [SystemRole.FINANCE_HEAD]: "Finance Head",
};

/** Display name for a role; unknown values fall back to a readable form of the raw string. */
export function roleLabel(role: SystemRole | string | null | undefined): string {
  if (!role) return "";
  return ROLE_LABELS[role as SystemRole] ?? String(role).replace(/_/g, " ");
}

/** Roles in the order the user-management selects list them. */
export const ROLE_OPTIONS: readonly SystemRole[] = [
  SystemRole.INITIATOR,
  SystemRole.APPROVER,
  SystemRole.FINANCE_OFFICER,
  SystemRole.FINANCE_MANAGER,
  SystemRole.FINANCE_HEAD,
  SystemRole.ADMIN,
];

/**
 * The only two roles that belong to a department. An initiator raises requests
 * against their own department's budget and an approver only ever sees that
 * department's queue, so both are meaningless without one.
 *
 * Every other role (admin, finance officer/manager/head) is enterprise-wide:
 * attaching a department to them would silently narrow the work they can see
 * and act on, which is why the guards below strip it rather than store it.
 */
export const DEPARTMENT_SCOPED_ROLES: readonly SystemRole[] = [
  SystemRole.INITIATOR,
  SystemRole.APPROVER,
];

/** True when the role must carry a department; false for global roles. */
export function isDepartmentScopedRole(role: SystemRole | string | null | undefined): boolean {
  return DEPARTMENT_SCOPED_ROLES.includes(role as SystemRole);
}
