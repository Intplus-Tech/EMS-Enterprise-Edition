import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../config/db";
import { ExpenseService } from "../../../../../domains/expense/expense.service";
import { authenticate } from "../../../../../middlewares/auth";
import { withErrorHandling } from "../../../../../middlewares/errors";
import { WorkflowActionSchema } from "../../../../../validators/validation";
import { SystemRole } from "../../../../../enums/roles";

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await connectToDatabase();
  // Standard approvers are Departmental Approvers, but could also be other roles if customized.
  // We authenticate the user first, and let the service handle step-by-role checks.
  const user = await authenticate(req);
  const { id } = await params;

  const body = await req.json();
  const validated = WorkflowActionSchema.parse(body);

  const request = await ExpenseService.processWorkflowAction(
    id,
    user as any,
    validated.action,
    validated.comment
  );
  return NextResponse.json({ success: true, request });
});
