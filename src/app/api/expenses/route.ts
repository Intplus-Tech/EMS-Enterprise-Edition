import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../config/db";
import { ExpenseRequest } from "../../../models/ExpenseRequest";
import { Department } from "../../../models/Department";
import { ExpenseService } from "../../../domains/expense/expense.service";
import { authenticate } from "../../../middlewares/auth";
import { withErrorHandling } from "../../../middlewares/errors";
import { ExpenseInitiateSchema } from "../../../validators/validation";
import { SystemRole } from "../../../enums/roles";
import { POST_APPROVAL_STATUSES } from "../../../enums/statuses";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  const user = await authenticate(req);
  
  let query: any = {};
  
  // Role-based visibility controls:
  // - Initiator: Only see requests raised by themselves
  // - Approver: Only see requests matching their own department
  // - Finance Officer: Only requests that have cleared approval — they audit
  //   payment payloads, so anything still in (or refused by) the approval chain
  //   is outside their remit. Enforced here rather than in the screen's tab
  //   filters, which are cosmetic and cannot stop a direct call to this route.
  // - Finance Head / Finance Manager / Admin: all requests across the org
  if (user.role === SystemRole.INITIATOR) {
    query.initiatorId = user.id;
  } else if (user.role === SystemRole.APPROVER) {
    query.departmentId = user.departmentId;
  } else if (user.role === SystemRole.FINANCE_OFFICER) {
    query.status = { $in: POST_APPROVAL_STATUSES };
  }

  // Requests belonging to a deleted department are cold storage: they stay in
  // the database, the audit trail and reporting, but drop out of the active
  // dashboard, as the Delete Department modal warns. Restoring the department
  // brings them back. Composed with $and so the exclusion cannot displace the
  // role scope above — overwriting `departmentId` would widen an approver's
  // visibility to the whole organisation.
  const purgedDepartmentIds = await Department.find({
    pendingDeletion: { $exists: true },
  }).distinct("_id");

  if (purgedDepartmentIds.length > 0) {
    query = { $and: [query, { departmentId: { $nin: purgedDepartmentIds } }] };
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
