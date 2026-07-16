import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { BudgetPeriod } from "../../../../models/BudgetPeriod";
import { ExpenseRequest } from "../../../../models/ExpenseRequest";
import { Department } from "../../../../models/Department";
import { authenticate } from "../../../../middlewares/auth";
import { withErrorHandling } from "../../../../middlewares/errors";
import { SystemRole } from "../../../../enums/roles";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  // Allowed for Admin, Finance Head, Finance Manager, and Finance Officer to view stats
  await authenticate(req, [
    SystemRole.ADMIN,
    SystemRole.FINANCE_HEAD,
    SystemRole.FINANCE_MANAGER,
    SystemRole.FINANCE_OFFICER
  ]);

  // 1. Fetch all departments and budget periods
  const departments = await Department.find();
  const budgets = await BudgetPeriod.find().populate("departmentId", "name");

  // 2. Fetch requests and compute count by status
  const requests = await ExpenseRequest.find().populate("departmentId", "name");
  
  const statusCounts: Record<string, number> = {};
  let totalInitiatedCount = 0;
  let totalInitiatedAmount = 0;
  let exceptionalCount = 0;

  requests.forEach((req) => {
    statusCounts[req.status] = (statusCounts[req.status] || 0) + 1;
    totalInitiatedCount++;
    totalInitiatedAmount += req.amount;
    if (req.exceptionalBudgetApproved) {
      exceptionalCount++;
    }
  });

  // 3. Category spend distribution
  const categorySpends: Record<string, number> = {};
  requests.forEach((req) => {
    if (req.status === "CLOSED" || req.status === "PAID") {
      categorySpends[req.category] = (categorySpends[req.category] || 0) + req.amount;
    }
  });

  // 4. Summarize corporate totals
  let corpBudget = 0;
  let corpUtilised = 0;
  let corpPending = 0;

  budgets.forEach((b) => {
    corpBudget += b.totalBudget;
    corpUtilised += b.utilisedBudget;
    corpPending += b.pendingBudget;
  });

  return NextResponse.json({
    success: true,
    stats: {
      corporate: {
        totalBudget: corpBudget,
        utilisedBudget: corpUtilised,
        pendingBudget: corpPending,
        availableBudget: corpBudget - corpUtilised - corpPending
      },
      requests: {
        totalCount: totalInitiatedCount,
        totalAmount: totalInitiatedAmount,
        exceptionalCount,
        statusCounts
      },
      categorySpends,
      departmentBudgets: budgets.map((b) => ({
        id: b._id,
        departmentName: (b.departmentId as any)?.name || "Unknown",
        periodName: b.periodName,
        totalBudget: b.totalBudget,
        utilisedBudget: b.utilisedBudget,
        pendingBudget: b.pendingBudget,
        availableBudget: b.totalBudget - b.utilisedBudget - b.pendingBudget
      }))
    }
  });
});
