import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "../../../../domains/auth/auth.service";
import { LoginSchema } from "../../../../validators/validation";
import { withErrorHandling } from "../../../../middlewares/errors";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const credentials = LoginSchema.parse(body);

  const { token, user } = await AuthService.login(credentials.email, credentials.password);

  const response = NextResponse.json({ success: true, user });

  // Set secure HTTP-only cookie for sessions
  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/"
  });

  return response;
});
