/**
 * The three decisions any approver can take on a request.
 *
 * Was previously re-declared as an inline `"APPROVE" | "REJECT" | "RETURN"`
 * union in six separate places (services, validators, provider handlers,
 * modals). Import this instead so a fourth action only has to be added once.
 */
export enum WorkflowActionType {
  APPROVE = "APPROVE",
  REJECT = "REJECT",
  RETURN = "RETURN",
}
