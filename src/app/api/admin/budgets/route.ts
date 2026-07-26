import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { authenticate } from "../../../../middlewares/auth";
import { withErrorHandling } from "../../../../middlewares/errors";
import { BudgetService } from "../../../../domains/budget/budget.service";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  await authenticate(req);

  const budgets = await BudgetService.getDepartmentalSpendSummaries();

  return NextResponse.json({
    success: true,
    budgets,
  });
});
