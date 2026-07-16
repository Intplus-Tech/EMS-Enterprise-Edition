import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../config/db";
import { ExpenseService } from "../../../../../domains/expense/expense.service";
import { authenticate } from "../../../../../middlewares/auth";
import { withErrorHandling } from "../../../../../middlewares/errors";
import { ExceptionalBudgetSchema } from "../../../../../validators/validation";
import { SystemRole } from "../../../../../enums/roles";

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await connectToDatabase();
  const user = await authenticate(req, [SystemRole.FINANCE_HEAD, SystemRole.ADMIN]);
  const { id } = await params;

  const body = await req.json();
  const validated = ExceptionalBudgetSchema.parse(body);

  const request = await ExpenseService.processExceptionalBudget(
    id,
    user as any,
    validated.action,
    validated.comment,
    validated.adjustedAmount
  );
  return NextResponse.json({ success: true, request });
});
