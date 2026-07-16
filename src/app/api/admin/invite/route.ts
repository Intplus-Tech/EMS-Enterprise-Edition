import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "../../../../config/db";
import { User } from "../../../../models/User";
import { Department } from "../../../../models/Department";
import { authenticate } from "../../../../middlewares/auth";
import { SystemRole } from "../../../../enums/roles";
import { withErrorHandling } from "../../../../middlewares/errors";
import { getInviteEmailHtml } from "../../../../domains/email/templates";
import { LoggerService } from "../../../../domains/logs/logger.service";
import { AuthService } from "../../../../domains/auth/auth.service";

export const POST = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();

  // 1. Authenticate that the actor is an ADMIN
  const actor = await authenticate(req, [SystemRole.ADMIN]);

  // 2. Parse request payload
  const body = await req.json();
  const { email, name, role, departmentId } = body;

  if (!email || !name || !role) {
    throw new Error("Invalid request: name, email, and role are mandatory.");
  }

  // Verify role is valid
  if (!Object.values(SystemRole).includes(role)) {
    throw new Error(`Invalid role: '${role}' is not a recognized system role.`);
  }

  // 3. Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    if (existingUser.isActive) {
      throw new Error(`Invalid request: User with email '${email}' is already active in the system.`);
    } else if (existingUser.inviteToken && existingUser.inviteExpires && existingUser.inviteExpires > new Date()) {
      // Re-inviting (generating new token)
      const inviteToken = crypto.randomUUID();
      existingUser.name = name;
      existingUser.role = role;
      existingUser.departmentId = departmentId || null;
      existingUser.inviteToken = inviteToken;
      existingUser.inviteExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
      await existingUser.save();

      const inviteUrl = `${req.nextUrl.origin}/setup?token=${inviteToken}`;
      const emailHtml = getInviteEmailHtml(inviteUrl, role, name, req.nextUrl.origin);

      await LoggerService.logAudit(
        "USER_RE_INVITED",
        `User invitation re-sent for ${name} (${email}) as ${role}`,
        { email, role },
        { id: actor.id, name: actor.name, role: actor.role }
      );

      return NextResponse.json({
        success: true,
        message: "Invitation re-sent successfully.",
        inviteUrl,
        emailHtml,
        user: {
          id: existingUser._id.toString(),
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role,
          isActive: false
        }
      });
    } else {
      throw new Error(`Invalid request: A pending invitation exists for '${email}' but it may have expired. Clean up or update the user.`);
    }
  }

  // 4. Generate invitation token and expires time
  const inviteToken = crypto.randomUUID();
  const inviteExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  // 5. Create new user with inactive status and placeholder password hash
  const newUser = new User({
    email: email.toLowerCase(),
    name,
    role,
    departmentId: departmentId || null,
    isActive: false,
    passwordHash: await AuthService.hashPassword(crypto.randomUUID()),
    inviteToken,
    inviteExpires
  });

  await newUser.save();

  // 6. Generate the invitation link and compile the email
  const inviteUrl = `${req.nextUrl.origin}/setup?token=${inviteToken}`;
  const emailHtml = getInviteEmailHtml(inviteUrl, role, name, req.nextUrl.origin);

  // 7. Log audit entry
  await LoggerService.logAudit(
    "USER_INVITED",
    `User ${name} (${email}) invited as ${role} by ${actor.name}`,
    { email, role },
    { id: actor.id, name: actor.name, role: actor.role }
  );

  return NextResponse.json({
    success: true,
    message: "Invitation created successfully.",
    inviteUrl,
    emailHtml,
    user: {
      id: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      isActive: false
    }
  });
});

// GET list of all users and departments for Admin
export const GET = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  await authenticate(req, [SystemRole.ADMIN]);

  const users = await User.find({}).populate("departmentId").sort({ createdAt: -1 });
  const departments = await Department.find({}).sort({ name: 1 });

  return NextResponse.json({
    success: true,
    users: users.map(u => ({
      id: u._id.toString(),
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      department: u.departmentId ? { id: u.departmentId._id.toString(), name: u.departmentId.name } : null,
      isInvited: !!u.inviteToken,
      inviteExpires: u.inviteExpires
    })),
    departments: departments.map(d => ({
      id: d._id.toString(),
      name: d.name
    }))
  });
});
