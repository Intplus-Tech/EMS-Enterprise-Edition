/**
 * RolePermissionsMatrix
 * The grid an admin uses to grant or revoke each action per resource, per role.
 * Consumed by AdminUsersAndRolesTab.
 * Design source: designs/system-admin/Admin_ Role Permissions Matrix.png
 *
 * Rows are generated from `PermissionResource` rather than hand-written: the
 * previous version repeated an identical seven-column `<tr>` block for every
 * resource, so adding a resource meant copying 15 lines of JSX and the grid
 * could silently drift from what the server actually enforces.
 */
import React, { useState } from "react";
import * as Icons from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { humanizeStatus } from "../ui/format";
import { SystemRole } from "../../enums/roles";
import {
  PermissionAction,
  PermissionResource,
  PERMISSION_ACTION_LABELS,
  PERMISSION_RESOURCE_LABELS,
} from "../../enums/permissions";
import { RolePermissionDto } from "../../types/api";

/** Sub-headers in the designed order, each owning a slice of the resource list. */
const RESOURCE_GROUPS: {
  label: string;
  icon: keyof typeof Icons;
  resources: PermissionResource[];
}[] = [
  {
    label: "Financial Transactions",
    icon: "Landmark",
    resources: [PermissionResource.EXPENSE_REQUESTS, PermissionResource.CORPORATE_CARDS],
  },
  {
    label: "Strategy & Budgeting",
    icon: "BarChart3",
    resources: [PermissionResource.DEPARTMENTAL_BUDGETS, PermissionResource.FORECAST_MODELS],
  },
  {
    label: "Governance & Logs",
    icon: "ShieldCheck",
    resources: [PermissionResource.AUDIT_LOGS, PermissionResource.COMPLIANCE_REPORTS],
  },
  {
    label: "User & Access Management",
    icon: "Users",
    resources: [
      PermissionResource.ROLE_DEFINITIONS,
      PermissionResource.USERS,
      PermissionResource.DEPARTMENTS,
    ],
  },
];

/** Sub-caption under each resource name, matching the copy in the design. */
const RESOURCE_HINTS: Record<PermissionResource, string> = {
  [PermissionResource.EXPENSE_REQUESTS]: "Manage employee spending and reimbursements",
  [PermissionResource.CORPORATE_CARDS]: "Card issuance and transaction monitoring",
  [PermissionResource.DEPARTMENTAL_BUDGETS]: "Quarterly allocation and limit setting",
  [PermissionResource.FORECAST_MODELS]: "Predictive analysis for future fiscal years",
  [PermissionResource.AUDIT_LOGS]: "Immutable history of system changes",
  [PermissionResource.COMPLIANCE_REPORTS]: "Regulatory filing data and validation",
  [PermissionResource.ROLE_DEFINITIONS]: "Editing base templates for organization roles",
  [PermissionResource.USERS]: "Inviting, editing and deactivating staff accounts",
  [PermissionResource.DEPARTMENTS]: "Creating and restructuring organizational units",
};

const ACTION_COLUMNS = Object.values(PermissionAction);

type GrantGrid = Record<PermissionResource, PermissionAction[]>;

interface RolePermissionsMatrixProps {
  roles: RolePermissionDto[];
  /** Persists the edited grid; resolves false when the save was rejected. */
  onSave: (input: {
    role: SystemRole;
    grants: GrantGrid;
    description?: string;
  }) => Promise<boolean> | void;
  onBack: () => void;
  busy?: boolean;
}

export const RolePermissionsMatrix: React.FC<RolePermissionsMatrixProps> = ({
  roles,
  onSave,
  onBack,
  busy = false,
}) => {
  const [selectedRole, setSelectedRole] = useState<SystemRole | "">("");
  const [grid, setGrid] = useState<GrantGrid>(() => emptyGrid());
  // Tracks whether the local grid diverges from what was loaded, so the footer
  // warning is only shown when there is genuinely something to lose.
  const [isDirty, setIsDirty] = useState(false);

  const activeRole = roles.find((r) => r.role === selectedRole) ?? roles[0];

  // Re-seed the grid when the selected role changes, adjusting state during
  // render rather than in an effect — the effect form fires a second render
  // pass in which the grid still holds the previous role's checkboxes.
  const [loadedRole, setLoadedRole] = useState<SystemRole | null>(null);
  if (activeRole && activeRole.role !== loadedRole) {
    setLoadedRole(activeRole.role);
    setSelectedRole(activeRole.role);
    setGrid(hydrateGrid(activeRole.grants));
    setIsDirty(false);
  }

  if (roles.length === 0) {
    return (
      <EmptyState
        icon={<Icons.ShieldAlert size={28} />}
        title="Permissions unavailable"
        description="The role matrix could not be loaded. You may not have permission to view role definitions."
      />
    );
  }

  const togglePermission = (resource: PermissionResource, action: PermissionAction) => {
    setGrid((prev) => {
      const current = prev[resource] ?? [];
      const next = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...prev, [resource]: next };
    });
    setIsDirty(true);
  };

  const handleReset = () => {
    if (!activeRole) return;
    setGrid(hydrateGrid(activeRole.grants));
    setIsDirty(false);
  };

  const handleSave = async () => {
    if (!activeRole) return;
    const saved = await onSave({ role: activeRole.role, grants: grid, description: activeRole.description });
    // Keep the user on the matrix when the server rejected the change so the
    // error banner is visible next to the grid that caused it.
    if (saved !== false) {
      setIsDirty(false);
      onBack();
    }
  };

  return (
    <div>
      {/* Back navigation + role selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "#2563EB",
            fontSize: "0.85rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            cursor: "pointer",
          }}
        >
          <Icons.ChevronLeft size={16} /> Back to User Directory
        </button>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", alignSelf: "center" }}>
            Role Matrix for:
          </span>
          <select
            className="form-select"
            value={activeRole?.role ?? ""}
            onChange={(e) => setSelectedRole(e.target.value as SystemRole)}
            style={{ padding: "0.45rem 0.85rem", fontSize: "0.85rem" }}
          >
            {roles.map((role) => (
              <option key={role.role} value={role.role}>
                {humanizeStatus(role.role)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Heading */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.65rem", fontWeight: 700, color: "rgb(var(--color-text))" }}>
            Permissions: <span style={{ color: "#2563EB" }}>{humanizeStatus(activeRole?.role)}</span>
          </h1>
          <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", marginTop: "0.25rem" }}>
            Configure granular access levels for system modules for the{" "}
            {humanizeStatus(activeRole?.role).toLowerCase()} organizational role.
          </p>
        </div>
        <span
          style={{
            backgroundColor: "rgba(37, 99, 235, 0.15)",
            color: "#60A5FA",
            borderRadius: "2rem",
            padding: "0.35rem 0.85rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#2563EB" }} />
          {activeRole?.userCount ?? 0} user{activeRole?.userCount === 1 ? "" : "s"} affected
        </span>
      </div>

      {/* Matrix */}
      <div className="table-container" style={{ marginBottom: "2rem" }}>
        <table className="data-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: "40%" }}>MODULE / RESOURCE</th>
              {ACTION_COLUMNS.map((action) => (
                <th key={action} style={{ textAlign: "center" }}>
                  {PERMISSION_ACTION_LABELS[action].toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RESOURCE_GROUPS.map((group) => {
              const GroupIcon = Icons[group.icon] as React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
              return (
                <React.Fragment key={group.label}>
                  {/* Group divider */}
                  <tr style={{ backgroundColor: "rgba(37, 99, 235, 0.08)" }}>
                    <td colSpan={ACTION_COLUMNS.length + 1} style={{ fontWeight: 700, color: "#60A5FA", fontSize: "0.85rem" }}>
                      <GroupIcon size={16} style={{ marginRight: "0.5rem", display: "inline", verticalAlign: "middle" }} />
                      {group.label}
                    </td>
                  </tr>

                  {group.resources.map((resource) => (
                    <tr key={resource}>
                      <td>
                        <div style={{ fontWeight: 700, color: "rgb(var(--color-text))", fontSize: "0.88rem" }}>
                          {PERMISSION_RESOURCE_LABELS[resource]}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                          {RESOURCE_HINTS[resource]}
                        </div>
                      </td>
                      {ACTION_COLUMNS.map((action) => (
                        <td key={action} style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={(grid[resource] ?? []).includes(action)}
                            onChange={() => togglePermission(resource, action)}
                            aria-label={`${PERMISSION_ACTION_LABELS[action]} ${PERMISSION_RESOURCE_LABELS[resource]}`}
                            style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#2563EB" }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      <div
        className="glass-panel"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 1.5rem",
          borderRadius: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>
          <Icons.Info size={16} style={{ color: "#2563EB" }} />
          <span>{isDirty ? "You have unsaved changes." : "All changes saved."}</span>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={handleReset} disabled={!isDirty || busy} className="btn btn-secondary">
            Discard Changes
          </button>
          <button onClick={onBack} className="btn btn-secondary" style={{ border: "none" }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || busy}
            className="btn btn-primary"
            style={{ opacity: !isDirty || busy ? 0.6 : 1 }}
          >
            {busy ? "Saving…" : "Save Permissions"}
          </button>
        </div>
      </div>
    </div>
  );
};

function emptyGrid(): GrantGrid {
  return Object.values(PermissionResource).reduce((acc, resource) => {
    acc[resource] = [];
    return acc;
  }, {} as GrantGrid);
}

/** Fills in every resource so an unchecked box is explicit rather than absent. */
function hydrateGrid(grants: Partial<Record<PermissionResource, PermissionAction[]>>): GrantGrid {
  return Object.values(PermissionResource).reduce((acc, resource) => {
    acc[resource] = [...(grants?.[resource] ?? [])];
    return acc;
  }, {} as GrantGrid);
}
