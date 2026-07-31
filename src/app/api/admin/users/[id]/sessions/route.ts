import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../config/db";
import { requirePermission } from "../../../../../../middlewares/auth";
import { withErrorHandling } from "../../../../../../middlewares/errors";
import { UserService } from "../../../../../../domains/user/user.service";
import { PermissionAction, PermissionResource } from "../../../../../../enums/permissions";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Force Log Out — ends every active session for a user by advancing their
 * revocation watermark. Takes effect on the target's very next request.
 */
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  await connectToDatabase();
  const actor = await requirePermission(req, PermissionResource.USERS, PermissionAction.EDIT);
  const { id } = await params;

  // Revoking your own sessions would sign you out mid-action; use Logout.
  if (id === actor.id) {
    throw new Error("Forbidden: use Logout to end your own session.");
  }

  const result = await UserService.revokeSessions(id, {
    id: actor.id,
    name: actor.name,
    role: actor.role,
  });

  return NextResponse.json({ success: true, ...result });
});
