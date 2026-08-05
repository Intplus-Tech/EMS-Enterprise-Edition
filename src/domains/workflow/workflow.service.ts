import { connectToDatabase } from "../../config/db";
import { WorkflowConfig } from "../../models/WorkflowConfig";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { RequestStatus } from "../../enums/statuses";
import { SystemRole } from "../../enums/roles";

/**
 * Roles whose stage in the request flow is served by a dedicated route, not by
 * the generic approval chain.
 *
 * Only the Finance Manager. They do not rule on a request: they receive an
 * approved one and release the payment through `/release` (AWAITING_RELEASE →
 * PAID). Listing them as an approval step strands the request at
 * PENDING_APPROVAL waiting for a decision no screen offers.
 *
 * The Finance Officer *is* an approval step — they approve, reject or ask for
 * justification on every request — so they are deliberately absent here. Their
 * approval is what performs the bank upload and hands over to the Manager; see
 * `ExpenseService.processWorkflowAction`.
 */
const DEDICATED_STAGE_ROLES: SystemRole[] = [SystemRole.FINANCE_MANAGER];

export class WorkflowService {
  /**
   * Get the active workflow configuration.
   * If none exists, creates and seeds a default configuration.
   */
  public static async getActiveWorkflow() {
    await connectToDatabase();

    let config = await WorkflowConfig.findOne({ isActive: true });

    if (!config) {
      // The two roles that rule on a request: the departmental approver, who
      // also books it against a budget item, and then the Finance Officer.
      // Payment release is not a step — the Finance Manager receives an already
      // approved request rather than deciding on it.
      config = new WorkflowConfig({
        name: "Standard Lifecycle Flow",
        isActive: true,
        steps: [
          {
            stepIndex: 0,
            stepName: "Departmental Approval",
            role: SystemRole.APPROVER,
            minAmount: 0,
            requiresAllApprovals: false
          },
          {
            stepIndex: 1,
            stepName: "Finance Officer Review",
            role: SystemRole.FINANCE_OFFICER,
            minAmount: 0,
            requiresAllApprovals: false
          }
        ]
      });
      await config.save();
    }

    return config;
  }

  /**
   * Evaluates the next step in the workflow for a given request.
   * Takes amount-based thresholds into account (skips steps if the amount is less than minAmount).
   * Returns the next step schema, or null if all steps are completed.
   */
  public static async getNextStepForRequest(request: any) {
    const config = await this.getActiveWorkflow();
    const steps = [...config.steps].sort((a: any, b: any) => a.stepIndex - b.stepIndex);

    // Scan steps starting from the request's current step index
    for (let i = request.currentStepIndex; i < steps.length; i++) {
      const step = steps[i];

      // Finance stages are not approval steps; see DEDICATED_STAGE_ROLES.
      if (DEDICATED_STAGE_ROLES.includes(step.role)) {
        continue;
      }

      // Amount threshold condition:
      // If the request amount is below the step's minimum required amount, we skip it.
      if (step.minAmount && request.amount < step.minAmount) {
        continue;
      }

      return { step, index: i };
    }

    return null; // No more steps remaining
  }
}
