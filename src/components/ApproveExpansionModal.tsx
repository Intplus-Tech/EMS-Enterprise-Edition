import React, { useState } from "react";
import * as Icons from "lucide-react";

interface ApproveExpansionModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestNumber?: string;
  requestAmount?: number;
  remainingBudget?: number;
  deficitAmount?: number;
  onConfirm?: (notes: string) => void;
}

export const ApproveExpansionModal: React.FC<ApproveExpansionModalProps> = ({
  isOpen,
  onClose,
  requestNumber = "#0044",
  requestAmount = 47200,
  remainingBudget = 26200,
  deficitAmount = 21000,
  onConfirm
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!acknowledged) return;
    setIsSubmitting(true);
    setTimeout(() => {
      if (onConfirm) {
        onConfirm(approvalNotes);
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
                background: "rgba(37, 99, 235, 0.12)",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <Icons.Wallet size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "rgb(var(--color-text))", margin: 0, letterSpacing: "-0.01em" }}>
                Approve One-Time Budget Expansion
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

        {/* Metrics Container (Soft Light Blue Box) */}
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

        {/* Expansion Amount Info Banner */}
        <div
          style={{
            background: "rgba(239, 246, 255, 0.7)",
            border: "1px solid #BFDBFE",
            borderRadius: "12px",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "#2563EB" }}>
            <Icons.Info size={20} />
            <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "#1E3A8A" }}>
              Expansion Amount: ₦{deficitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <span
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: "999px",
              background: "#DBEAFE",
              color: "#1E40AF",
              fontWeight: "700",
              fontSize: "0.7rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase"
            }}
          >
            ONE-TIME / REQUEST-SPECIFIC
          </span>
        </div>

        {/* Acknowledgment Warning Checkbox Box */}
        <div
          style={{
            background: "rgba(254, 226, 226, 0.45)",
            border: "1px solid #FCA5A5",
            borderRadius: "12px",
            padding: "1.25rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.85rem"
          }}
        >
          <Icons.AlertTriangle size={22} style={{ color: "#DC2626", flexShrink: 0, marginTop: "2px" }} />
          
          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              style={{
                width: "18px",
                height: "18px",
                marginTop: "3px",
                cursor: "pointer",
                accentColor: "#DC2626"
              }}
            />
            <span style={{ fontSize: "0.85rem", color: "#B91C1C", fontWeight: "600", lineHeight: "1.45" }}>
              I acknowledge this expansion is ONE-TIME and REQUEST-SPECIFIC. It will NOT permanently increase the departmental budget. The department budget will revert to its original limit after this request is closed.
            </span>
          </label>
        </div>

        {/* Approval Notes (Optional) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.825rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
            Approval Notes (Optional)
          </label>
          <textarea
            rows={3}
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            placeholder="e.g., Approved due to critical infrastructure risk. Vendor quote verified."
            style={{
              width: "100%",
              padding: "0.85rem",
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

        {/* Workflow Info Note */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
          <Icons.GitFork size={18} style={{ color: "rgb(var(--color-text-dim))", flexShrink: 0, marginTop: "2px" }} />
          <span style={{ fontSize: "0.8rem", lineHeight: "1.45" }}>
            Upon approval, this request will move directly to the <strong>Finance Manager (Releaser)</strong> for payment, bypassing the Finance Officer queue.
          </span>
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
            disabled={!acknowledged || isSubmitting}
            className="btn btn-primary"
            style={{
              padding: "0.6rem 1.5rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              background: acknowledged ? "#2563EB" : "#93C5FD",
              color: "#FFFFFF",
              border: "none",
              cursor: acknowledged ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            {isSubmitting ? "Authorizing..." : "Confirm & Authorize"}
            <Icons.CheckCircle size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
