import { connectToDatabase } from "../../config/db";
import { WorkflowConfig } from "../../models/WorkflowConfig";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { RequestStatus } from "../../enums/statuses";
import { SystemRole } from "../../enums/roles";

/**
 * Roles whose stage in the request flow is served by a dedicated route, not by
 * the generic approval chain.
 *
 * The Finance Officer acts through `/upload` (SENT_TO_FINANCE →
 * UPLOADED_TO_BANK) and the Finance Manager through `/release`
 * (AWAITING_RELEASE → PAID). Listing either of them as an approval step as well
 * strands the request: `processWorkflowAction` keeps it at PENDING_APPROVAL
 * waiting for a finance "approval" that no screen offers, while every finance
 * queue in the app is looking for SENT_TO_FINANCE. Filtering them out here
 * repairs configurations already saved with those steps, so existing databases
 * do not need a migration.
 */
const DEDICATED_STAGE_ROLES: SystemRole[] = [
  SystemRole.FINANCE_OFFICER,
  SystemRole.FINANCE_MANAGER,
];

export class WorkflowService {
  /**
   * Get the active workflow configuration.
   * If none exists, creates and seeds a default configuration.
   */
  public static async getActiveWorkflow() {
    await connectToDatabase();

    let config = await WorkflowConfig.findOne({ isActive: true });

    if (!config) {
      // The approval chain only — the "Approval workflow" box in the request
      // flow. Finance processing and payment release are fixed stages that
      // follow it, so they are not steps here.
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
