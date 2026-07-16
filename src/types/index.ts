import { SystemRole } from "../enums/roles";
import { RequestStatus } from "../enums/statuses";
import { LogType } from "../enums/logTypes";

export interface IUser {
  _id?: string;
  email: string;
  name: string;
  role: SystemRole;
  departmentId?: string; // Reference to Department
  isActive: boolean;
  createdAt?: Date;
}

export interface IDepartment {
  _id?: string;
  name: string;
  description?: string;
  createdAt?: Date;
}

export interface IBudgetPeriod {
  _id?: string;
  departmentId: string;
  periodName: string; // e.g. "Q3-2026", "2026-July"
  totalBudget: number;
  utilisedBudget: number;
  pendingBudget: number; // Allocated/locked for in-flight requests
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

export interface IExpenseRequest {
  _id?: string;
  requestNumber: string; // e.g. "EXP-2026-0001"
  departmentId: string;
  initiatorId: string;
  category: string;
  description: string;
  amount: number;
  supportingDocument: string; // File name or URL (mandatory)
  vendorName: string;
  vendorBankDetails: {
    accountNumber: string;
    bankName: string;
    accountName: string;
  };
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
  details?: any; // Stack traces, input payloads, diffs
  actorId?: string;
  actorName?: string;
  actorRole?: SystemRole;
  ipAddress?: string;
  timestamp: Date;
}
