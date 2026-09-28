"use client";

/**
 * ViewReceiptModal — the payment confirmation opened from a "Payment
 * Completed" notification, which every participant on a request receives.
 *
 * Everything on this card used to be invented. The bank reference fell back to
 * "BNK-2026-0829-01", the category to "Software & Services", the request id to
 * "REQ-0482", and "Date Cleared" rendered `new Date()` — today's date, on every
 * payment ever made. The receipt itself, the one document the dialog exists to
 * present, was never shown at all: the card only opened when a receipt existed
 * and then had no way to reach it.
 *
 * The payment facts and the receipt now come off the request through the shared
 * PaymentRecordCard, so this dialog reads exactly what the request profile and
 * the finance screens read.
 */

import React from "react";
import * as Icons from "lucide-react";
import { PaymentRecordCard } from "../ui/PaymentRecordCard";
import { AttachmentDto } from "../../types/api";
import { formatNaira, humanizeStatus } from "../ui/format";

interface ViewReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * The released request, as the list endpoint returns it. Structurally typed:
   * the provider holds it untyped, and only these fields are read.
   */
  selectedReceiptData:
    | (React.ComponentProps<typeof PaymentRecordCard>["expense"] & {
        description?: string;
      })
    | null;
  /** Opens the receipt in the shared attachment viewer. */
  onViewReceipt?: (attachment: AttachmentDto & { requestNumber?: string }) => void;
}

export const ViewReceiptModal: React.FC<ViewReceiptModalProps> = ({
  isOpen,
  onClose,
  selectedReceiptData,
  onViewReceipt,
}) => {
  if (!isOpen || !selectedReceiptData) return null;

  const expense = selectedReceiptData;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 105, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem", overflowY: "auto" }}>
      <div className="glass-panel wrap-anywhere" style={{ width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Transaction Invoice Receipt</span>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer", flexShrink: 0 }}>
            <Icons.X size={20} />
          </button>
        </div>

        {/* Headline: what was paid, on which request */}
        <div style={{ padding: "1.5rem", background: "rgb(var(--color-card-border) / 0.1)", borderRadius: "12px", border: "1px solid rgb(var(--color-card-border) / 0.2)", display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(16,185,129,0.15)", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.CheckCircle size={28} />
          </div>

          {/* Shared helper; the `|| 12000` that used to sit here invented a
              design sample amount whenever the receipt carried none. */}
          <h4 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{formatNaira(expense.amount)}</h4>
          <span className={`badge badge-${String(expense.status).toLowerCase()}`}>
            {humanizeStatus(expense.status)}
          </span>

          <div style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>
            {expense.requestNumber}
            {expense.description ? ` • ${expense.description}` : ""}
          </div>
        </div>

        {/* The payment record and its receipt — the same card the request
            profile and the finance screens render. */}
        <PaymentRecordCard expense={expense} onViewReceipt={onViewReceipt} hideAmount />

        <button onClick={onClose} className="btn btn-primary" style={{ width: "100%" }}>
          Done / Close
        </button>
      </div>
    </div>
  );
};
