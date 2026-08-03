import { connectToDatabase } from "../../config/db";
import { Department } from "../../models/Department";
import { User } from "../../models/User";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { LoggerService, ILogActor } from "../logs/logger.service";
import { AuditAction } from "../../enums/auditActions";
import { RequestStatus } from "../../enums/statuses";
import { DepartmentDto } from "../../types/api";

/** Statuses that mean a request is still moving, and so survives an archive. */
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
 * Department administration — create, read, update, archive and restore.
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
      headUserId: dept.headUserId ? String(dept.headUserId) : null,
      headName: dept.headUserId ? headById.get(String(dept.headUserId)) ?? null : null,
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
   * "Delete" archives rather than erases.
   *
   * A hard delete was unreachable in practice: it refused while any user or
   * in-flight request still referenced the department, which is true of every
   * department in a running system, so the action could only ever fail. It also
   * contradicted the design (`designs/system-admin/Admin_ Delete Department
   * Modal.png`), where the deleted row stays in the table as pending deletion
   * with a Restore action beside it.
   *
   * Archiving keeps users, budget history and audit rows intact while removing
   * the department from active use — `createRequest` refuses to book new
   * spending against it. In-flight requests are deliberately left running:
   * cancelling other people's approvals as a side effect of an admin tidy-up is
   * not recoverable, and Restore has to be able to undo the whole action.
   */
  public static async archive(id: string, actor: ILogActor) {
    await connectToDatabase();

    const department = await Department.findById(id);
    if (!department) throw new Error("Department not found");

    if (department.isActive === false) {
      throw new Error(`Invalid request: '${department.name}' is already archived.`);
    }

    department.isActive = false;
    await department.save();

    // Reported back so the modal's summary reflects what was actually affected
    // rather than the blanket warnings the design's copy carried.
    const [assignedUsers, inFlight] = await Promise.all([
      User.countDocuments({ departmentId: id }),
      ExpenseRequest.countDocuments({ departmentId: id, status: { $in: IN_FLIGHT_STATUSES } }),
    ]);

    await LoggerService.logAudit(
      AuditAction.DEPARTMENT_ARCHIVED,
      `Department '${department.name}' archived (${assignedUsers} user(s), ${inFlight} in-flight request(s) retained)`,
      { departmentId: id, assignedUsers, inFlight },
      actor
    );

    return { id, name: department.name, isActive: false, assignedUsers, inFlight };
  }

  /** Undoes an archive — the Restore action on an inactive department row. */
  public static async restore(id: string, actor: ILogActor) {
    await connectToDatabase();

    const department = await Department.findById(id);
    if (!department) throw new Error("Department not found");

    department.isActive = true;
    await department.save();

    await LoggerService.logAudit(
      AuditAction.DEPARTMENT_RESTORED,
      `Department '${department.name}' restored`,
      { departmentId: id },
      actor
    );

    return { id, name: department.name, isActive: true };
  }
}

/** Escapes user input before it is interpolated into a `$regex` query. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
