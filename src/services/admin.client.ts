/**
 * Browser-side client for the `/api/admin/*` endpoints.
 *
 * The System Admin modals previously mutated React state and showed an
 * `alert()`, so every change vanished on refresh. They now call through here.
 * Pure I/O — no React, no state; the provider owns what to do with the results.
 */
import { http } from "./http";
import { SystemRole } from "../enums/roles";
import { PermissionAction, PermissionResource } from "../enums/permissions";
import {
  AdminUserDto,
  BudgetPeriodDto,
  DepartmentDto,
  DepartmentSpendDto,
  LogDto,
  RolePermissionDto,
  WorkflowStepDto,
} from "../types/api";
import { IBudgetLineItem } from "../types/domain";

export interface DepartmentInput {
  name: string;
  description?: string;
  headUserId?: string | null;
}

export interface UserProfileInput {
  name?: string;
  email?: string;
  role?: SystemRole;
  departmentId?: string | null;
  officialContact?: string;
  personalContact?: string;
  avatar?: string;
}

export interface BudgetPeriodInput {
  departmentId: string;
  periodName: string;
  totalBudget: number;
  lineItems?: IBudgetLineItem[];
  startDate: string;
  endDate: string;
}

export const AdminClient = {
  /* ----- Departments ----- */

  listDepartments: () =>
    http
      .get<{ departments: DepartmentDto[] }>("/api/admin/departments")
      .then((r) => r.departments),

  createDepartment: (input: DepartmentInput) =>
    http
      .post<{ department: DepartmentDto }>("/api/admin/departments", { ...input })
      .then((r) => r.department),

  updateDepartment: (id: string, input: Partial<DepartmentInput> & { isActive?: boolean }) =>
    http
      .put<{ department: DepartmentDto }>(`/api/admin/departments/${id}`, { ...input })
      .then((r) => r.department),

  deleteDepartment: (id: string) => http.delete<{ id: string }>(`/api/admin/departments/${id}`),

  /* ----- Users ----- */

  listUsers: () =>
    http
      .get<{ users: AdminUserDto[]; departments: { id: string; name: string }[] }>(
        "/api/admin/invite"
      ),

  inviteUser: (input: { name: string; email: string; role: string; departmentId?: string }) =>
    http.post<{ inviteUrl: string; message: string; user: AdminUserDto }>(
      "/api/admin/invite",
      { ...input }
    ),

  updateUser: (id: string, input: UserProfileInput) =>
    http.put<{ user: AdminUserDto }>(`/api/admin/users/${id}`, { ...input }),

  setUserActive: (id: string, isActive: boolean) =>
    http.patch<{ user: { id: string; isActive: boolean } }>(`/api/admin/users/${id}`, { isActive }),

  deleteUser: (id: string) => http.delete<{ id: string }>(`/api/admin/users/${id}`),

  /** Force Log Out — ends every active session for the user. */
  revokeUserSessions: (id: string) =>
    http.delete<{ id: string; name: string }>(`/api/admin/users/${id}/sessions`),

  /* ----- Budgets ----- */

  listBudgets: () =>
    http.get<{ budgets: DepartmentSpendDto[]; periods: BudgetPeriodDto[] }>("/api/admin/budgets"),

  saveBudgetPeriod: (input: BudgetPeriodInput) =>
    http.post<{ budgets: DepartmentSpendDto[]; periods: BudgetPeriodDto[] }>(
      "/api/admin/budgets",
      { ...input }
    ),

  /* ----- Roles & permissions ----- */

  listRoles: () =>
    http.get<{ roles: RolePermissionDto[] }>("/api/admin/roles").then((r) => r.roles),

  updateRole: (input: {
    role: SystemRole;
    grants: Partial<Record<PermissionResource, PermissionAction[]>>;
    description?: string;
    isActive?: boolean;
  }) => http.put<{ roles: RolePermissionDto[] }>("/api/admin/roles", { ...input }).then((r) => r.roles),

  /* ----- Workflow & logs ----- */

  getWorkflow: () =>
    http.get<{ steps: WorkflowStepDto[] }>("/api/admin/workflow").then((r) => r.steps),

  saveWorkflow: (steps: WorkflowStepDto[]) =>
    http.post<{ steps: WorkflowStepDto[] }>("/api/admin/workflow", { steps }).then((r) => r.steps),

  listLogs: (type?: string) =>
    http
      .get<{ logs: LogDto[] }>(
        type && type !== "ALL" ? `/api/admin/logs?type=${encodeURIComponent(type)}` : "/api/admin/logs"
      )
      .then((r) => r.logs),
};
