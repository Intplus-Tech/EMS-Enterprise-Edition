import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { ExpenseRequest } from "../../../../models/ExpenseRequest";
import { authenticate } from "../../../../middlewares/auth";
import { withErrorHandling } from "../../../../middlewares/errors";
import { SystemRole } from "../../../../enums/roles";

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await connectToDatabase();
  const user = await authenticate(req);
  const { id } = await params;

  const expense = await ExpenseRequest.findById(id)
    .populate("departmentId", "name")
    .populate("initiatorId", "name email")
    .populate("exceptionalApprovedBy", "name email");

  if (!expense) {
    throw new Error("Request not found");
  }

  // Security: Initiator can only view their own requests, Approver can only view department requests
  if (user.role === SystemRole.INITIATOR && expense.initiatorId._id.toString() !== user.id) {
    throw new Error("Forbidden: You do not have permission to view this request.");
  }
  if (user.role === SystemRole.APPROVER && expense.departmentId._id.toString() !== user.departmentId) {
    throw new Error("Forbidden: You do not have permission to view this request.");
  }

  return NextResponse.json({ success: true, expense });
});
