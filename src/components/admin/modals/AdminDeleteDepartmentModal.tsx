/**
 * Confirms deleting a department, with the design's warning copy.
 *
 * Every consequence listed here is carried out by `DepartmentService.beginDeletion`.
 * The department then sits in Pending Deletion, where the table's Restore action
 * replays the cascade in reverse. Rendered by DashboardShell.
 */
import React, { useState } from "react";
import * as Icons from "lucide-react";

/** Minimal shape needed to identify and describe the department. */
interface DeleteTargetDepartment {
  id?: string;
  _id?: string;
  name?: string;
  usersCount?: number;
}

interface AdminDeleteDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: DeleteTargetDepartment | null;
  onConfirmDelete: (deptId: string) => void;
}

export const AdminDeleteDepartmentModal: React.FC<AdminDeleteDepartmentModalProps> = ({
  isOpen,
  onClose,
  department,
  onConfirmDelete
}) => {
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen || !department) return null;

  const deptName = department.name || "Selected Department";
  const assignedUsers = department.usersCount ?? 0;

  const handleDelete = () => {
    onConfirmDelete((department._id || department.id) as string);
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
        maxWidth: "520px",
        padding: "1.75rem",
        backgroundColor: "rgb(var(--color-card))",
        border: "1px solid rgb(var(--color-card-border))",
        borderRadius: "1rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        {/* Warning Icon & Title */}
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
            <Icons.AlertTriangle size={22} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
              Delete &apos;{deptName}&apos;?
            </h3>
            <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", marginTop: "0.2rem" }}>
              This action is permanent and cannot be reversed.
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))", cursor: "pointer" }}>
            <Icons.X size={18} />
          </button>
        </div>

        {/* Severe System Warning Card */}
        <div style={{
          backgroundColor: "rgba(239, 68, 68, 0.06)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          borderRadius: "0.75rem",
          padding: "1rem 1.15rem",
          marginBottom: "1.25rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ef4444", fontWeight: "700", fontSize: "0.85rem", marginBottom: "0.6rem" }}>
            <Icons.AlertOctagon size={16} />
            Severe System Warning
          </div>
          {/* Design copy, verbatim. Every line is now an effect the server
              actually performs — see `DepartmentService.beginDeletion`. The
              user count is appended because it is the one number the admin
              cannot see from this modal. */}
          <ul style={{ fontSize: "0.8rem", color: "#fca5a5", paddingLeft: "1.25rem", lineHeight: "1.5" }}>
            <li style={{ marginBottom: "0.35rem" }}>All historical transaction data for this department will be moved to long-term cold storage (Archived).</li>
            <li style={{ marginBottom: "0.35rem" }}>This department&apos;s cost centers will be immediately deactivated and rejected in all future expense reports.</li>
            <li style={{ marginBottom: "0.35rem" }}>Any pending approvals associated with this department will be automatically canceled.</li>
            <li>
              User access permissions tied to this specific department will be revoked
              {assignedUsers > 0 ? ` (${assignedUsers} user(s) affected).` : "."}
            </li>
          </ul>
        </div>

        {/* Implications line — present in the design, previously omitted. */}
        <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text))", marginBottom: "1rem", lineHeight: "1.45" }}>
          Please confirm that you understand the implications of this action for {deptName}.
        </p>

        {/* Implications Confirmation Checkbox */}
        <div style={{
          border: "1px solid rgb(var(--color-card-border))",
          backgroundColor: "rgba(var(--color-surface-secondary), 0.5)",
          borderRadius: "0.5rem",
          padding: "0.85rem 1rem",
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          cursor: "pointer"
        }}
        onClick={() => setConfirmed(!confirmed)}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ marginTop: "3px", cursor: "pointer" }}
          />
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
              I understand that this action is permanent
            </div>
            <div style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-muted))", marginTop: "0.15rem", lineHeight: "1.35" }}>
              I acknowledge that all department history will be archived and cannot be managed through the active dashboard.
            </div>
          </div>
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
            Cancel and Keep
          </button>
          <button
            type="button"
            disabled={!confirmed}
            onClick={handleDelete}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: confirmed ? "#ef4444" : "rgb(var(--color-text-dim))",
              color: "#ffffff",
              fontWeight: "600",
              fontSize: "0.85rem",
              cursor: confirmed ? "pointer" : "not-allowed",
              opacity: confirmed ? 1 : 0.65,
              boxShadow: confirmed ? "0 4px 12px rgba(239, 68, 68, 0.35)" : "none"
            }}
          >
            <Icons.Trash2 size={15} style={{ marginRight: "0.35rem", display: "inline", verticalAlign: "middle" }} />
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
};
