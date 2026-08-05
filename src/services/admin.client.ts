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
  InviteResultDto,
  LogPageDto,
  RolePermissionDto,
  WorkflowStepDto,
} from "../types/api";
import { IBudgetLineItem } from "../types/domain";

/**
 * A budget item as the admin screens send it.
 *
 * `id` is the item's own identity, round-tripped from the period so an edit
 * keeps its ledger — a rename without it reads server-side as a delete plus an
 * insert, discarding the item's recorded spend and orphaning every request
 * booked against it. Omitted for an item the administrator has just added.
 */
export type BudgetItemInput = IBudgetLineItem & { id?: string };

/** Everything `POST /api/admin/invite` needs, and all a retry has to replay. */
export interface InviteInput {
  name: string;
  email: string;
  role: string;
  departmentId?: string;
}

export interface DepartmentInput {
  name: string;
  description?: string;
  headUserId?: string | null;
  /**
   * Opening allocation, created with the department in a single call.
   *
   * Accepted only on create: a department with no budget period cannot accept
   * a request at all, so funding it in the same step is what makes it usable.
   */
  budget?: {
    periodName: string;
    totalBudget: number;
    lineItems?: BudgetItemInput[];
    startDate: string;
    endDate: string;
  };
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

/** Audit Trail filter bar + pager, serialised onto `GET /api/admin/logs`. */
export interface LogQueryParams {
  type?: string;
  action?: string;
  user?: string;
  reference?: string;
  /** ISO timestamp lower bound; computed client-side so it honours the local clock. */
  from?: string;
  page?: number;
  limit?: number;
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

  /** Deletes a department; the response reports what the cascade touched. */
  deleteDepartment: (id: string) =>
    http.delete<{ id: string; name: string; cancelledRequests: number; revokedUsers: number }>(
      `/api/admin/departments/${id}`
    ),

  restoreDepartment: (id: string) =>
    http.patch<{ id: string; name: string; reinstatedRequests: number; reassignedUsers: number }>(
      `/api/admin/departments/${id}`,
      { isActive: true }
    ),

  /* ----- Users ----- */

  listUsers: () =>
    http
      .get<{ users: AdminUserDto[]; departments: { id: string; name: string }[] }>(
        "/api/admin/invite"
      ),

  /**
   * Creates or re-invites a user. Re-posting the same email inside the invite
   * window issues a fresh token and re-sends — which is what the retry action
   * on a failed delivery calls.
   */
  inviteUser: (input: InviteInput) => http.post<InviteResultDto>("/api/admin/invite", { ...input }),

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

  /**
   * One page of audit logs. Filtering and paging are done by the database, so
   * callers must pass their filters here rather than slicing the result.
   */
  listLogs: (params: LogQueryParams = {}) => {
    const query = new URLSearchParams();
    // "ALL" is the UI's no-filter sentinel, not a stored log type.
    if (params.type && params.type !== "ALL") query.set("type", params.type);
    if (params.action) query.set("action", params.action);
    if (params.user) query.set("user", params.user);
    if (params.reference) query.set("reference", params.reference);
    if (params.from) query.set("from", params.from);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    const suffix = query.toString();
    return http.get<LogPageDto>(`/api/admin/logs${suffix ? `?${suffix}` : ""}`);
  },
};
