/**
 * Wire-format types — what the API actually sends to the browser.
 *
 * These differ from `./domain.ts` in two ways that matter to components:
 * populated references arrive as nested objects rather than id strings, and
 * dates arrive as ISO strings. Components should import from here, never from
 * `./domain.ts`, so a `.toLocaleDateString()` on a string is caught at compile
 * time rather than in the browser.
 */
import { SystemRole } from "../enums/roles";
import { RequestStatus } from "../enums/statuses";
import { LogType } from "../enums/logTypes";
import { PermissionAction, PermissionResource } from "../enums/permissions";
import { IVendorBankDetails, PermissionGrants } from "./domain";

/** Every route returns this envelope; `withErrorHandling` guarantees the shape. */
export type ApiResult<T> = ({ success: true } & T) | ApiError;

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

/** A `departmentId` / `initiatorId` after Mongoose `.populate()`. */
export interface PopulatedRef {
  _id: string;
  name: string;
  email?: string;
}

export interface WorkflowHistoryDto {
  statusBefore: RequestStatus;
  statusAfter: RequestStatus;
  actorId: string;
  actorName: string;
  actorRole: SystemRole;
  action: string;
  comment?: string;
  timestamp: string;
}

export interface ExpenseRequestDto {
  _id: string;
  requestNumber: string;
  departmentId: PopulatedRef | string | null;
  initiatorId: PopulatedRef | string | null;
  category: string;
  description: string;
  amount: number;
  supportingDocument: string;
  vendorName: string;
  vendorBankDetails: IVendorBankDetails;
  requiredPaymentDate: string;
  status: RequestStatus;
  exceptionalBudgetApproved?: boolean;
  exceptionalApprovedBy?: PopulatedRef | string | null;
  originalAmount?: number;
  paymentReceipt?: string;
  paymentReference?: string;
  paymentDate?: string;
  currentStepIndex: number;
  history: WorkflowHistoryDto[];
  createdAt: string;
  updatedAt: string;
}

/** The authenticated user as returned by `/api/auth/me`. */
export interface SessionUserDto {
  id: string;
  email: string;
  name: string;
  role: SystemRole;
  departmentId: string | null;
  departmentName?: string | null;
  officialContact?: string;
  personalContact?: string;
  avatar?: string;
  /** Effective permissions resolved from the role matrix, for UI gating. */
  permissions?: PermissionGrants;
}

/** A row in the Admin user directory. */
export interface AdminUserDto {
  id: string;
  email: string;
  name: string;
  role: SystemRole;
  isActive: boolean;
  department: { id: string; name: string } | null;
  departmentName?: string;
  officialContact?: string;
  personalContact?: string;
  avatar?: string;
  isInvited: boolean;
  inviteExpires?: string | null;
}

export interface DepartmentDto {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  headUserId: string | null;
  headName: string | null;
  usersCount: number;
}

/** Aggregated departmental budget figures for the oversight dashboards. */
export interface DepartmentSpendDto {
  id: string;
  name: string;
  description: string;
  totalBudget: number;
  utilised: number;
  pending: number;
  remaining: number;
  pctUsed: number;
  topRequester: string;
  overBudgetCount: number;
  /** True when no budget period is configured — screens must show a setup prompt
   *  rather than presenting zeroes as though they were real figures. */
  hasBudget: boolean;
  isActive: boolean;
}

export interface BudgetPeriodDto {
  id: string;
  departmentId: string;
  departmentName: string;
  periodName: string;
  totalBudget: number;
  utilisedBudget: number;
  pendingBudget: number;
  availableBudget: number;
  lineItems: { name: string; description?: string; amount: number }[];
  startDate: string;
  endDate: string;
}

export interface LogDto {
  _id: string;
  type: LogType;
  action: string;
  message: string;
  details?: unknown;
  actorId?: string;
  actorName?: string;
  actorRole?: SystemRole;
  ipAddress?: string;
  timestamp: string;
}

export interface RolePermissionDto {
  role: SystemRole;
  description: string;
  isActive: boolean;
  grants: Record<PermissionResource, PermissionAction[]>;
  /** Count of users currently holding this role, shown on the matrix header. */
  userCount: number;
}

export interface WorkflowStepDto {
  stepIndex: number;
  stepName: string;
  role: SystemRole;
  minAmount: number;
  requiresAllApprovals: boolean;
}

/** Payload of `/api/admin/stats`, consumed by the KPI cards and charts. */
export interface DashboardStatsDto {
  corporate: {
    totalBudget: number;
    utilisedBudget: number;
    pendingBudget: number;
    availableBudget: number;
  };
  requests: {
    totalCount: number;
    totalAmount: number;
    exceptionalCount: number;
    statusCounts: Partial<Record<RequestStatus, number>>;
  };
  categorySpends: Record<string, number>;
  departmentBudgets: BudgetPeriodDto[];
}
