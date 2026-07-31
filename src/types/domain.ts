/**
 * Persistence-shaped entity interfaces — these mirror the Mongoose schemas in
 * `src/models/` one-for-one. Anything the API reshapes before sending to the
 * browser belongs in `./api.ts` instead, not here.
 */
import { SystemRole } from "../enums/roles";
import { RequestStatus } from "../enums/statuses";
import { LogType } from "../enums/logTypes";
import { PermissionAction, PermissionResource } from "../enums/permissions";

export interface IUser {
  _id?: string;
  email: string;
  name: string;
  role: SystemRole;
  departmentId?: string; // Reference to Department
  isActive: boolean;
  officialContact?: string;
  personalContact?: string;
  avatar?: string;
  createdAt?: Date;
}

export interface IDepartment {
  _id?: string;
  name: string;
  description?: string;
  headUserId?: string; // Departmental approver shown in the Edit Department modal
  isActive?: boolean;
  createdAt?: Date;
}

/** A single allocation line inside a department's budget period. */
export interface IBudgetLineItem {
  name: string;
  description?: string;
  amount: number;
}

export interface IBudgetPeriod {
  _id?: string;
  departmentId: string;
  periodName: string; // e.g. "Q3-2026", "2026-July"
  totalBudget: number;
  utilisedBudget: number;
  pendingBudget: number; // Allocated/locked for in-flight requests
  lineItems?: IBudgetLineItem[];
  startDate: Date;
  endDate: Date;
  createdAt?: Date;
}

export interface IWorkflowStep {
  stepIndex: number;
  stepName: string;
  role: SystemRole;
  minAmount?: number; // Conditional trigger (step is skipped if amount is less than this)
  requiresAllApprovals?: boolean; // True if every user with this role must approve (mocked)
}

export interface IWorkflowConfig {
  _id?: string;
  name: string;
  isActive: boolean;
  steps: IWorkflowStep[];
  updatedAt?: Date;
}

export interface IWorkflowHistory {
  statusBefore: RequestStatus;
  statusAfter: RequestStatus;
  actorId: string;
  actorName: string;
  actorRole: SystemRole;
  action: string; // e.g. "Submit", "Approve", "Reject", "Release"
  comment?: string;
  timestamp: Date;
}

export interface IVendorBankDetails {
  accountNumber: string;
  bankName: string;
  accountName: string;
}

/**
 * A file attached to an expense request.
 *
 * Requests carry a list of these rather than the single `supportingDocument`
 * string they used to: the designs show several documents per request
 * ("Invoice.pdf", "Quote.pdf") and reviewers can attach their own during the
 * workflow. `publicId` is retained so the file can be removed from Cloudinary
 * when the attachment is deleted.
 */
export interface IAttachment {
  _id?: string;
  name: string;
  /** Cloudinary secure URL, or a bare filename on records predating uploads. */
  url: string;
  publicId?: string;
  size?: number;
  mimeType?: string;
  uploadedById?: string;
  uploadedByName?: string;
  uploadedAt?: Date;
}

export interface IExpenseRequest {
  _id?: string;
  requestNumber: string; // e.g. "EXP-2026-0001"
  departmentId: string;
  initiatorId: string;
  category: string;
  description: string;
  amount: number;
  /** At least one is mandatory. */
  supportingDocuments: IAttachment[];
  /** @deprecated Mirrors `supportingDocuments[0]` for pre-multi-attachment readers. */
  supportingDocument?: string;
  vendorName: string;
  vendorBankDetails: IVendorBankDetails;
  requiredPaymentDate: Date;
  status: RequestStatus;

  // Exceptional budget details
  exceptionalBudgetApproved?: boolean;
  exceptionalApprovedBy?: string;
  originalAmount?: number; // If adjusted by Finance Head

  // Payment Release details
  paymentReceipt?: string;
  paymentReference?: string;
  paymentDate?: Date;

  // Workflow engine tracking
  currentStepIndex: number;
  history: IWorkflowHistory[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILog {
  _id?: string;
  type: LogType;
  action: string;
  message: string;
  details?: unknown; // Stack traces, input payloads, diffs
  actorId?: string;
  actorName?: string;
  actorRole?: SystemRole;
  ipAddress?: string;
  timestamp: Date;
}

/** Resource → allowed actions, as stored per role. */
export type PermissionGrants = Partial<Record<PermissionResource, PermissionAction[]>>;

export interface IRolePermission {
  _id?: string;
  role: SystemRole;
  grants: PermissionGrants;
  description?: string;
  isActive: boolean;
}
