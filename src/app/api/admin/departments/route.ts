import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { requirePermission } from "../../../../middlewares/auth";
import { withErrorHandling } from "../../../../middlewares/errors";
import { DepartmentService } from "../../../../domains/department/department.service";
import { DepartmentCreateSchema } from "../../../../validators/validation";
import { PermissionAction, PermissionResource } from "../../../../enums/permissions";

/** Department directory for the Admin Department Management screen. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  await requirePermission(req, PermissionResource.DEPARTMENTS, PermissionAction.VIEW);

  const departments = await DepartmentService.list();
  return NextResponse.json({ success: true, departments });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  const actor = await requirePermission(
    req,
    PermissionResource.DEPARTMENTS,
    PermissionAction.CREATE
  );

  const payload = DepartmentCreateSchema.parse(await req.json());
  const department = await DepartmentService.create(payload, {
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
      isPendingDeletion: false,
      usersCount: 0,
    },
  });
});
