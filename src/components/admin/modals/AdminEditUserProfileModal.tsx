import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";

interface AdminEditUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  departments: any[];
  onUpdateUser: (userData: any) => void;
  /** Ends every active session for this user. */
  onForceLogOut?: (userId: string, name: string) => void;
}

export const AdminEditUserProfileModal: React.FC<AdminEditUserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  departments,
  onUpdateUser,
  onForceLogOut
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [role, setRole] = useState("INITIATOR");

  useEffect(() => {
    if (user) {
      setFullName(user.name || user.fullName || "");
      setEmail(user.email || "");
      setContactNumber(user.contactNumber || "0801-234-5678");
      setDepartmentId(user.departmentId?._id || user.departmentId || user.department?.id || departments[0]?._id || "");
      setRole(user.role || "INITIATOR");
    }
  }, [user, departments]);

  if (!isOpen || !user) return null;

  const initials = fullName
    ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "JO";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      ...user,
      fullName,
      email,
      contactNumber,
      departmentId,
      role
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
        maxWidth: "560px",
        padding: "1.75rem",
        backgroundColor: "rgb(var(--color-card))",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "1rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>Edit User Profile</h3>
            <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", marginTop: "0.25rem" }}>
              Update identity, access roles, and permissions.
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
          {/* Avatar & Full Name */}
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.25rem" }}>
            <div style={{
              width: "72px",
              height: "72px",
              borderRadius: "0.75rem",
              backgroundColor: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: "bold",
              fontSize: "1.35rem",
              position: "relative",
              flexShrink: 0
            }}>
              {initials}
              <div style={{
                position: "absolute",
                bottom: "-4px",
                right: "-4px",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "rgb(var(--color-background))",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgb(var(--color-text-muted))",
                cursor: "pointer"
              }}>
                <Icons.Camera size={12} />
              </div>
            </div>
            <div style={{ flexGrow: 1 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "rgb(var(--color-text-muted))", marginBottom: "0.35rem" }}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
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
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "0.5rem",
                  color: "rgb(var(--color-text))",
                  fontSize: "0.9rem",
                  outline: "none"
                }}
              />
            </div>
          </div>

          {/* Department & Role */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "rgb(var(--color-text-muted))", marginBottom: "0.35rem" }}>
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "0.5rem",
                  color: "rgb(var(--color-text))",
                  fontSize: "0.9rem",
                  outline: "none"
                }}
              >
                {departments.map((d: any) => (
                  <option key={d._id || d.id} value={d._id || d.id} style={{ background: "rgb(var(--color-card))" }}>
                    {d.name}
                  </option>
                ))}
              </select>
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
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
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

          {/* Security & Access Section */}
          <div style={{
            border: "1px solid rgba(239, 68, 68, 0.3)",
            backgroundColor: "rgba(239, 68, 68, 0.05)",
            borderRadius: "0.5rem",
            padding: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem"
          }}>
            <div>
              <h4 style={{ fontSize: "0.85rem", fontWeight: "700", color: "#f87171" }}>Security & Access</h4>
              <p style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-muted))", marginTop: "0.15rem" }}>
                Restrict account or force password reset.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onForceLogOut?.(user.id || user._id, fullName)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "0.375rem",
                border: "1px solid #ef4444",
                backgroundColor: "transparent",
                color: "#ef4444",
                fontWeight: "600",
                fontSize: "0.78rem",
                cursor: "pointer"
              }}
            >
              Force Log Out
            </button>
          </div>

          {/* Actions */}
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
              Update User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
