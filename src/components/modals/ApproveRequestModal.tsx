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
import * as Icons from "lucide-react";
import { ModalShell } from "../ui/ModalShell";
import { RequestReferenceCard } from "../ui/RequestReferenceCard";
import { ElectronicSignatureField } from "../ui/ElectronicSignatureField";
import { BudgetItemOptionDto } from "../../types/api";
import { formatNaira } from "../ui/format";

export interface ApproveRequestPayload {
  /** The id of the budget item the spend is booked against. */
  budgetItem: string;
  justification: string;
  signature: string;
}

interface ApproveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The request under review; `null` renders nothing. */
  expense: any;
  /** Budget items for the request's department, with live headroom. */
  budgetItems?: BudgetItemOptionDto[];
  budgetItemsLoading?: boolean;
  /**
   * Whether this approver must attach the request to a budget item. Only the
   * departmental approver does — the Finance Officer inherits their choice.
   */
  requiresBudgetItem?: boolean;
  submitting?: boolean;
  onConfirm: (payload: ApproveRequestPayload) => void;
}

export const ApproveRequestModal: React.FC<ApproveRequestModalProps> = ({
  isOpen,
  onClose,
  expense,
  budgetItems = [],
  budgetItemsLoading = false,
  requiresBudgetItem = false,
  submitting = false,
  onConfirm,
}) => {
  const [budgetItem, setBudgetItem] = useState("");
  const [justification, setJustification] = useState("");
  const [signature, setSignature] = useState("");

  if (!isOpen || !expense) return null;

  const selected = budgetItems.find((item) => item.id === budgetItem);
  // Attaching to an item that cannot absorb the request is allowed — that is
  // precisely what raises a budget item expansion for the Finance Head — but
  // the approver is told before signing, not after.
  const willOverrun = Boolean(selected && !selected.coversRequest);
  const shortfall = selected ? Math.max(0, expense.amount - selected.available) : 0;

  // The signature is the hard gate; the budget item joins it for the approver,
  // because the server refuses an approval that books the spend nowhere.
  const canSubmit =
    signature.trim().length > 0 && !submitting && (!requiresBudgetItem || Boolean(budgetItem));

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

      {/* Budget item the disbursement is charged against — the item's ledger is
          what the department's spend and any expansion are measured on */}
      <div style={{ marginTop: "1.25rem" }}>
        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
          Budget Item{" "}
          {requiresBudgetItem && <span style={{ color: "rgb(var(--color-danger))" }}>*</span>}
        </label>
        <select
          value={budgetItem}
          onChange={(e) => setBudgetItem(e.target.value)}
          className="form-select"
          disabled={budgetItemsLoading}
        >
          <option value="">
            {budgetItemsLoading ? "Loading budget items…" : "Select a Budget Item"}
          </option>
          {budgetItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {formatNaira(item.available)} available
            </option>
          ))}
        </select>

        {/* Three states, as every list in this app carries: loading, empty, populated */}
        {!budgetItemsLoading && budgetItems.length === 0 && (
          <p style={{ fontSize: "0.78rem", color: "rgb(var(--color-danger))", marginTop: "0.4rem" }}>
            This department has no budget items for the requested payment date. An administrator
            must add them under Departmental Spend → Set Budget before this request can be approved.
          </p>
        )}

        {/* What attaching here does to the item, shown before the signature */}
        {selected && (
          <div
            style={{
              marginTop: "0.65rem",
              padding: "0.7rem 0.85rem",
              borderRadius: "0.5rem",
              border: `1px solid ${willOverrun ? "rgb(var(--color-danger) / 0.35)" : "rgb(var(--color-card-border))"}`,
              background: willOverrun
                ? "rgb(var(--color-danger) / 0.08)"
                : "rgb(var(--color-surface-secondary) / 0.45)",
              fontSize: "0.78rem",
              color: "rgb(var(--color-text-muted))",
              display: "flex",
              gap: "0.55rem",
            }}
          >
            {willOverrun ? (
              <Icons.AlertTriangle size={15} style={{ color: "rgb(var(--color-danger))", flexShrink: 0, marginTop: "1px" }} />
            ) : (
              <Icons.CheckCircle2 size={15} style={{ color: "rgb(var(--color-secondary))", flexShrink: 0, marginTop: "1px" }} />
            )}
            <span>
              {willOverrun ? (
                <>
                  <strong style={{ color: "rgb(var(--color-danger))" }}>
                    Overruns this item by {formatNaira(shortfall)}.
                  </strong>{" "}
                  Approving still sends the request forward, but it will need a one-time expansion
                  from the Finance Head before payment.
                </>
              ) : (
                <>
                  Leaves {formatNaira(selected.available - expense.amount)} on{" "}
                  <strong style={{ color: "rgb(var(--color-text))" }}>{selected.name}</strong> after
                  this request.
                </>
              )}
            </span>
          </div>
        )}
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
