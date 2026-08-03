import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../config/db";
import { requirePermission } from "../../../../../middlewares/auth";
import { withErrorHandling } from "../../../../../middlewares/errors";
import { DepartmentService } from "../../../../../domains/department/department.service";
import { DepartmentStatusSchema, DepartmentUpdateSchema } from "../../../../../validators/validation";
import { PermissionAction, PermissionResource } from "../../../../../enums/permissions";

type RouteContext = { params: Promise<{ id: string }> };

export const PUT = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  await connectToDatabase();
  const actor = await requirePermission(req, PermissionResource.DEPARTMENTS, PermissionAction.EDIT);
  const { id } = await params;

  const payload = DepartmentUpdateSchema.parse(await req.json());
  const department = await DepartmentService.update(id, payload, {
    id: actor.id,
    name: actor.name,
    role: actor.role,
  });

  return NextResponse.json({
    success: true,
    department: {
      id: department._id.toString(),
      name: department.name,
      description: department.description || "",
      headUserId: department.headUserId?.toString() ?? null,
      isActive: department.isActive !== false,
    },
  });
});

/**
 * Restore — the action on a pending-deletion row. Split from PUT so undoing a
 * deletion cannot clear the department's other fields, and kept on EDIT rather
 * than DELETE because putting a department back is not a destructive act.
 */
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  await connectToDatabase();
  const actor = await requirePermission(req, PermissionResource.DEPARTMENTS, PermissionAction.EDIT);
  const { id } = await params;

  const { isActive } = DepartmentStatusSchema.parse(await req.json());
  if (!isActive) {
    // Deleting cascades and must go through the DELETE permission.
    throw new Error("Invalid request: use DELETE to remove a department.");
  }

  const restored = await DepartmentService.restore(id, {
    id: actor.id,
    name: actor.name,
    role: actor.role,
  });

  return NextResponse.json({ success: true, ...restored });
});

/** Cascading delete — see `DepartmentService.beginDeletion` for what it touches. */
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  await connectToDatabase();
  const actor = await requirePermission(
    req,
    PermissionResource.DEPARTMENTS,
    PermissionAction.DELETE
  );
  const { id } = await params;

  const deleted = await DepartmentService.beginDeletion(id, {
    id: actor.id,
    name: actor.name,
    role: actor.role,
  });

  return NextResponse.json({ success: true, ...deleted });
});
