import React, { useState } from "react";
import * as Icons from "lucide-react";
import { isDepartmentScopedRole } from "../../../enums/roles";

interface AdminAddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: any[];
  onSaveUser: (userData: any) => void;
}

export const AdminAddUserModal: React.FC<AdminAddUserModalProps> = ({
  isOpen,
  onClose,
  departments,
  onSaveUser
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [role, setRole] = useState("INITIATOR");

  if (!isOpen) return null;

  // Only initiators and approvers belong to a department; every other role is
  // enterprise-wide, so the picker is hidden and no department is submitted.
  const needsDepartment = isDepartmentScopedRole(role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveUser({
      fullName,
      email,
      contactNumber,
      departmentId: needsDepartment ? departmentId : "",
      role
    });
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
        maxWidth: "560px",
        padding: "1.75rem",
        backgroundColor: "rgb(var(--color-card))",
        border: "1px solid rgb(var(--color-card-border))",
        borderRadius: "1rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>Add New User</h3>
            <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", marginTop: "0.25rem" }}>
              Invite a new professional to the Precision Enterprise environment.
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgb(var(--color-text-muted))",
              cursor: "pointer",
              padding: "0.25rem"
            }}
          >
            <Icons.X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Avatar Upload Placeholder */}
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.25rem" }}>
            <div style={{
              width: "72px",
              height: "72px",
              borderRadius: "0.75rem",
              border: "2px dashed rgba(99, 102, 241, 0.4)",
              backgroundColor: "rgba(99, 102, 241, 0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#6366f1",
              cursor: "pointer",
              flexShrink: 0
            }}>
              <Icons.UserPlus size={22} />
              <span style={{ fontSize: "0.65rem", fontWeight: "600", marginTop: "0.25rem" }}>Upload</span>
            </div>
            <div style={{ flexGrow: 1 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "rgb(var(--color-text-muted))", marginBottom: "0.35rem" }}>
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="James Okafor"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  backgroundColor: "rgba(var(--color-surface-secondary), 0.6)",
                  border: "1px solid rgb(var(--color-card-border))",
                  borderRadius: "0.5rem",
                  color: "rgb(var(--color-text))",
                  fontSize: "0.9rem",
                  outline: "none"
                }}
              />
            </div>
          </div>

          {/* Email & Contact */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "rgb(var(--color-text-muted))", marginBottom: "0.35rem" }}>
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="j.okafor@precision.corp"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  backgroundColor: "rgba(var(--color-surface-secondary), 0.6)",
                  border: "1px solid rgb(var(--color-card-border))",
                  borderRadius: "0.5rem",
                  color: "rgb(var(--color-text))",
                  fontSize: "0.9rem",
                  outline: "none"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "rgb(var(--color-text-muted))", marginBottom: "0.35rem" }}>
                Contact Number
              </label>
              <input
                type="text"
                placeholder="0801-234-5678"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  backgroundColor: "rgba(var(--color-surface-secondary), 0.6)",
                  border: "1px solid rgb(var(--color-card-border))",
                  borderRadius: "0.5rem",
                  color: "rgb(var(--color-text))",
                  fontSize: "0.9rem",
                  outline: "none"
                }}
              />
            </div>
          </div>

          {/* Department & Role — department only applies to scoped roles */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "rgb(var(--color-text-muted))", marginBottom: "0.35rem" }}>
                {needsDepartment ? "Department" : "Scope"}
              </label>
              {needsDepartment ? (
                <select
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    backgroundColor: "rgba(var(--color-surface-secondary), 0.6)",
                    border: "1px solid rgb(var(--color-card-border))",
                    borderRadius: "0.5rem",
                    color: "rgb(var(--color-text))",
                    fontSize: "0.9rem",
                    outline: "none"
                  }}
                >
                  <option value="" style={{ background: "rgb(var(--color-card))" }}>Select a department</option>
                  {departments.map((d: any) => (
                    <option key={d._id || d.id} value={d._id || d.id} style={{ background: "rgb(var(--color-card))" }}>
                      {d.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", paddingTop: "0.65rem" }}>
                  Enterprise-wide
                </p>
              )}
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "rgb(var(--color-text-muted))", marginBottom: "0.35rem" }}>
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  backgroundColor: "rgba(var(--color-surface-secondary), 0.6)",
                  border: "1px solid rgb(var(--color-card-border))",
                  borderRadius: "0.5rem",
                  color: "rgb(var(--color-text))",
                  fontSize: "0.9rem",
                  outline: "none"
                }}
              >
                <option value="INITIATOR" style={{ background: "rgb(var(--color-card))" }}>Initiator</option>
                <option value="APPROVER" style={{ background: "rgb(var(--color-card))" }}>Approver / Dept Manager</option>
                <option value="FINANCE_OFFICER" style={{ background: "rgb(var(--color-card))" }}>Finance Officer</option>
                <option value="FINANCE_MANAGER" style={{ background: "rgb(var(--color-card))" }}>Finance Manager</option>
                <option value="FINANCE_HEAD" style={{ background: "rgb(var(--color-card))" }}>Finance Head</option>
                <option value="ADMIN" style={{ background: "rgb(var(--color-card))" }}>System Admin</option>
              </select>
            </div>
          </div>

          {/* Info Banner */}
          <div style={{
            backgroundColor: "rgba(59, 130, 246, 0.12)",
            border: "1px solid rgba(59, 130, 246, 0.25)",
            borderRadius: "0.5rem",
            padding: "0.85rem 1rem",
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start",
            marginBottom: "1.5rem"
          }}>
            <Icons.Info size={18} style={{ color: "#3b82f6", flexShrink: 0, marginTop: "2px" }} />
            <p style={{ fontSize: "0.8rem", color: "rgb(var(--color-primary))", lineHeight: "1.4" }}>
              The user will receive an automated invitation email to set their password once the profile is saved. Invitation expires in 72 hours.
            </p>
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
              type="submit"
              style={{
                padding: "0.65rem 1.25rem",
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
              Save User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
