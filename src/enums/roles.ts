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
