import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../config/db";
import { ExpenseRequest } from "../../../../../models/ExpenseRequest";
import { BudgetService } from "../../../../../domains/budget/budget.service";
import { LoggerService } from "../../../../../domains/logs/logger.service";
import { authenticate } from "../../../../../middlewares/auth";
import { withErrorHandling } from "../../../../../middlewares/errors";
import { SystemRole } from "../../../../../enums/roles";
import { RequestStatus } from "../../../../../enums/statuses";

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await connectToDatabase();
  const user = await authenticate(req, [SystemRole.INITIATOR, SystemRole.ADMIN]);
  const { id } = await params;

  const expense = await ExpenseRequest.findById(id);
  if (!expense) {
    throw new Error("Request not found");
  }

  // Security: Only the original initiator (or admin) can cancel/withdraw a request
  if (user.role === SystemRole.INITIATOR && expense.initiatorId.toString() !== user.id) {
    throw new Error("Forbidden: You do not have permission to cancel this request.");
  }

  // Check state: Cannot cancel requests that are already PAID, CLOSED, REJECTED, or CANCELLED
  const terminalStatuses = [
    RequestStatus.PAID,
    RequestStatus.CLOSED,
    RequestStatus.REJECTED,
    RequestStatus.CANCELLED
  ];
  if (terminalStatuses.includes(expense.status as RequestStatus)) {
    throw new Error(`Forbidden: Cannot cancel a request in '${expense.status}' status.`);
  }

  const previousStatus = expense.status;

  // Unlock budget if it was currently locked (pending approval / processing stages)
  const lockedStatuses = [
    RequestStatus.PENDING_APPROVAL,
    RequestStatus.APPROVED,
    RequestStatus.SENT_TO_FINANCE,
    RequestStatus.UPLOADED_TO_BANK,
    RequestStatus.AWAITING_RELEASE
  ];
  if (lockedStatuses.includes(previousStatus as RequestStatus)) {
    await BudgetService.unlockBudget(expense._id.toString());
  }

  // Update status and history
  expense.status = RequestStatus.CANCELLED;
  expense.history.push({
    statusBefore: previousStatus,
    statusAfter: RequestStatus.CANCELLED,
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "Withdraw Request",
    comment: "Withdrawn by initiator",
    timestamp: new Date()
  });

  await expense.save();

  // Log audit trail
  const logActor = { id: user.id, name: user.name, role: user.role };
  await LoggerService.logAudit(
    "EXPENSE_CANCELLED",
    `Request ${expense.requestNumber} was withdrawn by initiator`,
    { requestId: expense._id, previousStatus },
    logActor
  );

  return NextResponse.json({ success: true, expense });
});
