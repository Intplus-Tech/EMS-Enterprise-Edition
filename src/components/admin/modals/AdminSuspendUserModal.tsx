import React from "react";
import * as Icons from "lucide-react";

interface AdminSuspendUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onConfirmSuspend: (userId: string) => void;
}

export const AdminSuspendUserModal: React.FC<AdminSuspendUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onConfirmSuspend
}) => {
  if (!isOpen || !user) return null;

  const userName = user.name || user.fullName || "User";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleSuspend = () => {
    onConfirmSuspend(user._id || user.id);
    onClose();
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(15, 23, 42, 0.75)",
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
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "1rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <Icons.Lock size={22} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
              Suspend User Access
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
            color: "#60a5fa",
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
            <div style={{ fontSize: "0.8rem", color: "#93c5fd", marginTop: "0.2rem", lineHeight: "1.4" }}>
              Are you sure you want to suspend access for <strong>{userName}</strong>? They will be unable to log in until access is restored.
            </div>
          </div>
        </div>

        {/* Termination Warning */}
        <div style={{
          backgroundColor: "rgba(239, 68, 68, 0.06)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          borderRadius: "0.5rem",
          padding: "0.75rem 1rem",
          display: "flex",
          gap: "0.6rem",
          alignItems: "center",
          marginBottom: "1.5rem"
        }}>
          <Icons.Info size={16} style={{ color: "#ef4444", flexShrink: 0 }} />
          <span style={{ fontSize: "0.8rem", color: "#fca5a5" }}>
            This action will terminate all active sessions immediately.
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
              border: "1px solid rgba(255, 255, 255, 0.15)",
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
            onClick={handleSuspend}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: "#dc2626",
              color: "#ffffff",
              fontWeight: "600",
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(220, 38, 38, 0.35)"
            }}
          >
            Suspend Access
          </button>
        </div>
      </div>
    </div>
  );
};
