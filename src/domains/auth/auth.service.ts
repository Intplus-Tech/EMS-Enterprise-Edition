import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "../../config/db";
import { User } from "../../models/User";
import { LoggerService } from "../logs/logger.service";

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

    const user = await User.findOne({ email }).populate("departmentId");
    if (!user) {
      await LoggerService.logApp("AUTH_LOGIN_FAILED", `Login attempt failed: user ${email} not found`);
      throw new Error("Invalid email or password");
    }

    if (!user.isActive) {
      await LoggerService.logApp("AUTH_LOGIN_FAILED", `Login attempt failed: account for ${email} is inactive`);
      throw new Error("Account is inactive. Please contact your system administrator.");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
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
}
