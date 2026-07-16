import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { User } from "../../../../models/User";
import { withErrorHandling } from "../../../../middlewares/errors";
import { AuthService } from "../../../../domains/auth/auth.service";
import { LoggerService } from "../../../../domains/logs/logger.service";

export const POST = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();

  const body = await req.json();
  const { email, code, password } = body;

  if (!email || !code || !password) {
    throw new Error("Invalid request: Email, code, and password are required.");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error("User not found.");
  }

  // Verify the code again to prevent bypassing verify-code
  if (!user.resetCode || user.resetCode !== code) {
    throw new Error("Invalid or expired verification code session.");
  }

  if (user.resetCodeExpires && new Date(user.resetCodeExpires) < new Date()) {
    throw new Error("Verification code session has expired. Please start over.");
  }

  // Update password and clear reset fields
  user.passwordHash = await AuthService.hashPassword(password);
  user.resetCode = undefined;
  user.resetCodeExpires = undefined;
  await user.save();

  // Log audit trail
  await LoggerService.logAudit(
    "USER_PASSWORD_RESET_SUCCESS",
    `Password successfully updated for user ${user.name} (${user.email})`,
    { email: user.email },
    { id: user._id.toString(), name: user.name, role: user.role }
  );

  return NextResponse.json({
    success: true,
    message: "Password reset successfully. You can now login with your new password."
  });
});
