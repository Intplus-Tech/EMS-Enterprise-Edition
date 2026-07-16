import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "../../../../middlewares/errors";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  
  // Clear cookie session
  response.cookies.set("session", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/"
  });

  return response;
});
