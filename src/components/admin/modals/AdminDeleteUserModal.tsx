import React, { useState } from "react";
import * as Icons from "lucide-react";

interface AdminDeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onConfirmDelete: (userId: string) => void;
}

export const AdminDeleteUserModal: React.FC<AdminDeleteUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onConfirmDelete
}) => {
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen || !user) return null;

  const userName = user.name || user.fullName || "User Account";

  const handleDelete = () => {
    onConfirmDelete(user._id || user.id);
    onClose();
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgb(var(--color-overlay) / 0.75)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "1rem"
    }}>
      <div className="glass-panel" style={{
        width: "100%",
        maxWidth: "500px",
        padding: "1.75rem",
        backgroundColor: "rgb(var(--color-card))",
        border: "1px solid rgb(var(--color-card-border))",
        borderRadius: "1rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "0.5rem",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <Icons.AlertTriangle size={22} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
              Delete User Account
            </h3>
            <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", marginTop: "0.25rem", lineHeight: "1.4" }}>
              This action is permanent and will remove <strong style={{ color: "rgb(var(--color-text))" }}>{userName}</strong> from all active workflows. Historical audit logs will be preserved.
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))", cursor: "pointer" }}>
            <Icons.X size={18} />
          </button>
        </div>

        {/* Impact Assessment Card */}
        <div style={{
          backgroundColor: "rgba(59, 130, 246, 0.08)",
          border: "1px solid rgba(59, 130, 246, 0.2)",
          borderRadius: "0.5rem",
          padding: "1rem",
          marginBottom: "1.25rem"
        }}>
          <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-primary))", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Icons.Info size={14} />
            IMPACT ASSESSMENT
          </div>
          <ul style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))", paddingLeft: "1.25rem", lineHeight: "1.5" }}>
            <li style={{ marginBottom: "0.3rem" }}>3 pending approvals will be cancelled</li>
            <li style={{ marginBottom: "0.3rem" }}>Access to "Corporate Q3 Budget" workflow will be revoked immediately.</li>
            <li>Assigned hardware assets will be flagged for recovery.</li>
          </ul>
        </div>

        {/* Checkbox */}
        <div style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          marginBottom: "1.5rem",
          cursor: "pointer"
        }}
        onClick={() => setConfirmed(!confirmed)}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>
            I understand that this action cannot be undone.
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid rgb(var(--color-card-border))",
              backgroundColor: "transparent",
              color: "rgb(var(--color-text))",
              fontWeight: "600",
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!confirmed}
            onClick={handleDelete}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: confirmed ? "#f87171" : "rgb(var(--color-text-dim))",
              color: "#ffffff",
              fontWeight: "600",
              fontSize: "0.85rem",
              cursor: confirmed ? "pointer" : "not-allowed",
              opacity: confirmed ? 1 : 0.65
            }}
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
};
