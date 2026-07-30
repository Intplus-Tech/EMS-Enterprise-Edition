import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { requirePermission } from "../../../../middlewares/auth";
import { withErrorHandling } from "../../../../middlewares/errors";
import { PermissionService } from "../../../../domains/permissions/permission.service";
import { LoggerService } from "../../../../domains/logs/logger.service";
import { RolePermissionUpdateSchema } from "../../../../validators/validation";
import { AuditAction } from "../../../../enums/auditActions";
import { PermissionAction, PermissionResource } from "../../../../enums/permissions";

/** Backs the Admin role permissions matrix. */
export const GET = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  await requirePermission(req, PermissionResource.ROLE_DEFINITIONS, PermissionAction.VIEW);

  const roles = await PermissionService.listAll();
  return NextResponse.json({ success: true, roles });
});

export const PUT = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  const actor = await requirePermission(
    req,
    PermissionResource.ROLE_DEFINITIONS,
    PermissionAction.EDIT
  );

  const payload = RolePermissionUpdateSchema.parse(await req.json());

  await PermissionService.updateRole(
    payload.role,
    payload.grants,
    payload.description,
    payload.isActive
  );

  await LoggerService.logAudit(
    AuditAction.ROLE_PERMISSIONS_UPDATED,
    `Permissions matrix updated for role '${payload.role}'`,
    { role: payload.role, grants: payload.grants },
    { id: actor.id, name: actor.name, role: actor.role }
  );

  // Return the whole matrix so the screen stays consistent after a save.
  const roles = await PermissionService.listAll();
  return NextResponse.json({ success: true, roles });
});
