/**
 * The slice of a request the Finance Manager is permitted to see.
 *
 * Their job is to release a payment that has already cleared approval and a
 * finance audit — not to re-open the commercial decision — so they receive the
 * initiator, the department, the payee account details, the description, the
 * amount and every justification attached along the way. Vendor identity,
 * expense category, budget position and the approval history are withheld.
 *
 * Enforced by the API routes that serve request data. Keeping it in one place
 * means a new field added to the model is withheld by default rather than
 * leaking because a second projection was not updated to match.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A justification a reviewer recorded while the request travelled the chain. */
interface JustificationView {
  authorName: string;
  authorRole: string;
  message: string;
  timestamp: Date | string;
}

export interface FinanceManagerRequestView {
  _id: string;
  requestNumber: string;
  status: string;
  amount: number;
  description: string;
  initiatorId: { _id?: string; name?: string } | null;
  departmentId: { _id?: string; name?: string } | null;
  vendorBankDetails: { accountNumber: string; bankName: string; accountName: string } | null;
  requiredPaymentDate?: Date | string;
  attachments: { name: string; url: string }[];
  justifications: JustificationView[];
  /** Set once released, so the manager can see their own completed payments. */
  paymentReference?: string;
  paymentDate?: Date | string;
  /**
   * The transfer evidence they themselves uploaded. Withholding it left the one
   * person who filed the receipt unable to read it back: their Completed
   * Release view fell through to an invented filename and a dead link.
   */
  paymentReceipt?: string;
  paymentReceiptFile?: { name: string; url: string; mimeType?: string; size?: number; isLegacy?: boolean } | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Reduces a request document to the Finance Manager's permitted fields.
 *
 * The comments carried on `history` are the justifications reviewers wrote; the
 * transitions they are attached to are not exposed, so the manager reads why the
 * spend was defended without inheriting who decided what and when.
 */
export function scopeForFinanceManager(request: any): FinanceManagerRequestView {
  const history: any[] = Array.isArray(request.history) ? request.history : [];

  const justifications = history
    .filter((entry) => entry?.comment?.trim())
    .map((entry) => ({
      authorName: entry.actorName,
      authorRole: entry.actorRole,
      message: entry.comment.trim(),
      timestamp: entry.timestamp,
    }));

  const attachments: { name: string; url: string }[] = (request.attachments ?? []).map(
    (a: any) => ({ name: a.name, url: a.url })
  );

  return {
    _id: String(request._id),
    requestNumber: request.requestNumber,
    status: request.status,
    amount: request.amount,
    description: request.description,
    initiatorId: request.initiatorId
      ? { _id: request.initiatorId._id?.toString(), name: request.initiatorId.name }
      : null,
    departmentId: request.departmentId
      ? { _id: request.departmentId._id?.toString(), name: request.departmentId.name }
      : null,
    vendorBankDetails: request.vendorBankDetails
      ? {
          accountNumber: request.vendorBankDetails.accountNumber,
          bankName: request.vendorBankDetails.bankName,
          accountName: request.vendorBankDetails.accountName,
        }
      : null,
    requiredPaymentDate: request.requiredPaymentDate,
    attachments,
    justifications,
    paymentReference: request.paymentReference,
    paymentDate: request.paymentDate,
    paymentReceipt: request.paymentReceipt,
    paymentReceiptFile: request.paymentReceiptFile ?? null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}
