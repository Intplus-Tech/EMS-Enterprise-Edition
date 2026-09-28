import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../middlewares/auth";
import { withErrorHandling } from "../../../../middlewares/errors";
import { connectToDatabase } from "../../../../config/db";
import { User } from "../../../../models/User";
import { ProfileUpdateSchema } from "../../../../validators/validation";

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

  // Validated at the boundary: the body used to be destructured and assigned
  // straight onto the document, so a blank name or email overwrote the account's
  // own identity, and `role`/`departmentId` — which this endpoint must never
  // accept from the user themselves — were only ignored by accident.
  const { name, email, officialContact, personalContact, avatar } =
    ProfileUpdateSchema.parse(await req.json());

  const user = await User.findById(sessionUser.id);
  if (!user) {
    throw new Error("User not found");
  }

  // Email is the login identifier and is uniquely indexed, so a collision must
  // be reported as a conflict rather than surfacing as a driver-level error.
  if (email !== undefined && email !== user.email) {
    const taken = await User.findOne({ email, _id: { $ne: user._id } }).select("_id");
    if (taken) {
      throw new Error("That email address is already registered to another account.");
    }
    user.email = email;
  }

  if (name !== undefined) user.name = name;
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
