import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";

interface AdminEditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleData: any;
  onSaveRole: (role: any) => void;
  onDeleteRole?: (roleId: string) => void;
  onOpenMatrix?: () => void;
}

export const AdminEditRoleModal: React.FC<AdminEditRoleModalProps> = ({
  isOpen,
  onClose,
  roleData,
  onSaveRole,
  onDeleteRole,
  onOpenMatrix
}) => {
  const [roleName, setRoleName] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (roleData) {
      setRoleName(roleData.name || "Finance Manager");
      setIsActive(roleData.isActive !== false);
    }
  }, [roleData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRole({
      ...roleData,
      name: roleName,
      isActive
    });
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
        backgroundColor: "#1e293b",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "1rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", gap: "0.85rem", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "0.5rem",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <Icons.Edit3 size={20} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#f8fafc" }}>Edit Role</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <Icons.X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Role Name */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#94a3b8", marginBottom: "0.35rem" }}>
              Role Name
            </label>
            <input
              type="text"
              required
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "0.5rem",
                color: "#f8fafc",
                fontSize: "0.9rem",
                outline: "none"
              }}
            />
          </div>

          {/* Role Status Toggle Card */}
          <div style={{
            backgroundColor: "rgba(59, 130, 246, 0.08)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            borderRadius: "0.5rem",
            padding: "0.85rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.25rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Icons.ShieldCheck size={20} style={{ color: "#3b82f6" }} />
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#f8fafc" }}>Role Status</div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Allow users with this role to log in.</div>
              </div>
            </div>
            {/* Toggle switch */}
            <div 
              onClick={() => setIsActive(!isActive)}
              style={{
                width: "44px",
                height: "24px",
                borderRadius: "12px",
                backgroundColor: isActive ? "#2563eb" : "#475569",
                padding: "2px",
                cursor: "pointer",
                transition: "background-color 0.2s"
              }}
            >
              <div style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                transform: isActive ? "translateX(20px)" : "translateX(0px)",
                transition: "transform 0.2s"
              }} />
            </div>
          </div>

          {/* Permissions Summary */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#94a3b8" }}>Permissions Summary</span>
              <button
                type="button"
                onClick={() => {
                  if (onOpenMatrix) onOpenMatrix();
                  onClose();
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#60a5fa",
                  fontSize: "0.78rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  cursor: "pointer"
                }}
              >
                Advanced Settings <Icons.ExternalLink size={12} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <div style={{ backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#93c5fd", borderRadius: "0.375rem", padding: "0.5rem 0.75rem", fontSize: "0.78rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Icons.CheckCircle2 size={14} style={{ color: "#3b82f6" }} /> Audit Logs
              </div>
              <div style={{ backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#93c5fd", borderRadius: "0.375rem", padding: "0.5rem 0.75rem", fontSize: "0.78rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Icons.CheckCircle2 size={14} style={{ color: "#3b82f6" }} /> Approve Expenses
              </div>
              <div style={{ backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#93c5fd", borderRadius: "0.375rem", padding: "0.5rem 0.75rem", fontSize: "0.78rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Icons.CheckCircle2 size={14} style={{ color: "#3b82f6" }} /> View All Budgets
              </div>
              <div style={{ backgroundColor: "rgba(148, 163, 184, 0.1)", color: "#64748b", borderRadius: "0.375rem", padding: "0.5rem 0.75rem", fontSize: "0.78rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Icons.XCircle size={14} style={{ color: "#64748b" }} /> System Config
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => {
                if (onDeleteRole && roleData) onDeleteRole(roleData.id || roleData._id);
                onClose();
              }}
              style={{
                background: "none",
                border: "none",
                color: "#ef4444",
                fontWeight: "600",
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer"
              }}
            >
              <Icons.Trash2 size={14} /> Delete Role
            </button>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "0.6rem 1.15rem",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  backgroundColor: "transparent",
                  color: "#f8fafc",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: "0.6rem 1.15rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)"
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
