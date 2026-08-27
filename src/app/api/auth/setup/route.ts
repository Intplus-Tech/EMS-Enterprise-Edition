import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { User } from "../../../../models/User";
import { AuthService } from "../../../../domains/auth/auth.service";
import { LoggerService } from "../../../../domains/logs/logger.service";
import { withErrorHandling } from "../../../../middlewares/errors";
import { ENV } from "../../../../config/env";

// GET: Validate invitation token and return email address
export const GET = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    throw new Error("Invalid request: Invitation token is required.");
  }

  const user = await User.findOne({ inviteToken: token });
  if (!user) {
    throw new Error("Invalid or expired invitation token.");
  }

  if (user.inviteExpires && new Date(user.inviteExpires) < new Date()) {
    throw new Error("This invitation has expired (limit 7 days). Please contact your administrator.");
  }

  return NextResponse.json({
    success: true,
    email: user.email,
    name: user.name,
    role: user.role
  });
});

// POST: Set password and activate account
export const POST = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();

  const body = await req.json();
  const { token, password } = body;

  if (!token || !password) {
    throw new Error("Invalid request: Token and password are required.");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const user = await User.findOne({ inviteToken: token });
  if (!user) {
    throw new Error("Invalid or expired invitation token.");
  }

  if (user.inviteExpires && new Date(user.inviteExpires) < new Date()) {
    throw new Error("This invitation has expired. Please contact your administrator.");
  }

  // 1. Hash the new password and mark account as active
  user.passwordHash = await AuthService.hashPassword(password);
  user.isActive = true;
  user.inviteToken = undefined;
  user.inviteExpires = undefined;

  // 2. Generate a valid session JWT for automatic login.
  //
  // Through `issueSession` rather than signing here, so the account claims its
  // one active session exactly as a sign-in does. A hand-rolled token carried
  // no session id and would be rejected on its very next request. It also
  // persists the password and activation set above.
  const { token: sessionToken, expiresInSeconds } = await AuthService.issueSession(user);

  // 3. Log audit event
  await LoggerService.logAudit(
    "USER_ACTIVATED",
    `User ${user.name} (${user.email}) activated their account and set their password.`,
    { email: user.email },
    { id: user._id.toString(), name: user.name, role: user.role as any }
  );

  // 4. Return success response and set secure HTTP-only cookie
  const response = NextResponse.json({
    success: true,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role
    }
  });

  response.cookies.set("session", sessionToken, {
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: "strict",
    maxAge: expiresInSeconds,
    path: "/"
  });

  return response;
});
