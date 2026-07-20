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
      officialContact: user.officialContact || null,
      personalContact: user.personalContact || null,
      avatar: user.avatar || null,
    }
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  const sessionUser = await authenticate(req);

  const body = await req.json();
  const { name, email, officialContact, personalContact, avatar } = body;

  const user = await User.findById(sessionUser.id);
  if (!user) {
    throw new Error("User not found");
  }

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (officialContact !== undefined) user.officialContact = officialContact;
  if (personalContact !== undefined) user.personalContact = personalContact;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();

  return NextResponse.json({
    success: true,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      officialContact: user.officialContact || null,
      personalContact: user.personalContact || null,
      avatar: user.avatar || null,
    }
  });
});
