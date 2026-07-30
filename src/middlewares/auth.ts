import { NextRequest } from "next/server";
import { AuthService } from "../domains/auth/auth.service";
import { PermissionService } from "../domains/permissions/permission.service";
import { SystemRole } from "../enums/roles";
import { PermissionAction, PermissionResource } from "../enums/permissions";

export interface AuthenticatedRequestState {
  id: string;
  email: string;
  name: string;
  role: SystemRole;
  departmentId: string | null;
}

/**
 * Helper to authenticate and authorize Next.js API Routes.
 * Reads the token from the "session" cookie or "Authorization" header.
 */
export async function authenticate(
  req: NextRequest,
  allowedRoles?: SystemRole[]
): Promise<AuthenticatedRequestState> {
  // 1. Get token from cookies or Authorization header
  let token = req.cookies.get("session")?.value;

  if (!token) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    throw new Error("Unauthorized: No session token provided.");
  }

  // 2. Decode and verify the token
  const decoded = AuthService.verifyToken(token);
  if (!decoded) {
    throw new Error("Unauthorized: Invalid or expired session token.");
  }

  // 3. Role authorization check
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(decoded.role as SystemRole)) {
      throw new Error(`Forbidden: Role '${decoded.role}' does not have permission to access this resource.`);
    }
  }

  return {
    id: decoded.id,
    email: decoded.email,
    name: decoded.name,
    role: decoded.role as SystemRole,
    departmentId: decoded.departmentId,
  };
}

/**
 * Authenticates, then checks the caller's role against the admin-editable
 * permissions matrix. Prefer this over a hardcoded `allowedRoles` list for
 * anything an admin is expected to be able to re-delegate from the UI — the
 * grid on screen and the guard here resolve to the same stored grants.
 */
export async function requirePermission(
  req: NextRequest,
  resource: PermissionResource,
  action: PermissionAction
): Promise<AuthenticatedRequestState> {
  const user = await authenticate(req);

  const permitted = await PermissionService.can(user.role, resource, action);
  if (!permitted) {
    throw new Error(
      `Forbidden: Role '${user.role}' is not permitted to ${action} ${resource}.`
    );
  }

  return user;
}
