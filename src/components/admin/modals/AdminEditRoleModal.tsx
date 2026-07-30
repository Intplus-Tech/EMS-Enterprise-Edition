/**
 * AdminEditRoleModal
 * Edits a system role's description, sign-in status and permission summary.
 * Consumed by DashboardShell (admin routes).
 * Design source: designs/system-admin/Admin_ Edit Role Modal.png
 *
 * Roles are a fixed system enum (`SystemRole`), not user-created records, so
 * there is no delete action — deactivating a role is the equivalent operation.
 * The permission summary reads the role's real grants; it was previously four
 * hardcoded chips that showed the same values for every role.
 */
import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { ModalShell } from "../../ui/ModalShell";
import { humanizeStatus } from "../../ui/format";
import {
  PermissionAction,
  PermissionResource,
  PERMISSION_RESOURCE_LABELS,
} from "../../../enums/permissions";
import { RolePermissionDto } from "../../../types/api";

interface AdminEditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleData: RolePermissionDto | null;
  onSaveRole: (role: RolePermissionDto) => void;
  onOpenMatrix?: () => void;
  /** Disables the confirm button while the save is in flight. */
  busy?: boolean;
}

/** Resources surfaced in the compact summary grid, in the designed order. */
const SUMMARY_RESOURCES: PermissionResource[] = [
  PermissionResource.AUDIT_LOGS,
  PermissionResource.EXPENSE_REQUESTS,
  PermissionResource.DEPARTMENTAL_BUDGETS,
  PermissionResource.ROLE_DEFINITIONS,
];

export const AdminEditRoleModal: React.FC<AdminEditRoleModalProps> = ({
  isOpen,
  onClose,
  roleData,
  onSaveRole,
  onOpenMatrix,
  busy = false,
}) => {
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (roleData) {
      setDescription(roleData.description || "");
      setIsActive(roleData.isActive !== false);
    }
  }, [roleData]);

  if (!isOpen || !roleData) return null;

  const roleLabel = humanizeStatus(roleData.role);
  // Admin must stay signed-in-able or no one can reach this screen again.
  const isProtectedRole = roleData.role === "ADMIN";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRole({ ...roleData, description, isActive });
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Role — ${roleLabel}`}
      subtitle={`${roleData.userCount} user${roleData.userCount === 1 ? "" : "s"} currently assigned`}
      maxWidth="480px"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="edit-role-form"
            disabled={busy}
            className="btn btn-primary"
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </>
      }
    >
      <form id="edit-role-form" onSubmit={handleSubmit}>
        {/* Role identity — the name itself is immutable, only the blurb is editable */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "rgb(var(--color-text-muted))",
              marginBottom: "0.4rem",
            }}
          >
            Role Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={300}
            className="form-textarea"
            placeholder="What this role is responsible for."
            style={{ width: "100%", resize: "vertical" }}
          />
        </div>

        {/* Sign-in toggle */}
        <div
          style={{
            backgroundColor: "rgba(37, 99, 235, 0.08)",
            border: "1px solid rgba(37, 99, 235, 0.2)",
            borderRadius: "0.5rem",
            padding: "0.85rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Icons.ShieldCheck size={20} style={{ color: "#2563EB" }} />
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "rgb(var(--color-text))" }}>
                Role Status
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                {isProtectedRole
                  ? "The administrator role cannot be deactivated."
                  : "Allow users with this role to log in."}
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            aria-label="Toggle role status"
            disabled={isProtectedRole}
            onClick={() => setIsActive(!isActive)}
            style={{
              width: "44px",
              height: "24px",
              borderRadius: "12px",
              border: "none",
              padding: "2px",
              backgroundColor: isActive ? "#2563EB" : "rgb(var(--color-text-dim))",
              cursor: isProtectedRole ? "not-allowed" : "pointer",
              opacity: isProtectedRole ? 0.5 : 1,
              transition: "background-color 0.2s",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                transform: isActive ? "translateX(20px)" : "translateX(0px)",
                transition: "transform 0.2s",
              }}
            />
          </button>
        </div>

        {/* Permissions summary — derived from the role's stored grants */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.65rem",
            }}
          >
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgb(var(--color-text-muted))" }}>
              Permissions Summary
            </span>
            <button
              type="button"
              onClick={() => {
                onOpenMatrix?.();
                onClose();
              }}
              style={{
                background: "none",
                border: "none",
                color: "#2563EB",
                fontSize: "0.78rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                cursor: "pointer",
              }}
            >
              Advanced Settings <Icons.ExternalLink size={12} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {SUMMARY_RESOURCES.map((resource) => {
              const granted = (roleData.grants?.[resource] ?? []).length > 0;
              return (
                <div
                  key={resource}
                  style={{
                    backgroundColor: granted ? "rgba(37, 99, 235, 0.15)" : "rgba(var(--color-text-dim), 0.12)",
                    color: granted ? "#60A5FA" : "rgb(var(--color-text-dim))",
                    borderRadius: "0.375rem",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {granted ? (
                    <Icons.CheckCircle2 size={14} style={{ color: "#2563EB", flexShrink: 0 }} />
                  ) : (
                    <Icons.XCircle size={14} style={{ flexShrink: 0 }} />
                  )}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {PERMISSION_RESOURCE_LABELS[resource]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Approval rights read from the matrix rather than assumed by role name */}
          <p style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))", marginTop: "0.75rem" }}>
            {(roleData.grants?.[PermissionResource.EXPENSE_REQUESTS] ?? []).includes(
              PermissionAction.APPROVE
            )
              ? "This role can approve expense requests."
              : "This role cannot approve expense requests."}
          </p>
        </div>
      </form>
    </ModalShell>
  );
};
