import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../config/db";
import { requirePermission } from "../../../../../middlewares/auth";
import { withErrorHandling } from "../../../../../middlewares/errors";
import { UserService } from "../../../../../domains/user/user.service";
import { UserStatusSchema, UserUpdateSchema } from "../../../../../validators/validation";
import { PermissionAction, PermissionResource } from "../../../../../enums/permissions";

type RouteContext = { params: Promise<{ id: string }> };

/** Edit User Profile modal. */
export const PUT = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  await connectToDatabase();
  const actor = await requirePermission(req, PermissionResource.USERS, PermissionAction.EDIT);
  const { id } = await params;

  const payload = UserUpdateSchema.parse(await req.json());
  const user = await UserService.update(id, payload, {
    id: actor.id,
    name: actor.name,
    role: actor.role,
  });

  return NextResponse.json({
    success: true,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      departmentId: user.departmentId?.toString() ?? null,
      officialContact: user.officialContact ?? "",
      personalContact: user.personalContact ?? "",
      avatar: user.avatar ?? "",
    },
  });
});

/** Suspend / reactivate — separate from PUT so it needs only EDIT on a boolean. */
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  await connectToDatabase();
  const actor = await requirePermission(req, PermissionResource.USERS, PermissionAction.EDIT);
  const { id } = await params;

  const { isActive } = UserStatusSchema.parse(await req.json());
  const user = await UserService.setActive(id, isActive, {
    id: actor.id,
    name: actor.name,
    role: actor.role,
  });

  return NextResponse.json({
    success: true,
    user: { id: user._id.toString(), name: user.name, isActive: user.isActive },
  });
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  await connectToDatabase();
  const actor = await requirePermission(req, PermissionResource.USERS, PermissionAction.DELETE);
  const { id } = await params;

  // Self-deletion would invalidate the caller's own session mid-request.
  if (id === actor.id) {
    throw new Error("Forbidden: you cannot delete your own account.");
  }

  // In-flight requests are cancelled by the removal rather than blocking it;
  // the count comes back so the admin is told what the deletion took with it.
  const removed = await UserService.remove(id, {
    id: actor.id,
    name: actor.name,
    role: actor.role,
  });

  return NextResponse.json({ success: true, ...removed });
});
