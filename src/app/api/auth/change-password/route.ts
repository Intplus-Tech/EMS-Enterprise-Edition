import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { User } from "../../../../models/User";
import { authenticate } from "../../../../middlewares/auth";
import { withErrorHandling } from "../../../../middlewares/errors";
import { AuthService } from "../../../../domains/auth/auth.service";
import { LoggerService } from "../../../../domains/logs/logger.service";

export const POST = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  const sessionUser = await authenticate(req);

  const body = await req.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    throw new Error("Current password and new password are required.");
  }

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters long.");
  }

  const user = await User.findById(sessionUser.id);
  if (!user) {
    throw new Error("User not found.");
  }

  // Verify current password
  const isValid = await AuthService.comparePassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error("Incorrect current password.");
  }

  // Hash and save new password
  user.passwordHash = await AuthService.hashPassword(newPassword);
  await user.save();

  // Log audit
  const logActor = { id: user._id.toString(), name: user.name, role: user.role };
  await LoggerService.logAudit(
    "USER_PASSWORD_CHANGE",
    `Password successfully changed by user ${user.name}`,
    { email: user.email },
    logActor
  );

  return NextResponse.json({
    success: true,
    message: "Password changed successfully."
  });
});
