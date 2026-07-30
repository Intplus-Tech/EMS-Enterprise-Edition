/**
 * Browser-side client for `/api/expenses/*`.
 *
 * Consolidates calls that were previously inlined in `ApprovalsTab` and
 * `PendingExceptionsTab` — presentational components must receive callbacks
 * rather than perform I/O (engineering rule 1-D).
 */
import { http } from "./http";
import { WorkflowActionType } from "../enums/workflowActions";
import { ExpenseRequestDto } from "../types/api";

export interface ExpenseInput {
  category: string;
  description: string;
  amount: number;
  supportingDocument: string;
  vendorName: string;
  vendorBankDetails: { accountNumber: string; bankName: string; accountName: string };
  requiredPaymentDate: string;
}

export const ExpenseClient = {
  list: () =>
    http.get<{ expenses: ExpenseRequestDto[] }>("/api/expenses").then((r) => r.expenses),

  get: (id: string) =>
    http.get<{ expense: ExpenseRequestDto }>(`/api/expenses/${id}`).then((r) => r.expense),

  create: (input: ExpenseInput) =>
    http.post<{ request: ExpenseRequestDto }>("/api/expenses", { ...input }).then((r) => r.request),

  update: (id: string, input: ExpenseInput) =>
    http.put<{ expense: ExpenseRequestDto }>(`/api/expenses/${id}`, { ...input }).then((r) => r.expense),

  submit: (id: string) =>
    http.post<{ request: ExpenseRequestDto }>(`/api/expenses/${id}/submit`),

  cancel: (id: string) => http.post<{ expense: ExpenseRequestDto }>(`/api/expenses/${id}/cancel`),

  /** Standard approver decision on the current workflow step. */
  workflowAction: (id: string, action: WorkflowActionType, comment?: string) =>
    http.post<{ request: ExpenseRequestDto }>(`/api/expenses/${id}/workflow`, { action, comment }),

  /** Finance Head decision on an over-budget request. */
  exceptionalAction: (
    id: string,
    action: WorkflowActionType,
    comment?: string,
    adjustedAmount?: number
  ) =>
    http.post<{ request: ExpenseRequestDto }>(`/api/expenses/${id}/exceptional`, {
      action,
      comment,
      adjustedAmount: adjustedAmount && adjustedAmount > 0 ? adjustedAmount : undefined,
    }),

  /** Finance Officer confirms documentation and uploads the bank instruction. */
  financeUpload: (id: string) =>
    http.post<{ request: ExpenseRequestDto }>(`/api/expenses/${id}/upload`),

  /** Finance Manager releases the payment and closes the request. */
  releasePayment: (id: string, reference: string, receipt?: string) =>
    http.post<{ request: ExpenseRequestDto }>(`/api/expenses/${id}/release`, { reference, receipt }),

  /** Uploads a supporting document, returning the stored URL or filename. */
  uploadDocument: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      // Fall back to the local filename so the form still carries a reference
      // and the user is not blocked by a transient storage outage.
      return file.name;
    }

    const data = await res.json();
    return data.url || data.publicId || data.name || file.name;
  },
};
