import React, { useState } from "react";
import * as Icons from "lucide-react";

interface RejectExpansionModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestNumber?: string;
  requestAmount?: number;
  remainingBudget?: number;
  deficitAmount?: number;
  onConfirm?: (reason: string) => void;
}

export const RejectExpansionModal: React.FC<RejectExpansionModalProps> = ({
  isOpen,
  onClose,
  requestNumber = "#0044",
  requestAmount = 47200,
  remainingBudget = 26200,
  deficitAmount = 21000,
  onConfirm
}) => {
  const [rejectionReason, setRejectionReason] = useState(
    "This expense is not critical. The department can defer this purchase to the next fiscal year. I do not authorize the one-time expansion."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!rejectionReason.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      if (onConfirm) {
        onConfirm(rejectionReason);
      }
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem"
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "620px",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "rgb(var(--color-card))",
          border: "1px solid rgba(var(--color-card-border), 0.6)",
          borderRadius: "16px",
          padding: "1.75rem 2rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          display: "flex",
          flexDirection: "column",
          gap: "1.35rem"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#DC2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <Icons.XCircle size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "rgb(var(--color-text))", margin: 0, letterSpacing: "-0.01em" }}>
                Reject One-Time Budget Expansion Request
              </h2>
              <span style={{ fontSize: "0.825rem", color: "rgb(var(--color-text-muted))", marginTop: "0.15rem", display: "block" }}>
                Request {requestNumber}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgb(var(--color-text-muted))",
              cursor: "pointer",
              padding: "0.25rem",
              borderRadius: "6px"
            }}
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Metrics Container */}
        <div
          style={{
            background: "rgba(239, 246, 255, 0.85)",
            border: "1px solid #BFDBFE",
            borderRadius: "12px",
            padding: "1.25rem 1.5rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "1rem"
          }}
        >
          <div>
            <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>
              REQUEST AMOUNT
            </span>
            <span style={{ fontSize: "1.15rem", fontWeight: "800", color: "#0F172A" }}>
              ₦{requestAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>
              REMAINING BUDGET
            </span>
            <span style={{ fontSize: "1.15rem", fontWeight: "800", color: "#0F172A" }}>
              ₦{remainingBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>
              DEFICIT
            </span>
            <span style={{ fontSize: "1.15rem", fontWeight: "800", color: "#DC2626" }}>
              -₦{deficitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Rejection Warning Box */}
        <div
          style={{
            background: "rgba(254, 226, 226, 0.45)",
            border: "1px solid #FCA5A5",
            borderRadius: "12px",
            padding: "1.15rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem"
          }}
        >
          <Icons.AlertTriangle size={22} style={{ color: "#DC2626", flexShrink: 0 }} />
          <span style={{ fontSize: "0.875rem", color: "#B91C1C", fontWeight: "700" }}>
            Rejection is final. The request will be returned to the Finance Officer for disposition.
          </span>
        </div>

        {/* Reason for Rejection Textarea */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.825rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
            Reason for Rejection (Internal Controls 7.4)
          </label>
          <textarea
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            style={{
              width: "100%",
              padding: "0.85rem 1rem",
              fontSize: "0.875rem",
              borderRadius: "10px",
              border: "1px solid rgba(var(--color-card-border), 0.6)",
              background: "rgba(var(--color-surface), 0.5)",
              color: "rgb(var(--color-text))",
              outline: "none",
              lineHeight: "1.5"
            }}
          />
        </div>

        {/* Upon Rejection Info Box */}
        <div
          style={{
            background: "rgba(239, 246, 255, 0.85)",
            border: "1px solid #BFDBFE",
            borderRadius: "12px",
            padding: "1.15rem 1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "#1E3A8A" }}>
            <Icons.Info size={18} style={{ color: "#2563EB" }} />
            <span style={{ fontWeight: "800", fontSize: "0.775rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              UPON REJECTION:
            </span>
          </div>

          <ul style={{ margin: 0, paddingLeft: "1.4rem", fontSize: "0.825rem", color: "#1E3A8A", lineHeight: "1.6", fontWeight: "500" }}>
            <li>The request status changes to <strong>REJECTED</strong>.</li>
            <li>The Finance Officer's history log is updated.</li>
            <li>The Finance Officer can communicate the rejection to the Initiator.</li>
          </ul>
        </div>

        {/* Modal Footer Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              border: "1px solid rgba(var(--color-card-border), 0.6)",
              background: "transparent",
              color: "rgb(var(--color-text))",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !rejectionReason.trim()}
            className="btn btn-danger"
            style={{
              padding: "0.6rem 1.5rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "700",
              background: "#B91C1C",
              color: "#FFFFFF",
              border: "none",
              cursor: isSubmitting || !rejectionReason.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            <Icons.Gavel size={16} />
            {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
};
