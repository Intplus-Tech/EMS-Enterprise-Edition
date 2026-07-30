import { connectToDatabase } from "../../config/db";
import { RolePermission } from "../../models/RolePermission";
import { User } from "../../models/User";
import { SystemRole } from "../../enums/roles";
import { PermissionAction, PermissionResource } from "../../enums/permissions";
import { PermissionGrants } from "../../types/domain";
import { RolePermissionDto } from "../../types/api";

const ALL_ACTIONS = Object.values(PermissionAction);
const READ_ONLY = [PermissionAction.VIEW];

/**
 * The grants each role starts with. Derived from the workflow responsibilities
 * in `src/enums/roles.ts` — an Initiator can raise but never approve, a Finance
 * Head owns budgets, only Admin touches roles. Seeded on first read so a fresh
 * database is usable without an extra migration step.
 */
const DEFAULT_GRANTS: Record<SystemRole, PermissionGrants> = {
  [SystemRole.ADMIN]: {
    [PermissionResource.EXPENSE_REQUESTS]: ALL_ACTIONS,
    [PermissionResource.CORPORATE_CARDS]: ALL_ACTIONS,
    [PermissionResource.DEPARTMENTAL_BUDGETS]: ALL_ACTIONS,
    [PermissionResource.FORECAST_MODELS]: ALL_ACTIONS,
    [PermissionResource.AUDIT_LOGS]: READ_ONLY,
    [PermissionResource.COMPLIANCE_REPORTS]: ALL_ACTIONS,
    [PermissionResource.ROLE_DEFINITIONS]: ALL_ACTIONS,
    [PermissionResource.USERS]: ALL_ACTIONS,
    [PermissionResource.DEPARTMENTS]: ALL_ACTIONS,
  },
  [SystemRole.FINANCE_HEAD]: {
    [PermissionResource.EXPENSE_REQUESTS]: [PermissionAction.VIEW, PermissionAction.APPROVE],
    [PermissionResource.DEPARTMENTAL_BUDGETS]: [
      PermissionAction.VIEW,
      PermissionAction.CREATE,
      PermissionAction.EDIT,
      PermissionAction.APPROVE,
    ],
    [PermissionResource.FORECAST_MODELS]: [PermissionAction.VIEW, PermissionAction.EDIT],
    [PermissionResource.AUDIT_LOGS]: READ_ONLY,
    [PermissionResource.COMPLIANCE_REPORTS]: [PermissionAction.VIEW, PermissionAction.APPROVE],
    [PermissionResource.DEPARTMENTS]: READ_ONLY,
    [PermissionResource.USERS]: READ_ONLY,
  },
  [SystemRole.FINANCE_MANAGER]: {
    [PermissionResource.EXPENSE_REQUESTS]: [PermissionAction.VIEW, PermissionAction.APPROVE],
    [PermissionResource.DEPARTMENTAL_BUDGETS]: READ_ONLY,
    [PermissionResource.AUDIT_LOGS]: READ_ONLY,
    [PermissionResource.COMPLIANCE_REPORTS]: READ_ONLY,
  },
  [SystemRole.FINANCE_OFFICER]: {
    [PermissionResource.EXPENSE_REQUESTS]: [PermissionAction.VIEW, PermissionAction.EDIT],
    [PermissionResource.DEPARTMENTAL_BUDGETS]: READ_ONLY,
    [PermissionResource.AUDIT_LOGS]: READ_ONLY,
    [PermissionResource.COMPLIANCE_REPORTS]: READ_ONLY,
  },
  [SystemRole.APPROVER]: {
    [PermissionResource.EXPENSE_REQUESTS]: [PermissionAction.VIEW, PermissionAction.APPROVE],
    [PermissionResource.DEPARTMENTAL_BUDGETS]: READ_ONLY,
  },
  [SystemRole.INITIATOR]: {
    [PermissionResource.EXPENSE_REQUESTS]: [
      PermissionAction.VIEW,
      PermissionAction.CREATE,
      PermissionAction.EDIT,
    ],
  },
};

const ROLE_DESCRIPTIONS: Record<SystemRole, string> = {
  [SystemRole.ADMIN]: "Full system configuration, user lifecycle and workflow administration.",
  [SystemRole.FINANCE_HEAD]: "Owns departmental budgets and authorises one-time budget expansions.",
  [SystemRole.FINANCE_MANAGER]: "Releases authorised bank payments and closes settled requests.",
  [SystemRole.FINANCE_OFFICER]: "Audits payment payloads and uploads instructions to the bank platform.",
  [SystemRole.APPROVER]: "Reviews and approves expense requests raised within their department.",
  [SystemRole.INITIATOR]: "Raises expense requests and responds to clarification queries.",
};

export class PermissionService {
  /**
   * Loads a role's grants, seeding the defaults the first time a role is read.
   * Never throws — an unreadable matrix falls back to the compiled defaults so a
   * database hiccup cannot lock every admin out of the system.
   */
  public static async getGrantsForRole(role: SystemRole): Promise<PermissionGrants> {
    try {
      await connectToDatabase();

      // Upsert rather than findOne-then-create: `role` carries a unique index,
      // so two concurrent first-reads would otherwise race and one would throw.
      const record = await RolePermission.findOneAndUpdate(
        { role },
        {
          $setOnInsert: {
            role,
            grants: DEFAULT_GRANTS[role] ?? {},
            description: ROLE_DESCRIPTIONS[role] ?? "",
            isActive: true,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      return this.toPlainGrants(record.grants);
    } catch {
      // A matrix we cannot read must not lock every admin out of the system.
      return DEFAULT_GRANTS[role] ?? {};
    }
  }

  /** True when the role may perform `action` on `resource`. */
  public static async can(
    role: SystemRole,
    resource: PermissionResource,
    action: PermissionAction
  ): Promise<boolean> {
    const grants = await this.getGrantsForRole(role);
    return (grants[resource] ?? []).includes(action);
  }

  /** Every role's matrix, for the Admin role permissions screen. */
  public static async listAll(): Promise<RolePermissionDto[]> {
    await connectToDatabase();

    // Ensure every role has a persisted row before reading them back.
    await Promise.all(Object.values(SystemRole).map((role) => this.getGrantsForRole(role)));

    const [records, userCounts] = await Promise.all([
      RolePermission.find({}),
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    ]);

    const countByRole = new Map<string, number>(
      userCounts.map((entry: { _id: string; count: number }) => [entry._id, entry.count])
    );

    return Object.values(SystemRole).map((role) => {
      const record = records.find((r: { role: string }) => r.role === role);
      const grants = record ? this.toPlainGrants(record.grants) : DEFAULT_GRANTS[role] ?? {};

      // The matrix UI needs a value for every cell, so absent resources are
      // filled in as explicitly denied rather than left undefined.
      const fullGrid = Object.values(PermissionResource).reduce((acc, resource) => {
        acc[resource] = grants[resource] ?? [];
        return acc;
      }, {} as Record<PermissionResource, PermissionAction[]>);

      return {
        role,
        description: record?.description || ROLE_DESCRIPTIONS[role] || "",
        isActive: record?.isActive ?? true,
        grants: fullGrid,
        userCount: countByRole.get(role) ?? 0,
      };
    });
  }

  /** Replaces a role's grants wholesale (the matrix saves the whole grid). */
  public static async updateRole(
    role: SystemRole,
    grants: PermissionGrants,
    description?: string,
    isActive?: boolean
  ) {
    await connectToDatabase();

    // Guard rail: the Admin role must retain role administration, otherwise a
    // single save can permanently lock everyone out of the matrix screen.
    if (role === SystemRole.ADMIN) {
      const roleGrants = grants[PermissionResource.ROLE_DEFINITIONS] ?? [];
      if (!roleGrants.includes(PermissionAction.EDIT) || !roleGrants.includes(PermissionAction.VIEW)) {
        throw new Error(
          "Invalid request: the Admin role must keep View and Edit on Role Definitions."
        );
      }
      if (isActive === false) {
        throw new Error("Invalid request: the Admin role cannot be deactivated.");
      }
    }

    const updated = await RolePermission.findOneAndUpdate(
      { role },
      {
        role,
        grants,
        ...(description !== undefined ? { description } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      { new: true, upsert: true }
    );

    return updated;
  }

  /** Mongoose Map → plain object, tolerating both shapes across driver versions. */
  private static toPlainGrants(grants: unknown): PermissionGrants {
    if (!grants) return {};
    if (grants instanceof Map) {
      return Object.fromEntries(grants) as PermissionGrants;
    }
    return grants as PermissionGrants;
  }
}
