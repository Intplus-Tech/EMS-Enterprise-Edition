import { connectToDatabase } from "../../config/db";
import { WorkflowConfig } from "../../models/WorkflowConfig";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { RequestStatus } from "../../enums/statuses";
import { SystemRole } from "../../enums/roles";

export class WorkflowService {
  /**
   * Get the active workflow configuration.
   * If none exists, creates and seeds a default configuration.
   */
  public static async getActiveWorkflow() {
    await connectToDatabase();
    
    let config = await WorkflowConfig.findOne({ isActive: true });
    
    if (!config) {
      // Seed default workflow steps matching the functional spec:
      // Step 1: Departmental Approver
      // Step 2: Finance Officer (Processing & Bank Upload)
      // Step 3: Finance Manager (Bank Release & Close)
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
            stepName: "Finance Audit & Upload",
            role: SystemRole.FINANCE_OFFICER,
            minAmount: 0,
            requiresAllApprovals: false
          },
          {
            stepIndex: 2,
            stepName: "Payment Release Authorization",
            role: SystemRole.FINANCE_MANAGER,
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
