"use client";

import React from "react";
import * as Icons from "lucide-react";
import { isDepartmentScopedRole } from "../../enums/roles";

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteError: string;
  inviteForm: any;
  setInviteForm: React.Dispatch<React.SetStateAction<any>>;
  departments: any[];
  inviteSubmitting: boolean;
  handleInviteUser: (e: React.FormEvent) => Promise<void>;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  isOpen,
  onClose,
  inviteError,
  inviteForm,
  setInviteForm,
  departments,
  inviteSubmitting,
  handleInviteUser,
}) => {
  if (!isOpen) return null;

  // Only initiators and approvers are department-scoped; the rest are global,
  // so the field is hidden rather than shown empty and ignored on the server.
  const needsDepartment = isDepartmentScopedRole(inviteForm.role);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem", overflowY: "auto" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "500px", maxHeight: "88vh", overflowY: "auto", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontWeight: "bold" }}>Invite New User</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
            <Icons.X size={24} />
          </button>
        </div>

        {inviteError && (
          <div className="glass-card" style={{ borderLeft: "4px solid rgb(var(--color-danger))", padding: "0.75rem", background: "rgba(239,68,68,0.05)" }}>
            <p style={{ color: "rgb(var(--color-danger))", fontSize: "0.85rem" }}>{inviteError}</p>
          </div>
        )}

        <form onSubmit={handleInviteUser} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Rivera"
              value={inviteForm.name}
              onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. alex.rivera@corporate.finance"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              className="form-input"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) =>
                  setInviteForm({
                    ...inviteForm,
                    role: e.target.value,
                    // Drop any department already picked when switching to a
                    // global role, so a hidden field cannot be submitted.
                    departmentId: isDepartmentScopedRole(e.target.value) ? inviteForm.departmentId : "",
                  })
                }
                className="form-select"
              >
                <option value="INITIATOR">Initiator</option>
                <option value="APPROVER">Approver</option>
                <option value="FINANCE_OFFICER">Finance Officer</option>
                <option value="FINANCE_MANAGER">Finance Manager</option>
                <option value="FINANCE_HEAD">Finance Head</option>
                <option value="ADMIN">System Admin</option>
              </select>
            </div>

            {/* Department — only rendered for the two department-scoped roles */}
            {needsDepartment ? (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Department</label>
                <select
                  required
                  value={inviteForm.departmentId}
                  onChange={(e) => setInviteForm({ ...inviteForm, departmentId: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select a department</option>
                  {departments.map((d: any) => (
                    <option key={d.id || d._id} value={d.id || d._id}>{d.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Scope</label>
                <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", paddingTop: "0.6rem" }}>
                  Enterprise-wide — this role is not tied to a department.
                </p>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={inviteSubmitting} className="btn btn-primary">
              {inviteSubmitting ? "Inviting..." : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
