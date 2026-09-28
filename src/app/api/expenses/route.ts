import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../config/db";
import { ExpenseRequest } from "../../../models/ExpenseRequest";
import { Department } from "../../../models/Department";
import { ExpenseService } from "../../../domains/expense/expense.service";
import { scopeForFinanceManager } from "../../../domains/expense/finance-manager.view";
import {
  isVisibleToFinanceOfficer,
  statusScopeForRole,
} from "../../../domains/expense/visibility";
import { authenticate } from "../../../middlewares/auth";
import { withErrorHandling } from "../../../middlewares/errors";
import { ExpenseInitiateSchema } from "../../../validators/validation";
import {
  WorkflowService,
  WorkflowStep,
  resolveActiveStep,
} from "../../../domains/workflow/workflow.service";
import { SystemRole } from "../../../enums/roles";
import { RequestStatus } from "../../../enums/statuses";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  const user = await authenticate(req);
  
  let query: any = {};
  
  // Role-based visibility controls:
  // - Initiator: Only see requests raised by themselves
  // - Approver: Only see requests matching their own department
  // - Finance Officer: their own approval step plus everything downstream of it
  // - Finance Manager: only requests that have cleared approval and are in (or
  //   through) the payment pipeline. They release the cash but do not rule on
  //   the spend, so anything still in — or refused by — the approval chain is
  //   outside their remit. They used to receive every request in the
  //   organisation, including drafts and rejections they can do nothing with.
  //   Enforced here rather than in the screen's tab filters, which are cosmetic
  //   and cannot stop a direct call to this route.
  // - Finance Head / Admin: all requests across the org
  const statusScope = statusScopeForRole(user.role);

  if (user.role === SystemRole.INITIATOR) {
    query.initiatorId = user.id;
  } else if (user.role === SystemRole.APPROVER) {
    query.departmentId = user.departmentId;
  } else if (statusScope) {
    query.status = { $in: statusScope };
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

  const found = await ExpenseRequest.find(query)
    .populate("departmentId", "name")
    .populate("initiatorId", "name email")
    .sort({ createdAt: -1 });

  // PENDING_APPROVAL now covers two different queues — the departmental
  // approver at step 0 and the Finance Officer at step 1 — so the raw status
  // no longer says who a request is actually waiting on. The active step is
  // resolved once here rather than the UI guessing from `currentStepIndex`,
  // which would be wrong the moment an admin reconfigures the chain. The role
  // travels with the name: the bell used to treat every PENDING_APPROVAL row as
  // the approver's, so they were told a request sitting with the Finance
  // Officer was "awaiting your review".
  const workflow = await WorkflowService.getActiveWorkflow();
  const steps = workflow.steps as WorkflowStep[];

  let expenses = found.map((expense) => {
    const json = expense.toJSON();
    if (json.status === RequestStatus.PENDING_APPROVAL) {
      // `resolveActiveStep`, not `steps[currentStepIndex]`: the index is the
      // next candidate, and a step below its `minAmount` threshold is skipped.
      const active = resolveActiveStep(steps, expense);
      json.currentStageName = active?.step.stepName;
      json.currentStageRole = active?.step.role;
    }
    return json;
  });

  // The officer's status scope admits every PENDING_APPROVAL request; only the
  // ones resting on their own step are theirs to act on. Applied after the
  // active step is resolved, since that is what distinguishes them.
  if (user.role === SystemRole.FINANCE_OFFICER) {
    expenses = expenses.filter((e) => isVisibleToFinanceOfficer(e.status, e.currentStageRole));
  }

  // The Finance Manager releases cash against an instruction that has already
  // been approved and audited; they do not re-open the commercial decision. So
  // they receive only what a release needs — who raised it, which department,
  // the payee account, the description, the amount and the justifications — and
  // not the vendor, category, budget position or approval history. Applied here
  // rather than in the screens, which cannot stop a direct call to this route.
  if (user.role === SystemRole.FINANCE_MANAGER) {
    return NextResponse.json({
      success: true,
      expenses: expenses.map((e) => scopeForFinanceManager(e)),
    });
  }

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
