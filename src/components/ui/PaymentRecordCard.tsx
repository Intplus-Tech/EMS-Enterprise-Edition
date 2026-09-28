"use client";

/**
 * PaymentRecordCard — the released payment and the receipt evidencing it.
 *
 * Rendered wherever a paid request is shown, so every person connected to the
 * request reads the same record: the initiator on their own request profile,
 * the departmental approver and Finance Head on the same dialog, the Finance
 * Officer and Manager on their completed-release views, and anyone opening the
 * "payment completed" notification.
 *
 * The receipt used to be reachable only from the two finance screens, and even
 * there it was rendered as a raw Cloudinary URL behind a link that did not
 * open — so the person who raised the request could never see the evidence
 * their money had actually moved.
 *
 * Presentational: opening the receipt is the caller's job (engineering rule
 * 1-D), which is what routes it through the same AttachmentViewModal every
 * other document uses.
 */

import React from "react";
import * as Icons from "lucide-react";
import { AttachmentDto } from "../../types/api";
import { formatDateTime, formatNairaPrecise, paymentMethodOf } from "./format";
import { formatFileSize } from "../../domains/attachments/attachment.rules";

interface PaymentRecordCardProps {
  /** The released request. Anything not yet paid renders nothing. */
  expense: {
    status?: string;
    amount?: number;
    paymentReference?: string | null;
    paymentMethod?: string | null;
    paymentDate?: string | Date | null;
    paymentReceiptFile?: AttachmentDto | null;
    paymentReceipt?: string | null;
    requestNumber?: string;
  } | null | undefined;
  /** Opens the receipt in the shared attachment viewer. */
  onViewReceipt?: (receipt: AttachmentDto) => void;
  /** Hides the amount tile where the surrounding dialog already shows it. */
  hideAmount?: boolean;
}

/** Statuses in which a payment record exists to be shown. */
const RELEASED = ["PAID", "CLOSED"];

export const PaymentRecordCard: React.FC<PaymentRecordCardProps> = ({
  expense,
  onViewReceipt,
  hideAmount = false,
}) => {
  // Nothing has been released, so there is no record — not an empty one.
  if (!expense || !RELEASED.includes(String(expense.status))) return null;

  const receipt = expense.paymentReceiptFile ?? null;
  // A receipt with no absolute URL predates the upload integration (or was
  // seeded), so there is a name to show but no file to open.
  const openable = Boolean(receipt?.url && !receipt?.isLegacy && onViewReceipt);

  return (
    <div
      className="glass-card"
      style={{
        background: "rgb(var(--color-secondary) / 0.06)",
        border: "1px solid rgb(var(--color-secondary) / 0.28)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Header — the payment is the outcome, so it is labelled as settled */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <Icons.CheckCircle2 size={18} style={{ color: "rgb(var(--color-secondary))", flexShrink: 0 }} />
        <h4
          style={{
            margin: 0,
            fontSize: "0.85rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "rgb(var(--color-secondary))",
          }}
        >
          Payment Record
        </h4>
      </div>

      {/* Payment facts — every value is the request's own; none is invented */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1rem",
          fontSize: "0.9rem",
        }}
      >
        {!hideAmount && (
          <Fact label="Amount Paid" value={formatNairaPrecise(expense.amount)} />
        )}
        <Fact label="Bank Reference" value={expense.paymentReference || "—"} mono />
        <Fact label="Payment Method" value={paymentMethodOf(expense)} />
        <Fact
          label="Date Paid"
          value={expense.paymentDate ? formatDateTime(expense.paymentDate) : "—"}
        />
      </div>

      {/* Receipt row — the evidence itself */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "0.8rem 1rem",
          borderRadius: "0.6rem",
          border: "1px solid rgb(var(--color-card-border) / 0.6)",
          background: "rgb(var(--color-card))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
          <Icons.FileText size={18} style={{ color: "#2563EB", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {receipt?.name || "No receipt on file"}
            </div>
            <div style={{ fontSize: "0.72rem", color: "rgb(var(--color-text-muted))" }}>
              {receipt
                ? [
                    "Proof of payment",
                    receipt.uploadedByName ? `Uploaded by ${receipt.uploadedByName}` : "",
                    formatFileSize(receipt.size),
                  ]
                    .filter(Boolean)
                    .join(" • ")
                : "The release was recorded without stored evidence."}
            </div>
          </div>
        </div>

        {openable && (
          <button
            type="button"
            onClick={() => onViewReceipt!(receipt!)}
            className="btn btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              flexShrink: 0,
              padding: "0.45rem 0.9rem",
              fontSize: "0.82rem",
            }}
          >
            <Icons.Eye size={15} /> View Receipt
          </button>
        )}

        {/* A legacy record names a file that was never stored, so say so
            rather than offering a link that opens nothing. */}
        {receipt && !openable && (
          <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))", flexShrink: 0 }}>
            Not available to view
          </span>
        )}
      </div>
    </div>
  );
};

/** Label over value, the layout the surrounding dialogs already use. */
const Fact: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono = false,
}) => (
  <div style={{ minWidth: 0 }}>
    <span
      style={{
        display: "block",
        fontSize: "0.72rem",
        color: "rgb(var(--color-text-dim))",
        marginBottom: "0.2rem",
      }}
    >
      {label}
    </span>
    <strong
      className="wrap-anywhere"
      style={{ fontSize: "0.9rem", fontFamily: mono ? "monospace" : undefined }}
    >
      {value}
    </strong>
  </div>
);
