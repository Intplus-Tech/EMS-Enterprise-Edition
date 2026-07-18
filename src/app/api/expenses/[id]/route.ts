import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { ExpenseRequest } from "../../../../models/ExpenseRequest";
import { authenticate } from "../../../../middlewares/auth";
import { withErrorHandling } from "../../../../middlewares/errors";
import { SystemRole } from "../../../../enums/roles";
import { RequestStatus } from "../../../../enums/statuses";
import { ExpenseInitiateSchema } from "../../../../validators/validation";
import { LoggerService } from "../../../../domains/logs/logger.service";

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

export const PUT = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await connectToDatabase();
  const user = await authenticate(req, [SystemRole.INITIATOR, SystemRole.ADMIN]);
  const { id } = await params;

  const expense = await ExpenseRequest.findById(id);
  if (!expense) {
    throw new Error("Request not found");
  }

  // Security: Only original initiator (or admin) can update the request
  if (user.role === SystemRole.INITIATOR && expense.initiatorId.toString() !== user.id) {
    throw new Error("Forbidden: You do not have permission to update this request.");
  }

  // Check state: Only DRAFT or RETURNED requests can be updated
  if (expense.status !== RequestStatus.DRAFT && expense.status !== RequestStatus.RETURNED) {
    throw new Error("Forbidden: Only draft or returned requests can be updated.");
  }

  const body = await req.json();
  const validatedData = ExpenseInitiateSchema.parse(body);

  // Update request fields
  expense.category = validatedData.category;
  expense.description = validatedData.description;
  expense.amount = validatedData.amount;
  expense.supportingDocument = validatedData.supportingDocument;
  expense.vendorName = validatedData.vendorName;
  expense.vendorBankDetails = {
    accountNumber: validatedData.vendorBankDetails.accountNumber,
    bankName: validatedData.vendorBankDetails.bankName,
    accountName: validatedData.vendorBankDetails.accountName,
  };
  expense.requiredPaymentDate = new Date(validatedData.requiredPaymentDate);

  await expense.save();

  // Log audit
  const logActor = { id: user.id, name: user.name, role: user.role };
  await LoggerService.logAudit(
    "EXPENSE_UPDATED",
    `Request ${expense.requestNumber} details updated`,
    { requestId: expense._id },
    logActor
  );

  return NextResponse.json({ success: true, expense });
});

