import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../config/db";
import { ExpenseRequest } from "../../../../../models/ExpenseRequest";
import { authenticate } from "../../../../../middlewares/auth";
import { withErrorHandling } from "../../../../../middlewares/errors";
import { BudgetService } from "../../../../../domains/budget/budget.service";
import { SystemRole } from "../../../../../enums/roles";

/**
 * Budget position behind a single request, for the approval screens.
 *
 * Deliberately not gated on DEPARTMENTAL_BUDGETS:VIEW — an approver needs the
 * numbers for the request in front of them even without blanket budget access.
 * Visibility is instead scoped the same way `/api/expenses/[id]` scopes it.
 */
export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await connectToDatabase();
    const user = await authenticate(req);
    const { id } = await params;

    const expense = await ExpenseRequest.findById(id).select("initiatorId departmentId");
    if (!expense) throw new Error("Request not found");

    if (user.role === SystemRole.INITIATOR && expense.initiatorId.toString() !== user.id) {
      throw new Error("Forbidden: You do not have permission to view this request.");
    }
    if (user.role === SystemRole.APPROVER && expense.departmentId.toString() !== user.departmentId) {
      throw new Error("Forbidden: You do not have permission to view this request.");
    }

    const context = await BudgetService.getBudgetContextForRequest(id);
    return NextResponse.json({ success: true, context });
  }
);
