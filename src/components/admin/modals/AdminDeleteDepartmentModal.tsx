/**
 * Confirms archiving a department. The copy describes an archive rather than an
 * erase because that is what the server does — see `DepartmentService.archive`.
 * Rendered by DashboardShell.
 */
import React, { useState } from "react";
import * as Icons from "lucide-react";

/** Minimal shape needed to identify and describe the department. */
interface ArchiveTargetDepartment {
  id?: string;
  _id?: string;
  name?: string;
  usersCount?: number;
}

interface AdminDeleteDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: ArchiveTargetDepartment | null;
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
        maxWidth: "520px",
        padding: "1.75rem",
        backgroundColor: "rgb(var(--color-card))",
        border: "1px solid rgba(255, 255, 255, 0.1)",
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
              The department is archived, not erased — you can restore it from the department list.
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
            What archiving does
          </div>
          {/* Each line states an effect the server actually performs. The
              previous copy promised cascading deletes and cancelled approvals
              that never happened — the request was simply refused. */}
          <ul style={{ fontSize: "0.8rem", color: "#fca5a5", paddingLeft: "1.25rem", lineHeight: "1.5" }}>
            <li style={{ marginBottom: "0.35rem" }}>No new expense requests can be raised against this department.</li>
            <li style={{ marginBottom: "0.35rem" }}>
              {assignedUsers > 0
                ? `Its ${assignedUsers} assigned user(s) keep their accounts, but cannot raise spending until they are moved to another department.`
                : "Users assigned later would need the department restored first."}
            </li>
            <li style={{ marginBottom: "0.35rem" }}>Budget allocations, request history and audit entries are preserved.</li>
            <li>Requests already in the approval workflow continue to completion.</li>
          </ul>
        </div>

        {/* Implications Confirmation Checkbox */}
        <div style={{
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backgroundColor: "rgba(15, 23, 42, 0.5)",
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
              I understand this department will stop accepting new requests
            </div>
            <div style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-muted))", marginTop: "0.15rem", lineHeight: "1.35" }}>
              I acknowledge that &apos;{deptName}&apos; will be archived and can no longer be used for new spending until it is restored.
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
              border: "1px solid rgba(255, 255, 255, 0.15)",
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
            <Icons.Archive size={15} style={{ marginRight: "0.35rem", display: "inline", verticalAlign: "middle" }} />
            Archive Department
          </button>
        </div>
      </div>
    </div>
  );
};
