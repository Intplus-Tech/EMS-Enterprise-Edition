import { connectToDatabase } from "../../config/db";
import { HIDDEN_ACCOUNT_QUERY } from "../../config/systemAccounts";
import { User } from "../../models/User";
import { Department } from "../../models/Department";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { LoggerService, ILogActor } from "../logs/logger.service";
import { BudgetService } from "../budget/budget.service";
import { RequestNotifier } from "../notifications/request-notifier";
import { AuditAction } from "../../enums/auditActions";
import { SystemRole, isDepartmentScopedRole } from "../../enums/roles";
import { IN_FLIGHT_STATUSES, RequestStatus } from "../../enums/statuses";
import { AdminUserDto } from "../../types/api";

/**
 * Statuses whose amount is currently reserved in the period's `pendingBudget`.
 *
 * `lockBudget` runs at submission and at exceptional approval, and only
 * reject/return releases the reservation. Cancelling out of one of these must
 * give the money back; cancelling out of any other in-flight status never held
 * a reservation, and unlocking would credit the department with money it never
 * reserved. Mirrors the same list in `DepartmentService`.
 */
const BUDGET_LOCKED_STATUSES: string[] = [
  RequestStatus.PENDING_APPROVAL,
  RequestStatus.APPROVED,
  RequestStatus.SENT_TO_FINANCE,
  RequestStatus.UPLOADED_TO_BANK,
  RequestStatus.AWAITING_RELEASE,
];

/** Recorded on the history row of every request a user deletion cancels. */
const DELETION_ACTION = "User Deleted";

/**
 * User administration for the Admin "Users & Roles" screen — everything except
 * invitation, which stays in `/api/admin/invite` because it owns token issuing
 * and the invite email. Consumed by `/api/admin/users/[id]`.
 */
export class UserService {
  public static async list(): Promise<AdminUserDto[]> {
    await connectToDatabase();

    // Support accounts are concealed from the directory — see `systemAccounts.ts`.
    const users = await User.find(HIDDEN_ACCOUNT_QUERY)
      .populate("departmentId", "name")
      .sort({ createdAt: -1 });

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

    // Department assignment follows the role, not the submitted payload: only
    // initiators and approvers are department-scoped. Promoting someone to a
    // global role therefore clears their department instead of leaving a stale
    // one behind that would keep narrowing what they can see.
    const effectiveRole = data.role ?? user.role;
    if (isDepartmentScopedRole(effectiveRole)) {
      const nextDepartmentId = data.departmentId ?? user.departmentId;
      if (!nextDepartmentId) {
        throw new Error(`Invalid request: a ${effectiveRole} must belong to a department.`);
      }
      if (data.departmentId) {
        const dept = await Department.findById(data.departmentId);
        if (!dept) throw new Error("Department not found");
      }
      user.departmentId = nextDepartmentId;
    } else {
      user.departmentId = undefined;
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
   * Permanently removes a user, cancelling any work they left mid-flight.
   *
   * In-flight requests used to abort the delete outright, which meant an admin
   * could not remove a leaver until somebody chased down every request they had
   * raised — and an initiator almost always has one. The requests are now
   * cancelled as part of the deletion, exactly as `DepartmentService.beginDeletion`
   * already does for a department:
   *
   *  - any budget the request had reserved is released, so the department is not
   *    left short by an allocation nothing will ever spend;
   *  - the cancellation is written to the request's own history and to the audit
   *    trail, so the record shows why it stopped rather than just that it did;
   *  - the initiator is emailed before the account goes, so a request they
   *    submitted is not silently voided on them.
   *
   * Historical requests keep pointing at the id so the audit trail stays intact.
   * The last active administrator is still protected — that guard leaves the
   * system administrable, and no amount of forcing should defeat it.
   */
  public static async remove(id: string, actor: ILogActor) {
    await connectToDatabase();

    const user = await User.findById(id);
    if (!user) throw new Error("User not found");

    if (user.role === SystemRole.ADMIN) {
      await this.assertNotLastActiveAdmin(id, "delete");
    }

    const inFlight = await ExpenseRequest.find({
      initiatorId: id,
      status: { $in: IN_FLIGHT_STATUSES },
    });

    for (const request of inFlight) {
      const previousStatus = request.status;

      if (BUDGET_LOCKED_STATUSES.includes(previousStatus)) {
        await BudgetService.unlockBudget(request._id.toString());
      }

      request.history.push({
        statusBefore: previousStatus,
        statusAfter: RequestStatus.CANCELLED,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: DELETION_ACTION,
        comment: `Cancelled automatically because the account of '${user.name}' was deleted.`,
        timestamp: new Date(),
      });
      request.status = RequestStatus.CANCELLED;
      await request.save();

      await LoggerService.logAudit(
        AuditAction.EXPENSE_CANCELLED,
        `Request ${request.requestNumber} cancelled: user '${user.name}' deleted`,
        { requestId: request._id, previousStatus },
        actor
      );

      // Sent while the account still exists, so the address resolves. Email is
      // the only channel left to them — the login it would be read in-app from
      // is about to be removed.
      await RequestNotifier.notifyInitiator(request);
    }

    await user.deleteOne();

    await LoggerService.logAudit(
      AuditAction.USER_DELETED,
      `User '${user.name}' (${user.email}) deleted — ${inFlight.length} in-flight request(s) cancelled`,
      { userId: id, email: user.email, role: user.role, cancelledRequests: inFlight.length },
      actor
    );

    return { id, name: user.name, cancelledRequests: inFlight.length };
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
    // The watermark alone would leave a stale id on the account, so the next
    // sign-in would be compared against a session nobody holds any more.
    user.activeSessionId = undefined;
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
