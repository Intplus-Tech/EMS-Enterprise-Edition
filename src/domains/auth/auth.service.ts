import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "../../config/db";
import { User } from "../../models/User";
import { LoggerService } from "../logs/logger.service";
import { EmailService } from "../email/email.service";

const JWT_SECRET = process.env.JWT_SECRET || "spendflow-secure-jwt-secret-key-12345";

export class AuthService {
  /**
   * Hashes a plain password using bcrypt
   */
  public static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compares a plain password with a hashed password
   */
  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Log in user and return user details and token
   */
  public static async login(email: string, password: string) {
    await connectToDatabase();

    const user = await User.findOne({ email: email.toLowerCase() }).populate("departmentId");
    if (!user) {
      await LoggerService.logApp("AUTH_LOGIN_FAILED", `Login attempt failed: user ${email} not found`);
      throw new Error("Invalid email or password");
    }

    if (!user.isActive) {
      await LoggerService.logApp("AUTH_LOGIN_FAILED", `Login attempt failed: account for ${email} is inactive`);
      throw new Error("Account is inactive. Please contact your system administrator.");
    }

    const isMatch = await AuthService.comparePassword(password, user.passwordHash);
    if (!isMatch) {
      await LoggerService.logApp("AUTH_LOGIN_FAILED", `Login attempt failed: wrong password for ${email}`);
      throw new Error("Invalid email or password");
    }

    // Sign the JSON Web Token
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId?._id?.toString() || null,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    await LoggerService.logAudit(
      "USER_LOGIN", 
      `User ${user.name} logged in successfully`, 
      undefined, 
      { id: user._id.toString(), name: user.name, role: user.role }
    );

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        departmentName: (user.departmentId as any)?.name || null,
        departmentId: user.departmentId?._id?.toString() || null,
      }
    };
  }

  /**
   * Decodes and validates a JWT token
   */
  public static verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
        name: string;
        role: any;
        departmentId: string | null;
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Generates a 6-digit verification code for password reset and dispatches email
   */
  public static async requestPasswordReset(email: string, origin?: string): Promise<boolean> {
    await connectToDatabase();
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return true to avoid email enumeration security vector
      return true;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = code;
    user.resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    await EmailService.sendPasswordResetEmail(user.email, user.name, code, origin);
    await LoggerService.logAudit(
      "PASSWORD_RESET_REQUESTED",
      `Password reset code requested for ${user.email}`,
      { email: user.email }
    );

    return true;
  }

  /**
   * Verifies if a 6-digit reset code is valid for an email
   */
  public static async verifyResetCode(email: string, code: string): Promise<boolean> {
    await connectToDatabase();
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.resetCode || !user.resetCodeExpires) {
      return false;
    }

    if (user.resetCode !== code || user.resetCodeExpires < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Resets user password after code verification
   */
  public static async resetPassword(email: string, code: string, newPassword: string): Promise<boolean> {
    await connectToDatabase();
    const isValid = await this.verifyResetCode(email, code);
    if (!isValid) {
      throw new Error("Invalid or expired verification code.");
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error("User not found.");
    }

    user.passwordHash = await this.hashPassword(newPassword);
    user.resetCode = undefined;
    user.resetCodeExpires = undefined;
    await user.save();

    await LoggerService.logAudit(
      "PASSWORD_RESET_COMPLETED",
      `Password successfully reset for ${user.email}`,
      { email: user.email }
    );

    return true;
  }

  /**
   * Accepts invitation token and configures account password and name
   */
  public static async setupUserFromToken(token: string, password: string, name?: string): Promise<any> {
    await connectToDatabase();
    const user = await User.findOne({ inviteToken: token });
    if (!user) {
      throw new Error("Invalid or expired invitation link.");
    }

    if (user.inviteExpires && user.inviteExpires < new Date()) {
      throw new Error("Invitation link has expired. Please request a new invitation from your administrator.");
    }

    user.passwordHash = await this.hashPassword(password);
    if (name && name.trim()) {
      user.name = name.trim();
    }
    user.isActive = true;
    user.inviteToken = undefined;
    user.inviteExpires = undefined;
    await user.save();

    await LoggerService.logAudit(
      "USER_INVITE_ACCEPTED",
      `User ${user.name} (${user.email}) setup account successfully via invitation`,
      { email: user.email, role: user.role }
    );

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}

