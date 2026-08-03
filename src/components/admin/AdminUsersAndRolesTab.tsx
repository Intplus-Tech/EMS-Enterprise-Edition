import React, { useState } from "react";
import * as Icons from "lucide-react";
import { Pagination } from "../ui/Pagination";
import { StatCard } from "../ui/StatCard";
import { datedFilename, downloadCsv } from "../ui/exportCsv";
import { RolePermissionsMatrix } from "./RolePermissionsMatrix";
import { SystemRole } from "../../enums/roles";
import { PermissionAction, PermissionResource } from "../../enums/permissions";
import { EmptyState } from "../ui/EmptyState";
import { formatNaira, humanizeStatus } from "../ui/format";
import { AdminUserDto, DepartmentDto, DepartmentSpendDto, RolePermissionDto } from "../../types/api";

// Matches the row density shown in designs/system-admin/Admin_ User & Role.png
const ROWS_PER_PAGE = 7;

// Shown wherever a department would go for admin and finance accounts, which
// are enterprise-wide rather than department-scoped. Doubles as a filter value.
const GLOBAL_SCOPE_LABEL = "Enterprise-wide";

interface AdminUsersAndRolesTabProps {
  systemUsers: AdminUserDto[];
  departments: DepartmentDto[];
  rolePermissions: RolePermissionDto[];
  onOpenAddUser: () => void;
  onOpenEditUserProfile: (user: AdminUserDto) => void;
  onOpenEditRole: (roleData: RolePermissionDto) => void;
  onOpenSuspendUser: (user: AdminUserDto) => void;
  onOpenDeleteUser: (user: AdminUserDto) => void;
  onSaveRolePermissions: (input: {
    role: SystemRole;
    grants: Record<PermissionResource, PermissionAction[]>;
    description?: string;
  }) => Promise<boolean> | void;
  /** Persists an inline role change made from the directory table. */
  onChangeUserRole: (user: AdminUserDto, role: SystemRole) => Promise<boolean> | void;
  /** Per-department budget allocations, for the access overview. */
  budgets: DepartmentSpendDto[];
  /** True while an admin mutation is in flight. */
  busy?: boolean;
}

export const AdminUsersAndRolesTab: React.FC<AdminUsersAndRolesTabProps> = ({
  systemUsers,
  departments,
  rolePermissions,
  onOpenAddUser,
  onOpenEditUserProfile,
  onOpenEditRole,
  onOpenSuspendUser,
  onOpenDeleteUser,
  onSaveRolePermissions,
  onChangeUserRole,
  budgets,
  busy = false
}) => {
  const [viewMode, setViewMode] = useState<"users" | "matrix">("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("ALL");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // Exports exactly what the filters currently show, not the whole directory.
  const handleExportDirectory = () => {
    downloadCsv(datedFilename("user-directory"), filteredUsers, [
      { header: "Name", value: (u) => u.name },
      { header: "Email", value: (u) => u.email },
      { header: "Role", value: (u) => u.role },
      { header: "Department", value: (u) => deptNameOf(u) || GLOBAL_SCOPE_LABEL },
      { header: "Status", value: (u) => (u.isActive ? "Active" : "Suspended") },
      { header: "Invite Pending", value: (u) => (u.isInvited ? "Yes" : "No") },
    ]);
  };

  // Reads the department name from either shape the row can arrive in.
  const deptNameOf = (u: AdminUserDto) => u.departmentName || u.department?.name || "";

  /**
   * Allocation and headcount per department, sorted so the widest bar is the
   * largest allocation. Bars are relative to the biggest budget, so a directory
   * with no budgets set renders flat instead of dividing by zero.
   */
  const departmentAccess = (() => {
    const spendById = new Map(budgets.map((b) => [b.id, b]));
    const rows = departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      totalBudget: spendById.get(dept.id)?.totalBudget ?? 0,
      userCount: systemUsers.filter((u) => deptNameOf(u) === dept.name).length,
      sharePct: 0,
    }));
    const largest = Math.max(...rows.map((r) => r.totalBudget), 0);
    rows.forEach((r) => {
      r.sharePct = largest > 0 ? Math.round((r.totalBudget / largest) * 100) : 0;
    });
    return rows.sort((a, b) => b.totalBudget - a.totalBudget);
  })();

  // Filter users
  const filteredUsers = systemUsers.filter(u => {
    const matchesSearch = !searchQuery || 
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
      deptNameOf(u).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRoleFilter === "ALL" || u.role === selectedRoleFilter;
    // The synthetic "Enterprise-wide" option isolates the global-role accounts,
    // which have no department name to match on.
    const matchesDept =
      selectedDeptFilter === "ALL" ||
      (selectedDeptFilter === GLOBAL_SCOPE_LABEL
        ? !deptNameOf(u)
        : deptNameOf(u).toLowerCase() === selectedDeptFilter.toLowerCase());
    return matchesSearch && matchesRole && matchesDept;
  });

  // Clamp the page so filtering never strands the table on an out-of-range page.
  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredUsers.length / ROWS_PER_PAGE)));
  const visibleUsers = filteredUsers.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  // IF VIEWING ROLE PERMISSIONS MATRIX
  // Role permissions grid lives in its own component (see RolePermissionsMatrix).
  if (viewMode === "matrix") {
    return (
      <RolePermissionsMatrix
        roles={rolePermissions}
        onSave={onSaveRolePermissions}
        onBack={() => setViewMode("users")}
        busy={busy}
      />
    );
  }

  // MAIN USER MANAGEMENT DIRECTORY VIEW
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>User Management</h1>
          <p style={{ fontSize: "0.9rem", color: "rgb(var(--color-text-muted))", marginTop: "0.25rem" }}>
            Maintain organizational hierarchy and manage system access privileges.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => setViewMode("matrix")}
            style={{
              padding: "0.65rem 1.15rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              backgroundColor: "transparent",
              color: "#60a5fa",
              fontWeight: "600",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              cursor: "pointer"
            }}
          >
            <Icons.Shield size={16} /> Role Permissions Matrix
          </button>
          <button
            onClick={onOpenAddUser}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontWeight: "600",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)"
            }}
          >
            <Icons.UserPlus size={18} /> Add New User
          </button>
        </div>
      </div>

      {/* Summary tiles — real counts from the loaded directory. These were
          previously hardcoded to 124 / 8 / 12 / 3 regardless of the data. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <StatCard
          label="Total Users"
          value={systemUsers.length}
          icon={<Icons.Users size={20} />}
          tone="primary"
        />
        <StatCard
          label="Active Roles"
          value={rolePermissions.filter((r) => r.isActive).length}
          icon={<Icons.ShieldCheck size={20} />}
          tone="success"
        />
        <StatCard
          label="Departments"
          value={departments.length}
          icon={<Icons.Building2 size={20} />}
          tone="neutral"
        />
        <StatCard
          label="Suspended"
          value={systemUsers.filter((u) => !u.isActive).length}
          icon={<Icons.Lock size={20} />}
          tone="danger"
        />
      </div>

      {/* Filter Bar Card */}
      <div className="glass-panel" style={{ padding: "1rem 1.25rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", flexGrow: 1 }}>
          <div>
            <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", fontWeight: "600", display: "block", marginBottom: "0.25rem" }}>Role</span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              style={{ padding: "0.5rem 0.85rem", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.375rem", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="FINANCE_HEAD">Finance Head</option>
              <option value="FINANCE_MANAGER">Finance Manager</option>
              <option value="FINANCE_OFFICER">Finance Officer</option>
              <option value="APPROVER">Approver</option>
              <option value="INITIATOR">Initiator</option>
            </select>
          </div>

          <div>
            <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", fontWeight: "600", display: "block", marginBottom: "0.25rem" }}>Department</span>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              style={{ padding: "0.5rem 0.85rem", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.375rem", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}
            >
              <option value="ALL">All Departments</option>
              {departments.map((d: any) => (
                <option key={d._id || d.id} value={d.name}>{d.name}</option>
              ))}
              <option value={GLOBAL_SCOPE_LABEL}>{GLOBAL_SCOPE_LABEL}</option>
            </select>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", flexGrow: 1, maxWidth: "340px", marginTop: "1rem" }}>
            <Icons.Search size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-muted))" }} />
            <input
              type="text"
              placeholder="Search by Req ID, Dept or Title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.85rem 0.5rem 2.4rem",
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "0.375rem",
                color: "rgb(var(--color-text))",
                fontSize: "0.85rem",
                outline: "none"
              }}
            />
          </div>
        </div>

        <button
          onClick={handleExportDirectory}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            backgroundColor: "transparent",
            color: "rgb(var(--color-text))",
            fontWeight: "600",
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            cursor: "pointer"
          }}
        >
          <Icons.Download size={14} /> Export CSV
        </button>
      </div>

      {/* Users Table Card */}
      <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem", marginBottom: "2rem" }}>
        <div className="table-container">
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>NAME</th>
                <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>DEPARTMENT</th>
                <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>ASSIGNED ROLE</th>
                <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>STATUS</th>
                <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u: any, idx: number) => {
                const userName = u.name || u.fullName || "User";
                const userEmail = u.email || "";
                // Global roles (admin, finance officer/manager/head) hold no
                // department, so the cell states the scope rather than implying
                // a "General" department that does not exist.
                const deptName = u.departmentName || u.department?.name || GLOBAL_SCOPE_LABEL;
                const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

                return (
                  <tr key={u.id || idx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    {/* NAME */}
                    <td style={{ padding: "1rem 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          backgroundColor: "#2563eb",
                          color: "#ffffff",
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
                          <div style={{ fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.9rem" }}>{userName}</div>
                          <div style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-muted))" }}>{userEmail}</div>
                        </div>
                      </div>
                    </td>

                    {/* DEPARTMENT */}
                    <td>
                      <span style={{
                        backgroundColor: "rgba(59, 130, 246, 0.12)",
                        color: "#93c5fd",
                        borderRadius: "2rem",
                        padding: "0.3rem 0.75rem",
                        fontSize: "0.78rem",
                        fontWeight: "600"
                      }}>
                        {deptName}
                      </span>
                    </td>

                    {/* ASSIGNED ROLE — persists. This used to `alert()` the new
                        role and change nothing, so the directory disagreed with
                        what the server enforced on the very next request.
                        Options come from the SystemRole enum (rule 2). */}
                    <td>
                      <select
                        value={u.role}
                        disabled={busy}
                        aria-label={`Role for ${userName}`}
                        className="form-select"
                        onChange={(e) => onChangeUserRole(u, e.target.value as SystemRole)}
                        style={{ padding: "0.4rem 0.75rem", fontSize: "0.82rem", width: "auto", minWidth: "150px" }}
                      >
                        {Object.values(SystemRole).map((role) => (
                          <option key={role} value={role}>{humanizeStatus(role)}</option>
                        ))}
                      </select>
                    </td>

                    {/* STATUS */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <span style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: u.isActive !== false ? "#10b981" : "#ef4444"
                        }} />
                        <span style={{ fontSize: "0.82rem", color: "rgb(var(--color-text))", fontWeight: "600" }}>
                          {/* "Suspended", not "Inactive" — matches the stat card
                              and the CSV export so one account reads one way. */}
                          {u.isActive !== false ? "Active" : "Suspended"}
                        </span>
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.35rem" }}>
                        <button
                          onClick={() => onOpenEditUserProfile(u)}
                          title="Edit Profile"
                          style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", padding: "0.25rem" }}
                        >
                          <Icons.Edit size={16} />
                        </button>
                        <button
                          onClick={() => {
                            // Opens the config for the *role* this user holds —
                            // passing the user itself left the modal without any
                            // grants to render.
                            const roleConfig = rolePermissions.find((r) => r.role === u.role);
                            if (roleConfig) onOpenEditRole(roleConfig);
                          }}
                          disabled={!rolePermissions.some((r) => r.role === u.role)}
                          title="Edit Role Config"
                          style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", padding: "0.25rem" }}
                        >
                          <Icons.Shield size={16} />
                        </button>
                        {/* Access toggle — a suspended account offers Restore,
                            not another Suspend that would change nothing. */}
                        <button
                          onClick={() => onOpenSuspendUser(u)}
                          title={u.isActive === false ? "Restore Access" : "Suspend Access"}
                          aria-label={`${u.isActive === false ? "Restore" : "Suspend"} access for ${userName}`}
                          style={{
                            background: "none",
                            border: "none",
                            color: u.isActive === false ? "#10b981" : "#f59e0b",
                            cursor: "pointer",
                            padding: "0.25rem"
                          }}
                        >
                          {u.isActive === false ? <Icons.Unlock size={16} /> : <Icons.Lock size={16} />}
                        </button>
                        <button
                          onClick={() => onOpenDeleteUser(u)}
                          title="Delete User"
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.25rem" }}
                        >
                          <Icons.Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          page={safePage}
          rowsPerPage={ROWS_PER_PAGE}
          totalCount={filteredUsers.length}
          onPageChange={setPage}
          itemLabel="users"
        />
      </div>

      {/* Departmental Access Overview — allocation and headcount per department,
          joined from the budget summaries and the directory. These were three
          fixed rows (Finance / IT Infrastructure / Marketing) with invented
          figures and bar widths that never moved. */}
      <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "rgb(var(--color-text))", marginBottom: "1.25rem" }}>
          Departmental Access Overview
        </h3>

        {departmentAccess.length === 0 ? (
          <EmptyState
            icon={<Icons.Building2 size={20} />}
            title="No departments configured"
            description="Create a department to see its allocation and headcount here."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {departmentAccess.map((dept) => (
              <div key={dept.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem", gap: "1rem" }}>
                  <span style={{ fontWeight: "700", color: "rgb(var(--color-text))" }}>{dept.name}</span>
                  <span style={{ color: "rgb(var(--color-text-muted))" }}>
                    {dept.totalBudget > 0 ? `${formatNaira(dept.totalBudget)} Allocated` : "No budget set"}
                    {" \u2022 "}
                    {dept.userCount} {dept.userCount === 1 ? "User" : "Users"}
                  </span>
                </div>
                <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(var(--color-card-border), 0.5)", borderRadius: "3px" }}>
                  <div style={{ width: `${dept.sharePct}%`, height: "100%", backgroundColor: "#2563EB", borderRadius: "3px" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
