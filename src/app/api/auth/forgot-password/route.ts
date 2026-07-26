import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "../../../../middlewares/errors";
import { AuthService } from "../../../../domains/auth/auth.service";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const { email } = body;

  if (!email) {
    throw new Error("Invalid request: Email address is required.");
  }

  await AuthService.requestPasswordReset(email, req.nextUrl.origin);

  return NextResponse.json({
    success: true,
    message: "If your email is registered in our system, a verification code has been dispatched.",
  });
});
