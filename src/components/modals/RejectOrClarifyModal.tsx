"use client";

/**
 * RejectOrClarifyModal — the "Reject or Request Clarification" dialog from
 * `designs/approval/Comment Modal.png`.
 *
 * One dialog covers both negative outcomes because the design differs only in
 * the selected decision chip; the caller maps the decision onto the right API
 * action (REJECT vs RETURN).
 */

import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { ModalShell } from "../ui/ModalShell";
import { RequestReferenceCard } from "../ui/RequestReferenceCard";
import { ElectronicSignatureField } from "../ui/ElectronicSignatureField";

/** Minimum reason length enforced by the design's "Min. 20 characters" hint. */
const MIN_REASON_LENGTH = 20;

export type RejectDecision = "REJECT" | "CLARIFY";

export interface RejectOrClarifyPayload {
  decision: RejectDecision;
  reason: string;
  signature: string;
}

interface RejectOrClarifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: any;
  /** Pre-selects the chip when opened from a dedicated action button. */
  initialDecision?: RejectDecision;
  submitting?: boolean;
  onConfirm: (payload: RejectOrClarifyPayload) => void;
}

export const RejectOrClarifyModal: React.FC<RejectOrClarifyModalProps> = ({
  isOpen,
  onClose,
  expense,
  initialDecision = "REJECT",
  submitting = false,
  onConfirm,
}) => {
  const [decision, setDecision] = useState<RejectDecision>(initialDecision);
  const [reason, setReason] = useState("");
  const [signature, setSignature] = useState("");

  // The dialog stays mounted between openings, so `useState(initialDecision)`
  // only ever honoured the first value it saw: opening from "Reject" and then
  // from "Insufficient Budget" left the chip on whichever came first.
  useEffect(() => {
    if (isOpen) setDecision(initialDecision);
  }, [isOpen, initialDecision]);

  if (!isOpen || !expense) return null;

  const canSubmit = reason.trim().length >= MIN_REASON_LENGTH && signature.trim().length > 0 && !submitting;

  const reset = () => {
    setDecision(initialDecision);
    setReason("");
    setSignature("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const chipStyle = (active: boolean, accent: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    flex: 1,
    justifyContent: "center",
    padding: "0.6rem 0.75rem",
    borderRadius: "0.5rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    border: `1.5px solid ${active ? accent : "rgb(var(--color-card-border))"}`,
    background: active ? `${accent}1F` : "transparent",
    color: active ? accent : "rgb(var(--color-text-muted))",
  });

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title="Reject or Request Clarification"
      maxWidth="560px"
      footer={
        <>
          <button type="button" onClick={handleClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              onConfirm({ decision, reason, signature });
              reset();
            }}
            className="btn btn-danger"
            style={{ opacity: canSubmit ? 1 : 0.55 }}
          >
            {submitting ? "Processing..." : "Confirm Decision"}
          </button>
        </>
      }
    >
      <RequestReferenceCard
        requestNumber={expense.requestNumber}
        title={expense.description}
        amount={expense.amount}
        amountLabel="AMOUNT"
        variant="compact"
      />

      {/* Decision chips — the API action branches on this selection */}
      <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.25rem" }}>
        <button type="button" onClick={() => setDecision("REJECT")} style={chipStyle(decision === "REJECT", "#EF4444")}>
          <Icons.XCircle size={15} /> Reject Request
        </button>
        <button
          type="button"
          onClick={() => setDecision("CLARIFY")}
          style={chipStyle(decision === "CLARIFY", "#3B82F6")}
        >
          <Icons.MessageSquare size={15} /> Request Clarification
        </button>
      </div>

      {/* Reason — mandatory and length-gated so the audit trail stays useful */}
      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 0 }}>
            Reason for Decision <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <span
            style={{
              fontSize: "0.75rem",
              color: reason.trim().length >= MIN_REASON_LENGTH ? "#10B981" : "rgb(var(--color-text-dim))",
            }}
          >
            Min. {MIN_REASON_LENGTH} characters
          </span>
        </div>
        <textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Please provide specific details regarding the gaps or issues with this request..."
          className="form-textarea"
          style={{ resize: "vertical", marginTop: "0.4rem" }}
        />
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <ElectronicSignatureField
          value={signature}
          onChange={setSignature}
          description="Please confirm your identity by entering your security PIN or password to record this decision."
        />
      </div>
    </ModalShell>
  );
};
