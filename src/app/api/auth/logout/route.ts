import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "../../../../middlewares/errors";
import { AuthService } from "../../../../domains/auth/auth.service";

export const POST = withErrorHandling(async (req: NextRequest) => {
  // Release the account's active session so the next sign-in is not treated as
  // a second device. Best-effort and deliberately unauthenticated: an expired
  // or displaced token must still be able to clear its own cookie, so a token
  // that no longer verifies simply skips this step rather than failing logout.
  const token = req.cookies.get("session")?.value;
  if (token) {
    const decoded = AuthService.verifyToken(token);
    if (decoded) {
      // Scoped to the caller's own session id, so a stale tab signing out
      // cannot release the session of the device that displaced it.
      await AuthService.endSession(decoded.id, decoded.sid);
    }
  }

  const response = NextResponse.json({ success: true, message: "Logged out successfully" });

  // Clear cookie session
  response.cookies.set("session", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/"
  });

  return response;
});
