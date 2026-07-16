import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../config/db";
import { ExpenseRequest } from "../../../models/ExpenseRequest";
import { ExpenseService } from "../../../domains/expense/expense.service";
import { authenticate } from "../../../middlewares/auth";
import { withErrorHandling } from "../../../middlewares/errors";
import { ExpenseInitiateSchema } from "../../../validators/validation";
import { SystemRole } from "../../../enums/roles";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  const user = await authenticate(req);
  
  let query: any = {};
  
  // Role-based visibility controls:
  // - Initiator: Only see requests raised by themselves
  // - Approver: Only see requests matching their own department
  // - Finance roles / Admin: Can view all requests across the organization
  if (user.role === SystemRole.INITIATOR) {
    query.initiatorId = user.id;
  } else if (user.role === SystemRole.APPROVER) {
    query.departmentId = user.departmentId;
  }

  const expenses = await ExpenseRequest.find(query)
    .populate("departmentId", "name")
    .populate("initiatorId", "name email")
    .sort({ createdAt: -1 });

  return NextResponse.json({ success: true, expenses });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  const user = await authenticate(req, [SystemRole.INITIATOR, SystemRole.ADMIN]);
  
  const body = await req.json();
  const validatedData = ExpenseInitiateSchema.parse(body);
  
  const request = await ExpenseService.createRequest(user as any, validatedData);
  return NextResponse.json({ success: true, request });
});
