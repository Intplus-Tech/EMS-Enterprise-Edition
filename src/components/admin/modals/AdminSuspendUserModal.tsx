/**
 * Confirms a suspend *or* restore of a user's access. One modal covers both
 * directions because the confirmation flow is identical — only the copy, the
 * accent colour and the target state differ. Rendered by DashboardShell.
 */
import React from "react";
import * as Icons from "lucide-react";

/** Minimal shape needed to identify and label the account being acted on. */
interface SuspendTargetUser {
  id?: string;
  _id?: string;
  name?: string;
  fullName?: string;
  isActive?: boolean;
}

interface AdminSuspendUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SuspendTargetUser | null;
  /** `nextActive` is the state the account should end up in. */
  onConfirmToggleAccess: (userId: string, nextActive: boolean) => void;
}

export const AdminSuspendUserModal: React.FC<AdminSuspendUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onConfirmToggleAccess
}) => {
  if (!isOpen || !user) return null;

  const userName = user.name || user.fullName || "User";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  // An already-suspended account can only be restored — offering "Suspend"
  // again is a no-op that reads to the admin as though nothing happened.
  // `!== false` so rows that arrive without the flag are treated as active.
  const isSuspended = user.isActive === false;
  const nextActive = isSuspended;

  // Restore is a safe, reversible action, so it gets the positive accent;
  // suspension keeps the destructive red treatment.
  const accent = isSuspended ? "#10b981" : "#ef4444";
  const accentSoft = isSuspended ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";

  const handleConfirm = () => {
    onConfirmToggleAccess((user._id || user.id) as string, nextActive);
    onClose();
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(var(--color-overlay), 0.75)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "1rem"
    }}>
      <div className="glass-panel" style={{
        width: "100%",
        maxWidth: "480px",
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
            borderRadius: "50%",
            backgroundColor: accentSoft,
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            {isSuspended ? <Icons.Unlock size={22} /> : <Icons.Lock size={22} />}
          </div>
          <div style={{ flexGrow: 1 }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
              {isSuspended ? "Restore User Access" : "Suspend User Access"}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", marginTop: "0.2rem" }}>
              Confirm security action
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))", cursor: "pointer" }}>
            <Icons.X size={18} />
          </button>
        </div>

        {/* User Card */}
        <div style={{
          backgroundColor: "rgba(59, 130, 246, 0.08)",
          border: "1px solid rgba(59, 130, 246, 0.2)",
          borderRadius: "0.5rem",
          padding: "1rem",
          marginBottom: "1rem",
          display: "flex",
          gap: "0.85rem",
          alignItems: "flex-start"
        }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: "rgba(59, 130, 246, 0.25)",
            color: "rgb(var(--color-primary))",
            fontWeight: "700",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
              {userName}
            </div>
            <div style={{ fontSize: "0.8rem", color: "rgb(var(--color-primary))", marginTop: "0.2rem", lineHeight: "1.4" }}>
              {isSuspended ? (
                <>Are you sure you want to restore access for <strong>{userName}</strong>? They will be able to log in again immediately.</>
              ) : (
                <>Are you sure you want to suspend access for <strong>{userName}</strong>? They will be unable to log in until access is restored.</>
              )}
            </div>
          </div>
        </div>

        {/* Consequence notice — sessions are only terminated on suspension */}
        <div style={{
          backgroundColor: isSuspended ? "rgba(16, 185, 129, 0.06)" : "rgba(239, 68, 68, 0.06)",
          border: `1px solid ${isSuspended ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
          borderRadius: "0.5rem",
          padding: "0.75rem 1rem",
          display: "flex",
          gap: "0.6rem",
          alignItems: "center",
          marginBottom: "1.5rem"
        }}>
          <Icons.Info size={16} style={{ color: accent, flexShrink: 0 }} />
          <span style={{ fontSize: "0.8rem", color: isSuspended ? "#6ee7b7" : "#fca5a5" }}>
            {isSuspended
              ? "This account will regain its existing role and permissions."
              : "This action will terminate all active sessions immediately."}
          </span>
        </div>

        {/* Buttons */}
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
            onClick={handleConfirm}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: isSuspended ? "#059669" : "#dc2626",
              color: "#ffffff",
              fontWeight: "600",
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: isSuspended
                ? "0 4px 12px rgba(5, 150, 105, 0.35)"
                : "0 4px 12px rgba(220, 38, 38, 0.35)"
            }}
          >
            {isSuspended ? "Restore Access" : "Suspend Access"}
          </button>
        </div>
      </div>
    </div>
  );
};
