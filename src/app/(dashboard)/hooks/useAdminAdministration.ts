"use client";

/**
 * Owns all System Admin data and mutations (users, departments, budgets, roles).
 *
 * Extracted from `DashboardProvider` so the provider is not also responsible for
 * admin CRUD. Every mutation persists through `AdminClient` and then refetches,
 * so the screen reflects server state rather than an optimistic guess — these
 * actions were previously local `setState` calls that vanished on refresh.
 */
import { useCallback, useState } from "react";
import { AdminClient, BudgetPeriodInput, DepartmentInput, UserProfileInput } from "../../../services/admin.client";
import { toErrorMessage } from "../../../services/http";
import { SystemRole } from "../../../enums/roles";
import { PermissionAction, PermissionResource } from "../../../enums/permissions";
import {
  AdminUserDto,
  BudgetPeriodDto,
  DepartmentDto,
  DepartmentSpendDto,
  RolePermissionDto,
} from "../../../types/api";

/** Roles permitted to read the admin datasets; others skip the fetch entirely. */
const ADMIN_DATA_ROLES: string[] = [SystemRole.ADMIN, SystemRole.FINANCE_HEAD];

interface AdminFeedback {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function useAdminAdministration({ onSuccess, onError }: AdminFeedback) {
  const [systemUsers, setSystemUsers] = useState<AdminUserDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [budgets, setBudgets] = useState<DepartmentSpendDto[]>([]);
  const [budgetPeriods, setBudgetPeriods] = useState<BudgetPeriodDto[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionDto[]>([]);
  // Drives the disabled/spinner state on modal confirm buttons.
  const [adminBusy, setAdminBusy] = useState(false);

  /* --------------------------------------------------------------------- *
   * Loading
   * --------------------------------------------------------------------- */

  const loadUsers = useCallback(async () => {
    try {
      const { users } = await AdminClient.listUsers();
      setSystemUsers(users);
    } catch {
      // Non-admins are expected to be refused here; leave the list empty.
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      setDepartments(await AdminClient.listDepartments());
    } catch {
      /* permission denied — screen renders its empty state */
    }
  }, []);

  const loadBudgets = useCallback(async () => {
    try {
      const { budgets: summaries, periods } = await AdminClient.listBudgets();
      setBudgets(summaries);
      setBudgetPeriods(periods);
    } catch {
      /* permission denied — screen renders its empty state */
    }
  }, []);

  const loadRoles = useCallback(async () => {
    try {
      setRolePermissions(await AdminClient.listRoles());
    } catch {
      /* permission denied — matrix falls back to read-only defaults */
    }
  }, []);

  /** Fetches everything the admin screens need, for a given signed-in role. */
  const loadAdminData = useCallback(
    async (role?: string) => {
      if (!role || !ADMIN_DATA_ROLES.includes(role)) return;
      await Promise.all([loadUsers(), loadDepartments(), loadBudgets(), loadRoles()]);
    },
    [loadUsers, loadDepartments, loadBudgets, loadRoles]
  );

  /**
   * Runs a mutation with shared busy/feedback handling so each of the twelve
   * admin actions below stays a single expressive line.
   */
  const run = useCallback(
    async (action: () => Promise<void>, successMessage: string) => {
      setAdminBusy(true);
      try {
        await action();
        onSuccess(successMessage);
        return true;
      } catch (error) {
        onError(toErrorMessage(error));
        return false;
      } finally {
        setAdminBusy(false);
      }
    },
    [onSuccess, onError]
  );

  /* --------------------------------------------------------------------- *
   * Departments
   * --------------------------------------------------------------------- */

  const createDepartment = useCallback(
    (input: DepartmentInput & { totalBudget?: number; lineItems?: { name: string; description?: string; amount: number }[] }) =>
      run(async () => {
        const department = await AdminClient.createDepartment({
          name: input.name,
          description: input.description,
          headUserId: input.headUserId,
        });

        // The Create Department modal captures an opening allocation alongside
        // the department itself, so persist it as the department's first period.
        if (input.totalBudget && input.totalBudget > 0) {
          await AdminClient.saveBudgetPeriod({
            departmentId: department.id,
            ...currentFiscalPeriod(),
            totalBudget: input.totalBudget,
            lineItems: input.lineItems ?? [],
          });
        }

        await Promise.all([loadDepartments(), loadBudgets()]);
      }, `Department "${input.name}" created.`),
    [run, loadDepartments, loadBudgets]
  );

  const updateDepartment = useCallback(
    (
      id: string,
      input: Partial<DepartmentInput> & {
        isActive?: boolean;
        totalBudget?: number;
        lineItems?: { name: string; description?: string; amount: number }[];
      }
    ) =>
      run(async () => {
        await AdminClient.updateDepartment(id, {
          name: input.name,
          description: input.description,
          headUserId: input.headUserId,
          isActive: input.isActive,
        });

        if (input.totalBudget !== undefined) {
          await AdminClient.saveBudgetPeriod({
            departmentId: id,
            ...currentFiscalPeriod(),
            totalBudget: input.totalBudget,
            lineItems: input.lineItems ?? [],
          });
        }

        await Promise.all([loadDepartments(), loadBudgets()]);
      }, "Department updated."),
    [run, loadDepartments, loadBudgets]
  );

  /**
   * Deleting a department archives it — users, budgets and history are kept and
   * the row can be restored. The toast says so rather than claiming a delete
   * the server does not perform.
   */
  const deleteDepartment = useCallback(
    (id: string) =>
      run(async () => {
        await AdminClient.deleteDepartment(id);
        await Promise.all([loadDepartments(), loadBudgets()]);
      }, "Department archived. It can be restored from the department list."),
    [run, loadDepartments, loadBudgets]
  );

  const restoreDepartment = useCallback(
    (id: string) =>
      run(async () => {
        await AdminClient.setDepartmentActive(id, true);
        await Promise.all([loadDepartments(), loadBudgets()]);
      }, "Department restored."),
    [run, loadDepartments, loadBudgets]
  );

  /* --------------------------------------------------------------------- *
   * Users
   * --------------------------------------------------------------------- */

  const inviteUser = useCallback(
    (input: { name: string; email: string; role: string; departmentId?: string }) =>
      run(async () => {
        await AdminClient.inviteUser(input);
        await loadUsers();
      }, `Invitation sent to ${input.email}.`),
    [run, loadUsers]
  );

  const updateUser = useCallback(
    (id: string, input: UserProfileInput) =>
      run(async () => {
        await AdminClient.updateUser(id, input);
        await loadUsers();
      }, "User profile updated."),
    [run, loadUsers]
  );

  const setUserActive = useCallback(
    (id: string, isActive: boolean) =>
      run(async () => {
        await AdminClient.setUserActive(id, isActive);
        await loadUsers();
      }, isActive ? "User access restored." : "User access suspended."),
    [run, loadUsers]
  );

  const revokeUserSessions = useCallback(
    (id: string, name: string) =>
      run(async () => {
        await AdminClient.revokeUserSessions(id);
      }, `${name} has been signed out of all devices.`),
    [run]
  );

  const deleteUser = useCallback(
    (id: string) =>
      run(async () => {
        await AdminClient.deleteUser(id);
        await loadUsers();
      }, "User deleted."),
    [run, loadUsers]
  );

  /* --------------------------------------------------------------------- *
   * Budgets & roles
   * --------------------------------------------------------------------- */

  const saveBudgetPeriod = useCallback(
    (input: Omit<BudgetPeriodInput, "periodName" | "startDate" | "endDate"> &
      Partial<Pick<BudgetPeriodInput, "periodName" | "startDate" | "endDate">>) =>
      run(async () => {
        const { budgets: summaries, periods } = await AdminClient.saveBudgetPeriod({
          ...currentFiscalPeriod(),
          ...input,
        });
        setBudgets(summaries);
        setBudgetPeriods(periods);
        await loadDepartments();
      }, "Departmental budget updated."),
    [run, loadDepartments]
  );

  const saveRolePermissions = useCallback(
    (input: {
      role: SystemRole;
      grants: Partial<Record<PermissionResource, PermissionAction[]>>;
      description?: string;
      isActive?: boolean;
    }) =>
      run(async () => {
        setRolePermissions(await AdminClient.updateRole(input));
      }, `Permissions updated for ${input.role.replace(/_/g, " ").toLowerCase()}.`),
    [run]
  );

  return {
    // data
    systemUsers,
    departments,
    budgets,
    budgetPeriods,
    rolePermissions,
    adminBusy,
    // loaders
    loadAdminData,
    loadUsers,
    loadDepartments,
    loadBudgets,
    loadRoles,
    // mutations
    createDepartment,
    updateDepartment,
    deleteDepartment,
    restoreDepartment,
    inviteUser,
    updateUser,
    setUserActive,
    revokeUserSessions,
    deleteUser,
    saveBudgetPeriod,
    saveRolePermissions,
  };
}

/**
 * Default budget window when a screen does not ask for a specific one.
 * The admin modals set an annual allocation, so the period is the calendar
 * year — named `FY-<year>` to match the `periodName` shown in the designs.
 */
function currentFiscalPeriod() {
  const year = new Date().getFullYear();
  return {
    periodName: `FY-${year}`,
    startDate: new Date(Date.UTC(year, 0, 1)).toISOString(),
    endDate: new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString(),
  };
}
