"use client";

/**
 * ApproveRequestModal — the "Approve Financial Request" dialog from
 * `designs/approval/Approve Request Modal.png`.
 *
 * Consumed by ApprovalsTab for APPROVER / FINANCE_OFFICER / FINANCE_MANAGER
 * decisions. It only collects the decision payload; the caller performs the
 * API call so this stays a pure presentational component.
 */

import React, { useState } from "react";
import { ModalShell } from "../ui/ModalShell";
import { RequestReferenceCard } from "../ui/RequestReferenceCard";
import { ElectronicSignatureField } from "../ui/ElectronicSignatureField";

export interface ApproveRequestPayload {
  budgetItem: string;
  justification: string;
  signature: string;
}

interface ApproveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The request under review; `null` renders nothing. */
  expense: any;
  /** Budget line items for the request's department. */
  budgetItems?: { id: string; name: string }[];
  submitting?: boolean;
  onConfirm: (payload: ApproveRequestPayload) => void;
}

export const ApproveRequestModal: React.FC<ApproveRequestModalProps> = ({
  isOpen,
  onClose,
  expense,
  budgetItems = [],
  submitting = false,
  onConfirm,
}) => {
  const [budgetItem, setBudgetItem] = useState("");
  const [justification, setJustification] = useState("");
  const [signature, setSignature] = useState("");

  if (!isOpen || !expense) return null;

  // The signature is the only hard gate — justification is optional per design.
  const canSubmit = signature.trim().length > 0 && !submitting;

  const reset = () => {
    setBudgetItem("");
    setJustification("");
    setSignature("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title="Approve Financial Request"
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
              onConfirm({ budgetItem, justification, signature });
              reset();
            }}
            className="btn btn-primary"
            style={{ background: "#2563EB", border: "none", opacity: canSubmit ? 1 : 0.55 }}
          >
            {submitting ? "Processing..." : "Confirm Approval"}
          </button>
        </>
      }
    >
      {/* Reference summary — mirrors the tinted header block in the design */}
      <RequestReferenceCard
        requestNumber={`#${expense.requestNumber}`}
        title={expense.description}
        amount={expense.amount}
        amountLabel="APPROVAL AMOUNT"
      />

      {/* Budget item the disbursement should be charged against */}
      <div style={{ marginTop: "1.25rem" }}>
        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
          Budget Item
        </label>
        <select value={budgetItem} onChange={(e) => setBudgetItem(e.target.value)} className="form-select">
          <option value="">Select a Budget Item</option>
          {budgetItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {/* Free-text note captured on the audit trail */}
      <div style={{ marginTop: "1.25rem" }}>
        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
          Decision Justification{" "}
          <span style={{ fontWeight: 400, color: "rgb(var(--color-text-muted))" }}>(Optional)</span>
        </label>
        <textarea
          rows={3}
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Add notes for the audit trail or internal team comments..."
          className="form-textarea"
          style={{ resize: "vertical" }}
        />
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <ElectronicSignatureField value={signature} onChange={setSignature} />
      </div>
    </ModalShell>
  );
};
