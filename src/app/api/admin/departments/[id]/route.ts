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

/** Archive / restore — split from PUT so a status flip cannot clear other fields. */
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  await connectToDatabase();
  const actor = await requirePermission(req, PermissionResource.DEPARTMENTS, PermissionAction.EDIT);
  const { id } = await params;

  const { isActive } = DepartmentStatusSchema.parse(await req.json());
  const log = { id: actor.id, name: actor.name, role: actor.role };

  const result = isActive
    ? await DepartmentService.restore(id, log)
    : await DepartmentService.archive(id, log);

  return NextResponse.json({ success: true, ...result });
});

/** Deletion is an archive — see `DepartmentService.archive` for why. */
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  await connectToDatabase();
  const actor = await requirePermission(
    req,
    PermissionResource.DEPARTMENTS,
    PermissionAction.DELETE
  );
  const { id } = await params;

  const archived = await DepartmentService.archive(id, {
    id: actor.id,
    name: actor.name,
    role: actor.role,
  });

  return NextResponse.json({ success: true, ...archived });
});
