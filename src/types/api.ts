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

/** A file attached to a request, as returned by the API. */
export interface AttachmentDto {
  _id?: string | null;
  name: string;
  url: string;
  publicId?: string;
  size?: number;
  mimeType?: string;
  uploadedById?: string;
  uploadedByName?: string;
  uploadedAt?: string;
  /** True for records whose file predates the upload integration. */
  isLegacy?: boolean;
}

/** What the client sends when attaching an already-uploaded file. */
export interface AttachmentInput {
  name: string;
  url: string;
  publicId?: string;
  size?: number;
  mimeType?: string;
}

export interface ExpenseRequestDto {
  _id: string;
  requestNumber: string;
  departmentId: PopulatedRef | string | null;
  initiatorId: PopulatedRef | string | null;
  category: string;
  description: string;
  amount: number;
  /** Canonical list; back-filled from the legacy field for older records. */
  attachments: AttachmentDto[];
  supportingDocuments: AttachmentDto[];
  /** @deprecated Read `attachments` instead. */
  supportingDocument?: string;
  vendorName: string;
  vendorBankDetails: IVendorBankDetails;
  requiredPaymentDate: string;
  status: RequestStatus;
  /** The budget item the approver booked this request against. */
  budgetItemId?: string;
  budgetItemName?: string;
  /** Deficit left on that item; 0 when it fits. Drives the exception routing. */
  budgetShortfall?: number;
  /**
   * Held because the department had no budget period covering the payment date.
   * Shares INSUFFICIENT_BUDGET with a real overrun, so screens must read this to
   * tell "nothing to reserve against yet" from "over the ceiling".
   */
  awaitingBudgetPeriod?: boolean;
  /**
   * Name of the approval step a PENDING_APPROVAL request is waiting on, so the
   * UI can tell the approver's queue from the Finance Officer's. Resolved
   * server-side against the configured chain; absent for every other status.
   */
  currentStageName?: string;
  /** Role the active step belongs to; separates the two PENDING_APPROVAL queues. */
  currentStageRole?: string;
  exceptionalBudgetApproved?: boolean;
  exceptionalApprovedBy?: PopulatedRef | string | null;
  originalAmount?: number;
  /** @deprecated Raw URL of the receipt; read `paymentReceiptFile` instead. */
  paymentReceipt?: string;
  /** The transfer evidence, resolved by the model for every reader. */
  paymentReceiptFile?: AttachmentDto | null;
  paymentReference?: string;
  paymentDate?: string;
  currentStepIndex: number;
  history: WorkflowHistoryDto[];
  createdAt: string;
  updatedAt: string;
}

/**
 * A request as `GET /api/expenses` actually returns it: department and
 * initiator are populated, so screens can read `.name` off them directly
 * instead of widening the row to `any`.
 */
export type PopulatedExpenseDto = Omit<ExpenseRequestDto, "departmentId" | "initiatorId"> & {
  departmentId?: PopulatedRef | null;
  initiatorId?: (PopulatedRef & { employeeId?: string }) | null;
  /** Set once a Finance Head grants a one-time expansion. */
  exceptionalBudgetAmount?: number;
  exceptionalApprovedAt?: string;
  /** Inferred on release when the reference does not encode it. */
  paymentMethod?: string;
};

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
/**
 * Outcome of `POST /api/admin/invite`.
 *
 * The account is created whether or not the email leaves the building, so the
 * delivery fields are reported separately from `success` — an admin needs to
 * know the difference between "they have been invited" and "the account exists
 * but nobody told them".
 */
export interface InviteResultDto {
  inviteUrl: string;
  message: string;
  /** False when the provider refused the message. */
  emailSent: boolean;
  /** True when no real provider is configured and the mail was only logged. */
  emailSimulated: boolean;
  /** Provider's reason, present when `emailSent` is false. */
  emailError?: string;
  user: AdminUserDto;
}

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
  /** Deleted and awaiting purge — the row stays visible and offers Restore. */
  isPendingDeletion: boolean;
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
  /** One-time expansions granted against this period, already inside `totalBudget`. */
  expansionsGranted: number;
  utilisedBudget: number;
  pendingBudget: number;
  availableBudget: number;
  /** The department's budget items, each with its own ledger. */
  lineItems: {
    id: string;
    name: string;
    description?: string;
    /** The administrator's allocation, before any granted expansion. */
    amount: number;
    utilised: number;
    pending: number;
    expansionsGranted: number;
    /** Allocation plus expansions, less utilised and pending. */
    available: number;
  }[];
  startDate: string;
  endDate: string;
}

export interface RequestCommentDto {
  id: string;
  requestId: string;
  authorName: string;
  authorRole: SystemRole;
  message: string;
  isInternal: boolean;
  timestamp: string;
}

/**
 * One row of a request's communication thread. `TRANSITION` entries come from
 * the workflow history, `COMMENT` entries from the comment collection; the
 * designs interleave both in a single chronological timeline.
 */
export interface ThreadEntryDto {
  id: string;
  kind: "TRANSITION" | "COMMENT";
  authorName: string;
  authorRole: SystemRole;
  message: string;
  /** Present on transitions, e.g. "Approve Step: Departmental Approval". */
  action?: string;
  isInternal: boolean;
  timestamp: string;
}

/** One budget item within the deciding department's period. */
export interface BudgetLineContextDto {
  id: string;
  category: string;
  /** The item's ceiling: allocation plus any granted expansions. */
  allocated: number;
  /** Real headroom from the item's own ledger. */
  remaining: number;
  utilised: number;
  pending: number;
  expansionsGranted: number;
  /** True when the request is attached to this item — highlighted in the design. */
  isRequestCategory: boolean;
}

/**
 * The budget picture an approver needs to decide an over-budget request
 * (designs/finance-head/Request Detail with Budget & Communication Thread).
 * Resolved from the request's department and required payment date.
 */
export interface BudgetContextDto {
  requestId: string;
  requestAmount: number;
  departmentName: string;
  /** e.g. "IT Dept - FY 2026"; empty when no period covers the payment date. */
  periodLabel: string;
  hasBudget: boolean;
  /** The effective ceiling — the allocation plus any granted expansions. */
  totalBudget: number;
  /** Portion of `totalBudget` that came from one-time expansions. */
  expansionsGranted: number;
  utilisedYTD: number;
  pending: number;
  remaining: number;
  /** Shortfall against the department's ceiling; 0 when it fits. */
  criticalGap: number;
  /**
   * Shortfall on the budget item the request is booked against — what a
   * one-time expansion actually has to cover.
   *
   * Distinct from `criticalGap`, and the figure the Finance Head is deciding
   * on: a department can have ample headroom while the single item the spend
   * is charged to is exhausted, in which case the department gap reads zero
   * and only this is non-zero.
   */
  itemShortfall: number;
  /** The item being expanded; null when the request was never attached to one. */
  attachedItem: BudgetLineContextDto | null;
  /** Requested against available — what the flow's Scenario B asks be justified. */
  variance: {
    requested: number;
    available: number;
    /** Requested less available, floored at zero. Mirrors `criticalGap`. */
    amount: number;
    /** The gap as a percentage of what was available. */
    pct: number;
  };
  /** Earlier periods' utilisation, newest first, for the deficit analysis. */
  historicalTrend: BudgetTrendPointDto[];
  lineItems: BudgetLineContextDto[];
}

/**
 * A budget item offered to the approver when attaching a request, with the
 * headroom needed to see whether it covers the request or will need expanding.
 */
export interface BudgetItemOptionDto {
  id: string;
  name: string;
  description?: string;
  allocated: number;
  expansionsGranted: number;
  utilised: number;
  pending: number;
  available: number;
  /** False when attaching here would overrun the item. */
  coversRequest: boolean;
  isAttached: boolean;
}

/** One period's consumption, for the deficit analysis' historical trend. */
export interface BudgetTrendPointDto {
  periodName: string;
  totalBudget: number;
  utilised: number;
  /** Utilised plus locked, as a percentage of the ceiling. */
  pctUsed: number;
  startDate: string;
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

/** One page of the audit log feed, as returned by `GET /api/admin/logs`. */
export interface LogPageDto {
  logs: LogDto[];
  /** Rows matching the filters across the whole collection, not just this page. */
  total: number;
  /** Echoed back clamped to the available range. */
  page: number;
  limit: number;
  totalPages: number;
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
