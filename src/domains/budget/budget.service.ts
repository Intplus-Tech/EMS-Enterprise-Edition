import { connectToDatabase } from "../../config/db";
import { BudgetPeriod } from "../../models/BudgetPeriod";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { LoggerService } from "../logs/logger.service";
import { SystemRole } from "../../enums/roles";

export class BudgetService {
  /**
   * Find the active budget period for a department based on a target date
   */
  public static async getBudgetPeriodForDate(departmentId: string, date: Date) {
    await connectToDatabase();
    
    // Find a period where date falls between startDate and endDate
    const period = await BudgetPeriod.findOne({
      departmentId,
      startDate: { $lte: date },
      endDate: { $gte: date }
    });
    
    return period;
  }

  /**
   * Validate if a department has enough remaining budget for a request
   * Returns:
   *   - { isValid: true, remaining: number } if valid
   *   - { isValid: false, remaining: number, message: string } if insufficient
   */
  public static async validateRequestBudget(departmentId: string, amount: number, date: Date) {
    const period = await this.getBudgetPeriodForDate(departmentId, date);
    
    if (!period) {
      return {
        isValid: false,
        remaining: 0,
        message: "No active budget period configured for the requested payment date."
      };
    }

    const availableBudget = period.totalBudget - period.utilisedBudget - period.pendingBudget;
    
    if (availableBudget >= amount) {
      return {
        isValid: true,
        remaining: availableBudget - amount,
        periodName: period.periodName
      };
    }

    return {
      isValid: false,
      remaining: availableBudget,
      periodName: period.periodName,
      message: `Insufficient budget available. Required: $${amount.toFixed(2)}, Available: $${availableBudget.toFixed(2)}.`
    };
  }

  /**
   * Locks the budget when a request is submitted/pending (moves to pendingBudget)
   */
  public static async lockBudget(requestId: string) {
    await connectToDatabase();
    
    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    
    // If request has already had exceptional approval, we still lock the budget,
    // which may push the period's pendingBudget over totalBudget. This is correct as exceptional approval expands it.
    const period = await this.getBudgetPeriodForDate(request.departmentId.toString(), request.requiredPaymentDate);
    if (!period) {
      throw new Error("No active budget period found to lock budget");
    }

    period.pendingBudget += request.amount;
    await period.save();
    
    await LoggerService.logApp(
      "BUDGET_LOCKED", 
      `Locked $${request.amount.toFixed(2)} in pending budget for period ${period.periodName} for request ${request.requestNumber}`
    );
  }

  /**
   * Unlocks the budget (reduces pendingBudget) if request is rejected or cancelled
   */
  public static async unlockBudget(requestId: string) {
    await connectToDatabase();
    
    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    
    const period = await this.getBudgetPeriodForDate(request.departmentId.toString(), request.requiredPaymentDate);
    if (!period) return; // If budget period was deleted, skip

    period.pendingBudget = Math.max(0, period.pendingBudget - request.amount);
    await period.save();
    
    await LoggerService.logApp(
      "BUDGET_UNLOCKED", 
      `Unlocked $${request.amount.toFixed(2)} from pending budget for period ${period.periodName} for request ${request.requestNumber}`
    );
  }

  /**
   * Commits the budget (moves from pendingBudget to utilisedBudget) when request is Paid
   */
  public static async commitBudget(requestId: string) {
    await connectToDatabase();
    
    const request = await ExpenseRequest.findById(requestId);
    if (!request) throw new Error("Request not found");
    
    const period = await this.getBudgetPeriodForDate(request.departmentId.toString(), request.requiredPaymentDate);
    if (!period) throw new Error("No budget period found to commit budget");

    // Reduce pending budget and increase utilised budget
    period.pendingBudget = Math.max(0, period.pendingBudget - request.amount);
    period.utilisedBudget += request.amount;
    await period.save();
    
    await LoggerService.logAudit(
      "BUDGET_COMMITTED",
      `Committed $${request.amount.toFixed(2)} to utilised budget for department. Period: ${period.periodName}. Request: ${request.requestNumber}`
    );
  }
}
