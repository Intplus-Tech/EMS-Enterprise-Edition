import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../config/db";
import { BudgetService } from "../../../../../domains/budget/budget.service";
import { authenticate } from "../../../../../middlewares/auth";
import { withErrorHandling } from "../../../../../middlewares/errors";
import { BudgetItemAttachSchema } from "../../../../../validators/validation";
import { SystemRole } from "../../../../../enums/roles";

/**
 * The budget items an approver can book a request against, with live headroom
 * so the picker can show which ones actually cover it.
 */
export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await connectToDatabase();
    await authenticate(req, [SystemRole.APPROVER, SystemRole.FINANCE_HEAD, SystemRole.ADMIN]);
    const { id } = await params;

    const items = await BudgetService.getItemsForRequest(id);
    return NextResponse.json({ success: true, items });
  }
);

/**
 * Attaches the request to a budget item. Restricted to the approver, whose job
 * this is in the flow — finance roles inherit the choice rather than making it.
 */
export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await connectToDatabase();
    const user = await authenticate(req, [SystemRole.APPROVER, SystemRole.ADMIN]);
    const { id } = await params;

    const { budgetItemId } = BudgetItemAttachSchema.parse(await req.json());

    const request = await BudgetService.attachRequestToItem(id, budgetItemId, {
      id: user.id,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json({ success: true, request });
  }
);
