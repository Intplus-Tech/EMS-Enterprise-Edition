import { connectToDatabase } from "../../config/db";
import { User } from "../../models/User";
import { Department } from "../../models/Department";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { LoggerService, ILogActor } from "../logs/logger.service";
import { AuditAction } from "../../enums/auditActions";
import { SystemRole } from "../../enums/roles";
import { RequestStatus } from "../../enums/statuses";
import { AdminUserDto } from "../../types/api";

/** A user holding one of these cannot be removed while work is mid-flight. */
const IN_FLIGHT_STATUSES = [
  RequestStatus.SUBMITTED,
  RequestStatus.BUDGET_CHECK,
  RequestStatus.INSUFFICIENT_BUDGET,
  RequestStatus.PENDING_EXCEPTIONAL,
  RequestStatus.PENDING_APPROVAL,
  RequestStatus.APPROVED,
  RequestStatus.SENT_TO_FINANCE,
  RequestStatus.UPLOADED_TO_BANK,
  RequestStatus.AWAITING_RELEASE,
];

/**
 * User administration for the Admin "Users & Roles" screen — everything except
 * invitation, which stays in `/api/admin/invite` because it owns token issuing
 * and the invite email. Consumed by `/api/admin/users/[id]`.
 */
export class UserService {
  public static async list(): Promise<AdminUserDto[]> {
    await connectToDatabase();

    const users = await User.find({}).populate("departmentId", "name").sort({ createdAt: -1 });

    return users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      department: u.departmentId
        ? { id: u.departmentId._id.toString(), name: u.departmentId.name }
        : null,
      // Flat alias so table columns and filters can read one field regardless of
      // whether the row came from this endpoint or a populated expense record.
      departmentName: u.departmentId?.name ?? "",
      officialContact: u.officialContact ?? "",
      personalContact: u.personalContact ?? "",
      avatar: u.avatar ?? "",
      isInvited: !!u.inviteToken,
      inviteExpires: u.inviteExpires ? u.inviteExpires.toISOString() : null,
    }));
  }

  public static async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      role?: SystemRole;
      departmentId?: string | null;
      officialContact?: string;
      personalContact?: string;
      avatar?: string;
    },
    actor: ILogActor
  ) {
    await connectToDatabase();

    const user = await User.findById(id);
    if (!user) throw new Error("User not found");

    if (data.email && data.email.toLowerCase() !== user.email) {
      const clash = await User.findOne({ _id: { $ne: id }, email: data.email.toLowerCase() });
      if (clash) {
        throw new Error(`Invalid request: '${data.email}' is already registered to another user.`);
      }
      user.email = data.email.toLowerCase();
    }

    // Demoting the last active admin would leave the system unadministrable.
    if (data.role && data.role !== user.role && user.role === SystemRole.ADMIN) {
      await this.assertNotLastActiveAdmin(id, "change the role of");
    }

    if (data.departmentId !== undefined) {
      if (data.departmentId) {
        const dept = await Department.findById(data.departmentId);
        if (!dept) throw new Error("Department not found");
        user.departmentId = data.departmentId;
      } else {
        user.departmentId = undefined;
      }
    }

    if (data.name !== undefined) user.name = data.name.trim();
    if (data.role !== undefined) user.role = data.role;
    if (data.officialContact !== undefined) user.officialContact = data.officialContact;
    if (data.personalContact !== undefined) user.personalContact = data.personalContact;
    if (data.avatar !== undefined) user.avatar = data.avatar;

    await user.save();

    await LoggerService.logAudit(
      AuditAction.USER_UPDATED,
      `User '${user.name}' (${user.email}) updated`,
      { userId: user._id, changes: { ...data, avatar: data.avatar ? "[updated]" : undefined } },
      actor
    );

    return user;
  }

  /** Suspends or reactivates access without destroying the audit trail. */
  public static async setActive(id: string, isActive: boolean, actor: ILogActor) {
    await connectToDatabase();

    const user = await User.findById(id);
    if (!user) throw new Error("User not found");

    if (!isActive && user.role === SystemRole.ADMIN) {
      await this.assertNotLastActiveAdmin(id, "suspend");
    }

    user.isActive = isActive;
    // Suspension must also void any outstanding invitation, otherwise a
    // suspended invitee could still complete setup and reactivate themselves,
    // and must end any session already in flight.
    if (!isActive) {
      user.inviteToken = undefined;
      user.inviteExpires = undefined;
      user.sessionsValidFrom = new Date();
    }
    await user.save();

    await LoggerService.logAudit(
      isActive ? AuditAction.USER_REACTIVATED : AuditAction.USER_SUSPENDED,
      `User '${user.name}' (${user.email}) ${isActive ? "reactivated" : "suspended"}`,
      { userId: user._id },
      actor
    );

    return user;
  }

  /**
   * Permanently removes a user. Historical requests keep pointing at the id so
   * the audit trail stays intact — only in-flight work blocks the delete.
   */
  public static async remove(id: string, actor: ILogActor) {
    await connectToDatabase();

    const user = await User.findById(id);
    if (!user) throw new Error("User not found");

    if (user.role === SystemRole.ADMIN) {
      await this.assertNotLastActiveAdmin(id, "delete");
    }

    const inFlight = await ExpenseRequest.countDocuments({
      initiatorId: id,
      status: { $in: IN_FLIGHT_STATUSES },
    });
    if (inFlight > 0) {
      throw new Error(
        `Invalid request: '${user.name}' has ${inFlight} in-flight request(s). Resolve or reassign them first.`
      );
    }

    await user.deleteOne();

    await LoggerService.logAudit(
      AuditAction.USER_DELETED,
      `User '${user.name}' (${user.email}) deleted`,
      { userId: id, email: user.email, role: user.role },
      actor
    );

    return { id, name: user.name };
  }

  /**
   * Ends every active session for a user ("Force Log Out" in the admin profile
   * modal). Works by moving the account's revocation watermark forward, which
   * `authenticate()` checks on each request — previously this was an `alert()`
   * and the user's token stayed valid for its full 8 hours.
   */
  public static async revokeSessions(id: string, actor: ILogActor) {
    await connectToDatabase();

    const user = await User.findById(id);
    if (!user) throw new Error("User not found");

    user.sessionsValidFrom = new Date();
    await user.save();

    await LoggerService.logAudit(
      AuditAction.USER_SESSIONS_REVOKED,
      `All active sessions ended for '${user.name}' (${user.email})`,
      { userId: id },
      actor
    );

    return { id, name: user.name };
  }

  /** Blocks any change that would leave zero active administrators. */
  private static async assertNotLastActiveAdmin(id: string, verb: string) {
    const remainingAdmins = await User.countDocuments({
      _id: { $ne: id },
      role: SystemRole.ADMIN,
      isActive: true,
    });
    if (remainingAdmins === 0) {
      throw new Error(
        `Forbidden: cannot ${verb} the only active administrator. Promote another admin first.`
      );
    }
  }
}
