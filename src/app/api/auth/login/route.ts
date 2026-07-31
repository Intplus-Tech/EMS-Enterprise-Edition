import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "../../../../domains/auth/auth.service";
import { LoginSchema } from "../../../../validators/validation";
import { withErrorHandling } from "../../../../middlewares/errors";
import { ENV } from "../../../../config/env";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const credentials = LoginSchema.parse(body);

  const { token, user, expiresInSeconds } = await AuthService.login(
    credentials.email,
    credentials.password,
    credentials.rememberDevice
  );

  const response = NextResponse.json({ success: true, user });

  // Set secure HTTP-only cookie for sessions
  response.cookies.set("session", token, {
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: "strict",
    maxAge: expiresInSeconds,
    path: "/"
  });

  return response;
});
