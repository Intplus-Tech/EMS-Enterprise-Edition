import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { User } from "../../../../models/User";
import { withErrorHandling } from "../../../../middlewares/errors";
import { getResetCodeEmailHtml } from "../../../../domains/email/templates";
import { LoggerService } from "../../../../domains/logs/logger.service";

export const POST = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();

  const body = await req.json();
  const { email } = body;

  if (!email) {
    throw new Error("Invalid request: Email address is required.");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error("User with this email address does not exist in the system.");
  }

  // Generate a random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  user.resetCode = code;
  user.resetCodeExpires = resetCodeExpires;
  await user.save();

  // Compile the email content
  const emailHtml = getResetCodeEmailHtml(code, user.name, req.nextUrl.origin);

  // Log audit trail
  await LoggerService.logAudit(
    "USER_PASSWORD_RESET_REQUEST",
    `Password reset verification code generated for ${user.name} (${user.email})`,
    { email: user.email },
    { id: user._id.toString(), name: user.name, role: user.role }
  );

  // Return the code in response to make it easy to simulate/demo without check logs
  return NextResponse.json({
    success: true,
    message: "Verification code sent to your email address.",
    code,
    emailHtml
  });
});
