import { connectToDatabase } from "../../config/db";
import { Department } from "../../models/Department";
import { User } from "../../models/User";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { LoggerService, ILogActor } from "../logs/logger.service";
import { BudgetService } from "../budget/budget.service";
import { RequestNotifier } from "../notifications/request-notifier";
import { AuditAction } from "../../enums/auditActions";
import { RequestStatus } from "../../enums/statuses";
import { DepartmentDto } from "../../types/api";

/** Statuses that mean a request is still moving, so deletion cancels it. */
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
 * Statuses whose amount is currently reserved in the period's `pendingBudget`.
 *
 * `lockBudget` runs at submission and at exceptional approval, and the
 * reservation is only released by reject/return or converted by payment. A
 * request cancelled from one of these must give the reservation back; one
 * cancelled from any other in-flight status never held it, and unlocking would
 * silently credit the department budget with money it never reserved.
 */
const BUDGET_LOCKED_STATUSES: string[] = [
  RequestStatus.PENDING_APPROVAL,
  RequestStatus.APPROVED,
  RequestStatus.SENT_TO_FINANCE,
  RequestStatus.UPLOADED_TO_BANK,
  RequestStatus.AWAITING_RELEASE,
];

/** Shown on the cancelled request's history row and on the restore that undoes it. */
const DELETION_ACTION = "Department Deleted";
const RESTORE_ACTION = "Department Restored";

/**
 * Department administration — create, read, update, delete and restore.
 * Consumed by `/api/admin/departments`.
 */
export class DepartmentService {
  public static async list(): Promise<DepartmentDto[]> {
    await connectToDatabase();

    const departments = await Department.find({}).sort({ name: 1 }).lean();

    // One grouped count instead of a query per department.
    const userCounts = await User.aggregate([
      { $match: { departmentId: { $ne: null } } },
      { $group: { _id: "$departmentId", count: { $sum: 1 } } },
    ]);
    const countByDept = new Map<string, number>(
      userCounts.map((entry: { _id: unknown; count: number }) => [String(entry._id), entry.count])
    );

    const headIds = departments.map((d) => d.headUserId).filter(Boolean);
    const heads = headIds.length ? await User.find({ _id: { $in: headIds } }).select("name").lean() : [];
    const headById = new Map<string, string>(heads.map((h) => [String(h._id), h.name]));

    return departments.map((dept) => ({
      id: String(dept._id),
      name: dept.name,
      description: dept.description || "",
      isActive: dept.isActive !== false,
      // Distinguishes a department deliberately deactivated from one awaiting
      // deletion — the table badges them differently and only the second offers
      // Restore.
      isPendingDeletion: Boolean(dept.pendingDeletion),
      headUserId: dept.headUserId ? String(dept.headUserId) : null,
      headName: dept.headUserId ? headById.get(String(dept.headUserId)) ?? null : null,
      // Deletion clears the assignment, so a pending-deletion row correctly
      // reports the users it no longer holds; Restore puts them back.
      usersCount: countByDept.get(String(dept._id)) ?? 0,
    }));
  }

  public static async create(
    data: { name: string; description?: string; headUserId?: string | null },
    actor: ILogActor
  ) {
    await connectToDatabase();

    // Case-insensitive duplicate check — the schema's unique index is
    // case-sensitive, so "Finance" and "finance" would otherwise both persist.
    const existing = await Department.findOne({
      name: { $regex: `^${escapeRegex(data.name)}$`, $options: "i" },
    });
    if (existing) {
      throw new Error(`Invalid request: a department named '${data.name}' already exists.`);
    }

    const department = await Department.create({
      name: data.name.trim(),
      description: data.description?.trim(),
      headUserId: data.headUserId || undefined,
      isActive: true,
    });

    await LoggerService.logAudit(
      AuditAction.DEPARTMENT_CREATED,
      `Department '${department.name}' created`,
      { departmentId: department._id },
      actor
    );

    return department;
  }

  public static async update(
    id: string,
    data: { name?: string; description?: string; headUserId?: string | null; isActive?: boolean },
    actor: ILogActor
  ) {
    await connectToDatabase();

    const department = await Department.findById(id);
    if (!department) throw new Error("Department not found");

    if (data.name && data.name.trim() !== department.name) {
      const clash = await Department.findOne({
        _id: { $ne: id },
        name: { $regex: `^${escapeRegex(data.name)}$`, $options: "i" },
      });
      if (clash) {
        throw new Error(`Invalid request: a department named '${data.name}' already exists.`);
      }
      department.name = data.name.trim();
    }

    if (data.description !== undefined) department.description = data.description.trim();
    if (data.headUserId !== undefined) department.headUserId = data.headUserId || undefined;
    if (data.isActive !== undefined) department.isActive = data.isActive;

    await department.save();

    await LoggerService.logAudit(
      AuditAction.DEPARTMENT_UPDATED,
      `Department '${department.name}' updated`,
      { departmentId: department._id, changes: data },
      actor
    );

    return department;
  }

  /**
   * Deletes a department, performing every effect the Delete Department modal
   * warns about (`designs/system-admin/Admin_ Delete Department Modal.png`):
   *
   * 1. history is moved out of the active dashboard — `GET /api/expenses`
   *    excludes requests belonging to a department pending deletion;
   * 2. the cost centre stops accepting spend — `createRequest` refuses it;
   * 3. in-flight approvals are cancelled, releasing any reserved budget;
   * 4. department-scoped user access is revoked by clearing the assignment.
   *
   * A hard delete is deliberately not performed. It was previously attempted and
   * refused while any user or in-flight request referenced the department, which
   * is true of every department in a running system, so the action could only
   * ever fail. The same design keeps the row in the table as pending deletion
   * with a Restore beside it, so each cascaded change is recorded on the
   * department and replayed in reverse by `restore` rather than being lost.
   */
  public static async beginDeletion(id: string, actor: ILogActor) {
    await connectToDatabase();

    const department = await Department.findById(id);
    if (!department) throw new Error("Department not found");

    if (department.pendingDeletion) {
      throw new Error(`Invalid request: '${department.name}' is already pending deletion.`);
    }

    // 1. Cancel in-flight approvals, remembering the state to rewind each to.
    const inFlight = await ExpenseRequest.find({
      departmentId: id,
      status: { $in: IN_FLIGHT_STATUSES },
    });

    const cancelledRequests: {
      requestId: string;
      previousStatus: string;
      previousStepIndex: number;
      budgetWasLocked: boolean;
    }[] = [];

    for (const request of inFlight) {
      const previousStatus = request.status;
      const budgetWasLocked = BUDGET_LOCKED_STATUSES.includes(previousStatus);

      if (budgetWasLocked) {
        await BudgetService.unlockBudget(request._id.toString());
      }

      request.history.push({
        statusBefore: previousStatus,
        statusAfter: RequestStatus.CANCELLED,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: DELETION_ACTION,
        comment: `Cancelled automatically because the '${department.name}' department was deleted.`,
        timestamp: new Date(),
      });
      request.status = RequestStatus.CANCELLED;
      await request.save();

      cancelledRequests.push({
        requestId: request._id.toString(),
        previousStatus,
        previousStepIndex: request.currentStepIndex ?? 0,
        budgetWasLocked,
      });

      await LoggerService.logAudit(
        AuditAction.EXPENSE_CANCELLED,
        `Request ${request.requestNumber} cancelled: department '${department.name}' deleted`,
        { requestId: request._id, previousStatus },
        actor
      );

      // Tell the initiator their in-flight request was cancelled for them.
      //
      // Email is the only channel that can reach them here: requests belonging
      // to a deleted department are excluded from `GET /api/expenses`, and the
      // in-app bell is derived from that list — so the request, and any
      // notification derived from it, disappear from their dashboard at the
      // same moment. Silently losing a submitted request is not acceptable.
      await RequestNotifier.notifyInitiator(request);
    }

    // 2. Revoke department-scoped access by clearing the assignment.
    const revokedUserIds = await User.find({ departmentId: id }).distinct("_id");
    if (revokedUserIds.length > 0) {
      await User.updateMany({ departmentId: id }, { $unset: { departmentId: "" } });
    }

    department.isActive = false;
    department.pendingDeletion = {
      requestedAt: new Date(),
      requestedById: actor.id,
      requestedByName: actor.name,
      revokedUserIds,
      cancelledRequests,
    };
    await department.save();

    await LoggerService.logAudit(
      AuditAction.DEPARTMENT_DELETED,
      `Department '${department.name}' deleted — ${cancelledRequests.length} request(s) cancelled, ${revokedUserIds.length} user assignment(s) revoked`,
      {
        departmentId: id,
        cancelledRequests: cancelledRequests.length,
        revokedUsers: revokedUserIds.length,
      },
      actor
    );

    return {
      id,
      name: department.name,
      isActive: false,
      isPendingDeletion: true,
      cancelledRequests: cancelledRequests.length,
      revokedUsers: revokedUserIds.length,
    };
  }

  /**
   * Reverses a deletion, replaying the recorded cascade backwards.
   *
   * Each step re-checks current state before touching it: a user reassigned to
   * another department in the meantime keeps that assignment, and a request an
   * operator has since moved on from is left alone. Restoring must not overwrite
   * decisions taken after the deletion.
   */
  public static async restore(id: string, actor: ILogActor) {
    await connectToDatabase();

    const department = await Department.findById(id);
    if (!department) throw new Error("Department not found");

    const record = department.pendingDeletion;
    let reassignedUsers = 0;
    let reinstatedRequests = 0;

    if (record) {
      // 1. Re-assign only users who are still unassigned.
      if (record.revokedUserIds?.length) {
        const result = await User.updateMany(
          { _id: { $in: record.revokedUserIds }, departmentId: { $in: [null, undefined] } },
          { $set: { departmentId: department._id } }
        );
        reassignedUsers = result.modifiedCount ?? 0;
      }

      // 2. Rewind the requests this deletion cancelled.
      for (const entry of record.cancelledRequests ?? []) {
        const request = await ExpenseRequest.findById(entry.requestId);
        if (!request || request.status !== RequestStatus.CANCELLED) continue;

        request.history.push({
          statusBefore: RequestStatus.CANCELLED,
          statusAfter: entry.previousStatus,
          actorId: actor.id,
          actorName: actor.name,
          actorRole: actor.role,
          action: RESTORE_ACTION,
          comment: `Reinstated because the '${department.name}' department was restored.`,
          timestamp: new Date(),
        });
        request.status = entry.previousStatus;
        request.currentStepIndex = entry.previousStepIndex ?? 0;
        await request.save();
        reinstatedRequests++;

        if (entry.budgetWasLocked) {
          // A period deleted since the cancellation must not block the restore —
          // the request comes back either way and the gap is logged, matching how
          // `unlockBudget` treats the same situation.
          try {
            await BudgetService.lockBudget(request._id.toString());
          } catch {
            await LoggerService.logApp(
              AuditAction.BUDGET_PERIOD_MISSING,
              `Could not re-reserve budget for reinstated request ${request.requestNumber}; no period covers its payment date.`
            );
          }
        }
      }
    }

    department.isActive = true;
    // `set(..., undefined)` issues the $unset; a bare assignment can leave the
    // subdocument in place and the row would stay flagged as pending deletion.
    department.set("pendingDeletion", undefined);
    await department.save();

    await LoggerService.logAudit(
      AuditAction.DEPARTMENT_RESTORED,
      `Department '${department.name}' restored — ${reinstatedRequests} request(s) reinstated, ${reassignedUsers} user assignment(s) returned`,
      { departmentId: id, reinstatedRequests, reassignedUsers },
      actor
    );

    return {
      id,
      name: department.name,
      isActive: true,
      isPendingDeletion: false,
      reinstatedRequests,
      reassignedUsers,
    };
  }
}

/** Escapes user input before it is interpolated into a `$regex` query. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
