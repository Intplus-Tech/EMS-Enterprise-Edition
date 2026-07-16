import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../config/db";
import { ExpenseService } from "../../../../../domains/expense/expense.service";
import { authenticate } from "../../../../../middlewares/auth";
import { withErrorHandling } from "../../../../../middlewares/errors";
import { SystemRole } from "../../../../../enums/roles";

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await connectToDatabase();
  const user = await authenticate(req, [SystemRole.FINANCE_OFFICER, SystemRole.ADMIN]);
  const { id } = await params;

  const request = await ExpenseService.processFinanceUpload(id, user as any);
  return NextResponse.json({ success: true, request });
});
