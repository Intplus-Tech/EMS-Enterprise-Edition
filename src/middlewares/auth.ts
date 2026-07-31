import { NextRequest } from "next/server";
import { AuthService } from "../domains/auth/auth.service";
import { PermissionService } from "../domains/permissions/permission.service";
import { SystemRole } from "../enums/roles";
import { PermissionAction, PermissionResource } from "../enums/permissions";
import { connectToDatabase } from "../config/db";
import { User } from "../models/User";

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

  // 3. Revocation check.
  //
  // JWTs are self-contained, so a suspended or force-signed-out user would keep
  // working until their 8-hour token expired. Rejecting tokens issued before the
  // account's `sessionsValidFrom` watermark makes "Force Log Out" and account
  // suspension take effect on the very next request.
  await assertSessionNotRevoked(decoded.id, decoded.iat);

  // 4. Role authorization check
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
 * Rejects a token that predates the account's revocation watermark, or that
 * belongs to an account which has since been deactivated or deleted.
 */
async function assertSessionNotRevoked(userId: string, issuedAtSeconds?: number): Promise<void> {
  await connectToDatabase();

  const user = await User.findById(userId).select("isActive sessionsValidFrom").lean();
  if (!user) {
    throw new Error("Unauthorized: The account for this session no longer exists.");
  }
  if (!user.isActive) {
    throw new Error("Unauthorized: This account has been deactivated.");
  }

  if (user.sessionsValidFrom && issuedAtSeconds) {
    // `iat` is whole seconds, so compare at second precision to avoid rejecting
    // a token issued in the same second the watermark was set.
    const issuedAtMs = issuedAtSeconds * 1000;
    if (issuedAtMs < Math.floor(user.sessionsValidFrom.getTime() / 1000) * 1000) {
      throw new Error("Unauthorized: This session has been ended. Please sign in again.");
    }
  }
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
