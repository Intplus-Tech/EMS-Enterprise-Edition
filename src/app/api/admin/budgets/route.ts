import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { requirePermission } from "../../../../middlewares/auth";
import { withErrorHandling } from "../../../../middlewares/errors";
import { BudgetService } from "../../../../domains/budget/budget.service";
import { BudgetPeriodUpsertSchema } from "../../../../validators/validation";
import { PermissionAction, PermissionResource } from "../../../../enums/permissions";

/**
 * Departmental spend summaries plus the configured periods.
 *
 * Previously guarded by a bare `authenticate(req)`, which let any signed-in
 * Initiator read every department's allocation. Now gated on VIEW of
 * DEPARTMENTAL_BUDGETS, which Initiators are not granted.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  await requirePermission(req, PermissionResource.DEPARTMENTAL_BUDGETS, PermissionAction.VIEW);

  const [budgets, periods] = await Promise.all([
    BudgetService.getDepartmentalSpendSummaries(),
    BudgetService.listPeriods(),
  ]);

  return NextResponse.json({ success: true, budgets, periods });
});

/** Set Budget / Add Budget Item modals. Upserts the department's period. */
export const POST = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  const actor = await requirePermission(
    req,
    PermissionResource.DEPARTMENTAL_BUDGETS,
    PermissionAction.EDIT
  );

  const payload = BudgetPeriodUpsertSchema.parse(await req.json());
  await BudgetService.upsertBudgetPeriod(payload, {
    id: actor.id,
    name: actor.name,
    role: actor.role,
  });

  const [budgets, periods] = await Promise.all([
    BudgetService.getDepartmentalSpendSummaries(),
    BudgetService.listPeriods(),
  ]);

  return NextResponse.json({ success: true, budgets, periods });
});
