import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../middlewares/auth";
import { withErrorHandling } from "../../../../middlewares/errors";
import { connectToDatabase } from "../../../../config/db";
import { User } from "../../../../models/User";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  const sessionUser = await authenticate(req);
  
  const user = await User.findById(sessionUser.id).populate("departmentId");
  if (!user) {
    throw new Error("User not found");
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      departmentName: (user.departmentId as any)?.name || null,
      departmentId: user.departmentId?._id?.toString() || null,
    }
  });
});
