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
