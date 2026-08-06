import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { ExpenseRequest } from "../../../../models/ExpenseRequest";
import { authenticate } from "../../../../middlewares/auth";
import { withErrorHandling } from "../../../../middlewares/errors";
import { SystemRole } from "../../../../enums/roles";
import { POST_APPROVAL_STATUSES, RequestStatus } from "../../../../enums/statuses";
import { ExpenseInitiateSchema } from "../../../../validators/validation";
import { scopeForFinanceManager } from "../../../../domains/expense/finance-manager.view";
import { LoggerService } from "../../../../domains/logs/logger.service";
import { AuditAction } from "../../../../enums/auditActions";

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
  // Both finance processing roles pick the pipeline up after approval. Without
  // this the list filter could be stepped around by requesting an id directly.
  if (
    (user.role === SystemRole.FINANCE_OFFICER || user.role === SystemRole.FINANCE_MANAGER) &&
    !POST_APPROVAL_STATUSES.includes(expense.status)
  ) {
    throw new Error("Forbidden: You do not have permission to view this request.");
  }

  // Same permitted field set as the list route — fetching by id must not be a
  // way around the Finance Manager's restricted view.
  if (user.role === SystemRole.FINANCE_MANAGER) {
    return NextResponse.json({ success: true, expense: scopeForFinanceManager(expense) });
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

  // Only replace the document set when the caller sent one. A resubmission that
  // just revises the justification must not silently drop the existing files,
  // and attachments added by reviewers are managed via /attachments.
  if (validatedData.supportingDocuments && validatedData.supportingDocuments.length > 0) {
    expense.supportingDocuments = validatedData.supportingDocuments.map((doc) => ({
      ...doc,
      uploadedById: user.id,
      uploadedByName: user.name,
      uploadedAt: new Date(),
    }));
  } else if (validatedData.supportingDocument && expense.supportingDocuments.length === 0) {
    // Legacy single-document payload against a record with no attachment list.
    expense.supportingDocuments = [
      {
        name: validatedData.supportingDocument,
        url: validatedData.supportingDocument,
        uploadedById: user.id,
        uploadedByName: user.name,
        uploadedAt: new Date(),
      },
    ];
  }

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
    AuditAction.EXPENSE_UPDATED,
    `Request ${expense.requestNumber} details updated`,
    { requestId: expense._id },
    logActor
  );

  return NextResponse.json({ success: true, expense });
});

