/**
 * Browser-side client for `/api/expenses/*`.
 *
 * Consolidates calls that were previously inlined in `ApprovalsTab` and
 * `PendingExceptionsTab` — presentational components must receive callbacks
 * rather than perform I/O (engineering rule 1-D).
 */
import { http } from "./http";
import { WorkflowActionType } from "../enums/workflowActions";
import { AttachmentDto, AttachmentInput, BudgetContextDto, ExpenseRequestDto, ThreadEntryDto } from "../types/api";
import { MAX_ATTACHMENT_BYTES } from "../domains/attachments/attachment.rules";

export interface ExpenseInput {
  category: string;
  description: string;
  amount: number;
  /** At least one is required; the server rejects an empty set. */
  supportingDocuments: AttachmentInput[];
  vendorName: string;
  vendorBankDetails: { accountNumber: string; bankName: string; accountName: string };
  requiredPaymentDate: string;
}

export const ExpenseClient = {
  list: () =>
    http.get<{ expenses: ExpenseRequestDto[] }>("/api/expenses").then((r) => r.expenses),

  get: (id: string) =>
    http.get<{ expense: ExpenseRequestDto }>(`/api/expenses/${id}`).then((r) => r.expense),

  /** Communication thread: workflow transitions merged with free-text comments. */
  thread: (id: string) =>
    http.get<{ thread: ThreadEntryDto[] }>(`/api/expenses/${id}/comments`).then((r) => r.thread),

  addComment: (id: string, message: string, isInternal = false) =>
    http
      .post<{ thread: ThreadEntryDto[] }>(`/api/expenses/${id}/comments`, { message, isInternal })
      .then((r) => r.thread),

  /** Real budget position behind a request, for the approval screens. */
  budgetContext: (id: string) =>
    http
      .get<{ context: BudgetContextDto }>(`/api/expenses/${id}/budget-context`)
      .then((r) => r.context),

  create: (input: ExpenseInput) =>
    http.post<{ request: ExpenseRequestDto }>("/api/expenses", { ...input }).then((r) => r.request),

  update: (id: string, input: ExpenseInput) =>
    http.put<{ expense: ExpenseRequestDto }>(`/api/expenses/${id}`, { ...input }).then((r) => r.expense),

  submit: (id: string) =>
    http.post<{ request: ExpenseRequestDto }>(`/api/expenses/${id}/submit`),

  cancel: (id: string) => http.post<{ expense: ExpenseRequestDto }>(`/api/expenses/${id}/cancel`),

  /**
   * Standard approver decision on the current workflow step.
   * `signature` is the approver's account password, re-confirmed in the dialog
   * and verified server-side before the transition is applied.
   */
  workflowAction: (id: string, action: WorkflowActionType, comment: string | undefined, signature: string) =>
    http.post<{ request: ExpenseRequestDto }>(`/api/expenses/${id}/workflow`, { action, comment, signature }),

  /** Finance Head decision on an over-budget request. */
  exceptionalAction: (
    id: string,
    action: WorkflowActionType,
    comment: string | undefined,
    signature: string,
    adjustedAmount?: number
  ) =>
    http.post<{ request: ExpenseRequestDto }>(`/api/expenses/${id}/exceptional`, {
      action,
      comment,
      signature,
      adjustedAmount: adjustedAmount && adjustedAmount > 0 ? adjustedAmount : undefined,
    }),

  /** Finance Officer confirms documentation and uploads the bank instruction. */
  financeUpload: (id: string) =>
    http.post<{ request: ExpenseRequestDto }>(`/api/expenses/${id}/upload`),

  /**
   * Finance Manager releases the payment and closes the request.
   * `receipt` is the stored URL of the uploaded transfer evidence.
   */
  releasePayment: (id: string, reference: string, signature: string, receipt?: string) =>
    http.post<{ request: ExpenseRequestDto }>(`/api/expenses/${id}/release`, {
      reference,
      receipt,
      signature,
    }),

  /**
   * Uploads one file and returns a ready-to-attach descriptor.
   *
   * Throws on rejection (oversized file, storage outage) so the caller can
   * report which file failed rather than silently attaching a filename that
   * points at nothing.
   */
  uploadDocument: async (file: File): Promise<AttachmentInput> => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(
        `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)}MB. The maximum file size is 5MB.`
      );
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false) {
      throw new Error(data.error || `"${file.name}" could not be uploaded.`);
    }

    return {
      name: data.name || file.name,
      url: data.url,
      publicId: data.publicId,
      size: data.size ?? file.size,
      mimeType: data.mimeType || file.type,
    };
  },

  /** Records already-uploaded files against a request. */
  addAttachments: (id: string, attachments: AttachmentInput[]) =>
    http
      .post<{ attachments: AttachmentDto[] }>(`/api/expenses/${id}/attachments`, { attachments })
      .then((r) => r.attachments),

  removeAttachment: (id: string, attachmentId: string) =>
    http
      .delete<{ attachments: AttachmentDto[] }>(`/api/expenses/${id}/attachments/${attachmentId}`)
      .then((r) => r.attachments),
};
