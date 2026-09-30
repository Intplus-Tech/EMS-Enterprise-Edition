/**
 * What each approval flow means: its label, the approval chain it runs, and
 * which role performs the two duties that normally belong to bypassed stages.
 *
 * Pure (enums only, no I/O) so the server routing in `WorkflowService` /
 * `ExpenseService` and the client screens (department modals, approval dialogs)
 * read the same answers. Consumed by both sides; add a flow here, not as a new
 * `if (flow === …)` branch at a call site.
 */

import { ApprovalFlow, normalizeApprovalFlow } from "../../enums/approvalFlows";
import { SystemRole, roleLabel } from "../../enums/roles";

/** One configured approval step, as the routing logic reads it. */
export interface WorkflowStep {
  stepIndex: number;
  stepName: string;
  role: SystemRole;
  minAmount?: number;
  requiresAllApprovals?: boolean;
}

export interface ApprovalFlowPolicy {
  label: string;
  /** One line for the department form, naming the route a request takes. */
  description: string;
  /**
   * The fixed chain for this flow, or null when it runs the admin-configurable
   * chain from Workflow Rules.
   */
  fixedSteps: WorkflowStep[] | null;
  /**
   * Who books the request against a budget item as part of approving it. Every
   * request must draw on an item before it can be paid, so a flow that bypasses
   * Approver 1 has to hand that duty to someone who remains in the chain.
   */
  budgetBookingRole: SystemRole;
  /**
   * Whose approval also uploads the bank instruction and hands the request to
   * the Uploader's release queue. Normally the Final Approver; when that stage
   * is bypassed the last approver in the chain carries it instead.
   */
  bankUploadRole: SystemRole;
}

export const APPROVAL_FLOW_POLICIES: Record<ApprovalFlow, ApprovalFlowPolicy> = {
  [ApprovalFlow.STANDARD]: {
    label: "Standard Multi-Tier",
    description: `${roleLabel(SystemRole.INITIATOR)} → ${roleLabel(SystemRole.APPROVER)} → ${roleLabel(SystemRole.FINANCE_OFFICER)} → ${roleLabel(SystemRole.FINANCE_MANAGER)}`,
    fixedSteps: null,
    budgetBookingRole: SystemRole.APPROVER,
    bankUploadRole: SystemRole.FINANCE_OFFICER,
  },
  [ApprovalFlow.FINANCE_HEAD_DIRECT]: {
    label: "Accelerated Fast-Track",
    description: `${roleLabel(SystemRole.INITIATOR)} → ${roleLabel(SystemRole.FINANCE_HEAD)} → ${roleLabel(SystemRole.FINANCE_MANAGER)}`,
    fixedSteps: [
      {
        stepIndex: 0,
        stepName: `${roleLabel(SystemRole.FINANCE_HEAD)} Approval`,
        role: SystemRole.FINANCE_HEAD,
        minAmount: 0,
        requiresAllApprovals: false,
      },
    ],
    budgetBookingRole: SystemRole.FINANCE_HEAD,
    bankUploadRole: SystemRole.FINANCE_HEAD,
  },
};

/** Flows in the order the department form lists them. */
export const APPROVAL_FLOW_OPTIONS: readonly ApprovalFlow[] = [
  ApprovalFlow.STANDARD,
  ApprovalFlow.FINANCE_HEAD_DIRECT,
];

/** "Label (A → B → C)" as the department form's select lists it. */
export function approvalFlowOptionLabel(flow: string | null | undefined): string {
  const policy = approvalFlowPolicy(flow);
  return `${policy.label} (${policy.description})`;
}

/** Policy for a stored flow value; missing/unknown values get the standard flow. */
export function approvalFlowPolicy(flow: string | null | undefined): ApprovalFlowPolicy {
  return APPROVAL_FLOW_POLICIES[normalizeApprovalFlow(flow)];
}

/**
 * Must `role` pick a budget item when approving this request? Shared by the
 * approval dialogs so they ask for exactly what the server will insist on.
 */
export function booksBudgetItem(
  request: { approvalFlow?: string | null } | null | undefined,
  role: string | null | undefined
): boolean {
  return Boolean(role) && approvalFlowPolicy(request?.approvalFlow).budgetBookingRole === role;
}
