import { connectToDatabase } from "../../config/db";
import { Department } from "../../models/Department";
import { User } from "../../models/User";
import { BudgetPeriod } from "../../models/BudgetPeriod";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { LoggerService, ILogActor } from "../logs/logger.service";
import { AuditAction } from "../../enums/auditActions";
import { RequestStatus } from "../../enums/statuses";
import { DepartmentDto } from "../../types/api";

/** Statuses that mean a request is still moving and would be orphaned by a delete. */
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
 * Department administration — create/read/update/delete plus the referential
 * safety checks that keep the Delete Department modal's promises honest.
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
   * Deletes a department, refusing while anything still references it.
   * Historical (closed/rejected) requests are left intact — the design states
   * audit history is preserved — but in-flight work must be resolved first or
   * it would become unroutable.
   */
  public static async remove(id: string, actor: ILogActor) {
    await connectToDatabase();

    const department = await Department.findById(id);
    if (!department) throw new Error("Department not found");

    const [assignedUsers, inFlight] = await Promise.all([
      User.countDocuments({ departmentId: id }),
      ExpenseRequest.countDocuments({ departmentId: id, status: { $in: IN_FLIGHT_STATUSES } }),
    ]);

    if (assignedUsers > 0) {
      throw new Error(
        `Invalid request: ${assignedUsers} user(s) are still assigned to '${department.name}'. Reassign them first.`
      );
    }
    if (inFlight > 0) {
      throw new Error(
        `Invalid request: ${inFlight} in-flight request(s) belong to '${department.name}'. Resolve them first.`
      );
    }

    // Budget periods are department-owned and carry no independent history.
    await BudgetPeriod.deleteMany({ departmentId: id });
    await department.deleteOne();

    await LoggerService.logAudit(
      AuditAction.DEPARTMENT_DELETED,
      `Department '${department.name}' deleted`,
      { departmentId: id },
      actor
    );

    return { id, name: department.name };
  }
}

/** Escapes user input before it is interpolated into a `$regex` query. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
