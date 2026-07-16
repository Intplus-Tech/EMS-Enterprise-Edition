import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "../../../../config/db";
import { User } from "../../../../models/User";
import { AuthService } from "../../../../domains/auth/auth.service";
import { LoggerService } from "../../../../domains/logs/logger.service";
import { withErrorHandling } from "../../../../middlewares/errors";

const JWT_SECRET = process.env.JWT_SECRET || "spendflow-secure-jwt-secret-key-12345";

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
    throw new Error("This invitation has expired (limit 48 hours). Please contact your administrator.");
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

  await user.save();

  // 2. Generate a valid session JWT for automatic login
  const sessionToken = jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId?.toString() || null,
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

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
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/"
  });

  return response;
});
