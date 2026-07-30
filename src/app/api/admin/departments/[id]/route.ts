import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../config/db";
import { requirePermission } from "../../../../../middlewares/auth";
import { withErrorHandling } from "../../../../../middlewares/errors";
import { DepartmentService } from "../../../../../domains/department/department.service";
import { DepartmentUpdateSchema } from "../../../../../validators/validation";
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

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  await connectToDatabase();
  const actor = await requirePermission(
    req,
    PermissionResource.DEPARTMENTS,
    PermissionAction.DELETE
  );
  const { id } = await params;

  const removed = await DepartmentService.remove(id, {
    id: actor.id,
    name: actor.name,
    role: actor.role,
  });

  return NextResponse.json({ success: true, ...removed });
});
