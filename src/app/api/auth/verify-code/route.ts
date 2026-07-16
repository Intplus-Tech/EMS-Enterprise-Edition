import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { User } from "../../../../models/User";
import { withErrorHandling } from "../../../../middlewares/errors";

export const POST = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();

  const body = await req.json();
  const { email, code } = body;

  if (!email || !code) {
    throw new Error("Invalid request: Email and code are required.");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error("User not found.");
  }

  if (!user.resetCode || user.resetCode !== code) {
    throw new Error("Invalid verification code.");
  }

  if (user.resetCodeExpires && new Date(user.resetCodeExpires) < new Date()) {
    throw new Error("Verification code has expired. Please request a new code.");
  }

  return NextResponse.json({
    success: true,
    message: "Verification code validated successfully."
  });
});
