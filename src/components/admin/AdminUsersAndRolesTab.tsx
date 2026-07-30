import React, { useState } from "react";
import * as Icons from "lucide-react";
import { Pagination } from "../ui/Pagination";

// Matches the row density shown in designs/system-admin/Admin_ User & Role.png
const ROWS_PER_PAGE = 7;

interface AdminUsersAndRolesTabProps {
  systemUsers: any[];
  departments: any[];
  onOpenAddUser: () => void;
  onOpenEditUserProfile: (user: any) => void;
  onOpenEditRole: (roleData: any) => void;
  onOpenSuspendUser: (user: any) => void;
  onOpenDeleteUser: (user: any) => void;
}

export const AdminUsersAndRolesTab: React.FC<AdminUsersAndRolesTabProps> = ({
  systemUsers,
  departments,
  onOpenAddUser,
  onOpenEditUserProfile,
  onOpenEditRole,
  onOpenSuspendUser,
  onOpenDeleteUser
}) => {
  const [viewMode, setViewMode] = useState<"users" | "matrix">("users");
  const [selectedMatrixRole, setSelectedMatrixRole] = useState("Finance Head");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("ALL");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // Fallback user list if empty
  const userList = systemUsers && systemUsers.length > 0 ? systemUsers : [
    { id: "usr-1", name: "Alex Strathmore", email: "a.strathmore@precision.com", departmentName: "Financial Operations", role: "FINANCE_MANAGER", isActive: true },
    { id: "usr-2", name: "Elena Rodriguez", email: "e.rodriguez@precision.com", departmentName: "Human Resources", role: "APPROVER", isActive: true },
    { id: "usr-3", name: "Jordan Wei", email: "j.wei@precision.com", departmentName: "IT Security", role: "ADMIN", isActive: true },
    { id: "usr-4", name: "Sarah Jenkins", email: "s.jenkins@precision.com", departmentName: "Marketing", role: "INITIATOR", isActive: false }
  ];

  // Role permissions matrix state
  const [matrixState, setMatrixState] = useState({
    expenseRequests: { view: true, create: true, edit: true, approve: true, delete: false },
    corporateCards: { view: true, create: true, edit: true, approve: true, delete: false },
    departmentalBudgets: { view: true, create: true, edit: true, approve: true, delete: true },
    forecastModels: { view: true, create: true, edit: true, approve: false, delete: false },
    auditLogs: { view: true, create: false, edit: false, approve: false, delete: false },
    complianceReports: { view: true, create: false, edit: false, approve: true, delete: false },
    roleDefinitions: { view: true, create: false, edit: true, approve: false, delete: false }
  });

  const togglePermission = (key: keyof typeof matrixState, perm: "view" | "create" | "edit" | "approve" | "delete") => {
    setMatrixState(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [perm]: !prev[key][perm]
      }
    }));
  };

  // Filter users
  const filteredUsers = userList.filter(u => {
    const matchesSearch = !searchQuery || 
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
      (u.departmentName || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRoleFilter === "ALL" || u.role === selectedRoleFilter;
    const matchesDept = selectedDeptFilter === "ALL" || (u.departmentName || "").toLowerCase() === selectedDeptFilter.toLowerCase();
    return matchesSearch && matchesRole && matchesDept;
  });

  // Clamp the page so filtering never strands the table on an out-of-range page.
  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredUsers.length / ROWS_PER_PAGE)));
  const visibleUsers = filteredUsers.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  // IF VIEWING ROLE PERMISSIONS MATRIX
  if (viewMode === "matrix") {
    return (
      <div>
        {/* Back navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <button
            onClick={() => setViewMode("users")}
            style={{
              background: "none",
              border: "none",
              color: "#3b82f6",
              fontSize: "0.85rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              cursor: "pointer"
            }}
          >
            <Icons.ChevronLeft size={16} /> Back to User Directory
          </button>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8", alignSelf: "center" }}>Role Matrix for:</span>
            <select
              value={selectedMatrixRole}
              onChange={(e) => setSelectedMatrixRole(e.target.value)}
              style={{ padding: "0.45rem 0.85rem", backgroundColor: "rgb(var(--color-surface))", border: "1px solid rgba(var(--color-card-border), 0.5)", borderRadius: "0.375rem", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}
            >
              <option value="Finance Head">Finance Head</option>
              <option value="Finance Manager">Finance Manager</option>
              <option value="Finance Officer">Finance Officer</option>
              <option value="Approver">Approver / Dept Head</option>
              <option value="Initiator">Initiator</option>
              <option value="System Admin">System Admin</option>
            </select>
          </div>
        </div>

        {/* Matrix Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.65rem", fontWeight: "700", color: "#f8fafc" }}>
              Permissions: <span style={{ color: "#2563eb" }}>{selectedMatrixRole}</span>
            </h1>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.25rem" }}>
              Configure granular access levels for system modules for the {selectedMatrixRole} organizational role.
            </p>
          </div>
          <span style={{ backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", borderRadius: "2rem", padding: "0.35rem 0.85rem", fontSize: "0.75rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#3b82f6" }} /> Active Configuration Mode
          </span>
        </div>

        {/* Permissions Table Card */}
        <div className="glass-panel" style={{ backgroundColor: "#1e293b", borderRadius: "0.75rem", overflow: "hidden", marginBottom: "2rem" }}>
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", backgroundColor: "rgba(15, 23, 42, 0.4)" }}>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.75rem", color: "#94a3b8", width: "40%" }}>MODULE / RESOURCE</th>
                <th style={{ textAlign: "center", padding: "1rem", fontSize: "0.75rem", color: "#94a3b8" }}>VIEW</th>
                <th style={{ textAlign: "center", padding: "1rem", fontSize: "0.75rem", color: "#94a3b8" }}>CREATE</th>
                <th style={{ textAlign: "center", padding: "1rem", fontSize: "0.75rem", color: "#94a3b8" }}>EDIT</th>
                <th style={{ textAlign: "center", padding: "1rem", fontSize: "0.75rem", color: "#94a3b8" }}>APPROVE</th>
                <th style={{ textAlign: "center", padding: "1rem", fontSize: "0.75rem", color: "#94a3b8" }}>DELETE</th>
              </tr>
            </thead>
            <tbody>
              {/* Category 1: Financial Transactions */}
              <tr style={{ backgroundColor: "rgba(59, 130, 246, 0.08)" }}>
                <td colSpan={6} style={{ padding: "0.75rem 1.25rem", fontWeight: "700", color: "#60a5fa", fontSize: "0.85rem" }}>
                  <Icons.Landmark size={16} style={{ marginRight: "0.5rem", display: "inline", verticalAlign: "middle" }} />
                  Financial Transactions
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "1rem 1.25rem" }}>
                  <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.88rem" }}>Expense Requests</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Manage employee spending and reimbursements</div>
                </td>
                {(["view", "create", "edit", "approve", "delete"] as const).map(perm => (
                  <td key={perm} style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={matrixState.expenseRequests[perm]}
                      onChange={() => togglePermission("expenseRequests", perm)}
                      style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#2563eb" }}
                    />
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "1rem 1.25rem" }}>
                  <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.88rem" }}>Corporate Cards</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Card issuance and transaction monitoring</div>
                </td>
                {(["view", "create", "edit", "approve", "delete"] as const).map(perm => (
                  <td key={perm} style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={matrixState.corporateCards[perm]}
                      onChange={() => togglePermission("corporateCards", perm)}
                      style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#2563eb" }}
                    />
                  </td>
                ))}
              </tr>

              {/* Category 2: Strategy & Budgeting */}
              <tr style={{ backgroundColor: "rgba(59, 130, 246, 0.08)" }}>
                <td colSpan={6} style={{ padding: "0.75rem 1.25rem", fontWeight: "700", color: "#60a5fa", fontSize: "0.85rem" }}>
                  <Icons.BarChart3 size={16} style={{ marginRight: "0.5rem", display: "inline", verticalAlign: "middle" }} />
                  Strategy & Budgeting
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "1rem 1.25rem" }}>
                  <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.88rem" }}>Departmental Budgets</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Quarterly allocation and limit setting</div>
                </td>
                {(["view", "create", "edit", "approve", "delete"] as const).map(perm => (
                  <td key={perm} style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={matrixState.departmentalBudgets[perm]}
                      onChange={() => togglePermission("departmentalBudgets", perm)}
                      style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#2563eb" }}
                    />
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "1rem 1.25rem" }}>
                  <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.88rem" }}>Forecast Models</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Predictive analysis for future fiscal years</div>
                </td>
                {(["view", "create", "edit", "approve", "delete"] as const).map(perm => (
                  <td key={perm} style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={matrixState.forecastModels[perm]}
                      onChange={() => togglePermission("forecastModels", perm)}
                      style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#2563eb" }}
                    />
                  </td>
                ))}
              </tr>

              {/* Category 3: Governance & Logs */}
              <tr style={{ backgroundColor: "rgba(59, 130, 246, 0.08)" }}>
                <td colSpan={6} style={{ padding: "0.75rem 1.25rem", fontWeight: "700", color: "#60a5fa", fontSize: "0.85rem" }}>
                  <Icons.ShieldCheck size={16} style={{ marginRight: "0.5rem", display: "inline", verticalAlign: "middle" }} />
                  Governance & Logs
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "1rem 1.25rem" }}>
                  <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.88rem" }}>Audit Logs</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Immutable history of system changes</div>
                </td>
                {(["view", "create", "edit", "approve", "delete"] as const).map(perm => (
                  <td key={perm} style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={matrixState.auditLogs[perm]}
                      onChange={() => togglePermission("auditLogs", perm)}
                      style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#2563eb" }}
                    />
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "1rem 1.25rem" }}>
                  <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.88rem" }}>Compliance Reports</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Regulatory filing data and validation</div>
                </td>
                {(["view", "create", "edit", "approve", "delete"] as const).map(perm => (
                  <td key={perm} style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={matrixState.complianceReports[perm]}
                      onChange={() => togglePermission("complianceReports", perm)}
                      style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#2563eb" }}
                    />
                  </td>
                ))}
              </tr>

              {/* Category 4: User & Access Management */}
              <tr style={{ backgroundColor: "rgba(59, 130, 246, 0.08)" }}>
                <td colSpan={6} style={{ padding: "0.75rem 1.25rem", fontWeight: "700", color: "#60a5fa", fontSize: "0.85rem" }}>
                  <Icons.Users size={16} style={{ marginRight: "0.5rem", display: "inline", verticalAlign: "middle" }} />
                  User & Access Management
                </td>
              </tr>
              <tr>
                <td style={{ padding: "1rem 1.25rem" }}>
                  <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.88rem" }}>Role Definitions</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Editing base templates for organization roles</div>
                </td>
                {(["view", "create", "edit", "approve", "delete"] as const).map(perm => (
                  <td key={perm} style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={matrixState.roleDefinitions[perm]}
                      onChange={() => togglePermission("roleDefinitions", perm)}
                      style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#2563eb" }}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Action Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#94a3b8" }}>
            <Icons.Info size={16} style={{ color: "#3b82f6" }} />
            <span>Unsaved changes will be permanently lost.</span>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => alert("Reset permissions matrix to default template.")}
              style={{ padding: "0.6rem 1.15rem", borderRadius: "0.5rem", border: "1px solid rgba(255, 255, 255, 0.15)", backgroundColor: "transparent", color: "#f8fafc", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}
            >
              Reset to Default
            </button>
            <button
              onClick={() => setViewMode("users")}
              style={{ padding: "0.6rem 1.15rem", borderRadius: "0.5rem", border: "none", backgroundColor: "transparent", color: "#94a3b8", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                alert("Role permissions matrix successfully saved!");
                setViewMode("users");
              }}
              style={{ padding: "0.6rem 1.25rem", borderRadius: "0.5rem", border: "none", backgroundColor: "#2563eb", color: "#ffffff", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)" }}
            >
              Save Permissions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN USER MANAGEMENT DIRECTORY VIEW
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#f8fafc" }}>User Management</h1>
          <p style={{ fontSize: "0.9rem", color: "#94a3b8", marginTop: "0.25rem" }}>
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

      {/* 4 Summary Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        {/* TOTAL USERS */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>TOTAL USERS</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#f8fafc", marginTop: "0.15rem" }}>124</div>
            </div>
          </div>
        </div>

        {/* ACTIVE ROLES */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>ACTIVE ROLES</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#f8fafc", marginTop: "0.15rem" }}>8</div>
            </div>
          </div>
        </div>

        {/* DEPARTMENTS */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(139, 92, 246, 0.15)", color: "#a78bfa", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.Building2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>DEPARTMENTS</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#f8fafc", marginTop: "0.15rem" }}>12</div>
            </div>
          </div>
        </div>

        {/* SUSPENDED */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.Lock size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>SUSPENDED</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#f8fafc", marginTop: "0.15rem" }}>3</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar Card */}
      <div className="glass-panel" style={{ padding: "1rem 1.25rem", backgroundColor: "#1e293b", borderRadius: "0.75rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", flexGrow: 1 }}>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600", display: "block", marginBottom: "0.25rem" }}>Role</span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              style={{ padding: "0.5rem 0.85rem", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.375rem", color: "#f8fafc", fontSize: "0.85rem" }}
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
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600", display: "block", marginBottom: "0.25rem" }}>Department</span>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              style={{ padding: "0.5rem 0.85rem", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.375rem", color: "#f8fafc", fontSize: "0.85rem" }}
            >
              <option value="ALL">All Departments</option>
              {departments.map((d: any) => (
                <option key={d._id || d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", flexGrow: 1, maxWidth: "340px", marginTop: "1rem" }}>
            <Icons.Search size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
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
                color: "#f8fafc",
                fontSize: "0.85rem",
                outline: "none"
              }}
            />
          </div>
        </div>

        <button
          onClick={() => alert("Exporting user directory to CSV...")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            backgroundColor: "transparent",
            color: "#f8fafc",
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
      <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "#1e293b", borderRadius: "0.75rem", marginBottom: "2rem" }}>
        <div className="table-container">
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <th style={{ fontSize: "0.75rem", color: "#94a3b8" }}>NAME</th>
                <th style={{ fontSize: "0.75rem", color: "#94a3b8" }}>DEPARTMENT</th>
                <th style={{ fontSize: "0.75rem", color: "#94a3b8" }}>ASSIGNED ROLE</th>
                <th style={{ fontSize: "0.75rem", color: "#94a3b8" }}>STATUS</th>
                <th style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u: any, idx: number) => {
                const userName = u.name || u.fullName || "User";
                const userEmail = u.email || "";
                const deptName = u.departmentName || u.department?.name || "General";
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
                          <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.9rem" }}>{userName}</div>
                          <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{userEmail}</div>
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

                    {/* ASSIGNED ROLE Dropdown */}
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => alert(`Role for ${userName} changed to ${e.target.value}`)}
                        style={{
                          padding: "0.4rem 0.75rem",
                          backgroundColor: "rgba(15, 23, 42, 0.6)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          borderRadius: "0.5rem",
                          color: "#f8fafc",
                          fontSize: "0.82rem",
                          outline: "none"
                        }}
                      >
                        <option value="FINANCE_MANAGER" style={{ background: "#1e293b" }}>Finance Manager</option>
                        <option value="APPROVER" style={{ background: "#1e293b" }}>Approver</option>
                        <option value="ADMIN" style={{ background: "#1e293b" }}>Admin</option>
                        <option value="INITIATOR" style={{ background: "#1e293b" }}>Initiator</option>
                        <option value="FINANCE_OFFICER" style={{ background: "#1e293b" }}>Finance Officer</option>
                        <option value="FINANCE_HEAD" style={{ background: "#1e293b" }}>Finance Head</option>
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
                        <span style={{ fontSize: "0.82rem", color: "#f8fafc", fontWeight: "600" }}>
                          {u.isActive !== false ? "Active" : "Inactive"}
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
                          onClick={() => onOpenEditRole(u)}
                          title="Edit Role Config"
                          style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", padding: "0.25rem" }}
                        >
                          <Icons.Shield size={16} />
                        </button>
                        <button
                          onClick={() => onOpenSuspendUser(u)}
                          title="Suspend Access"
                          style={{ background: "none", border: "none", color: "#f59e0b", cursor: "pointer", padding: "0.25rem" }}
                        >
                          <Icons.Lock size={16} />
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

      {/* Departmental Access Overview Card at Bottom */}
      <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#f8fafc", marginBottom: "1.25rem" }}>
          Departmental Access Overview
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
              <span style={{ fontWeight: "700", color: "#f8fafc" }}>Finance</span>
              <span style={{ color: "#94a3b8" }}>₦ 45,200,000 Allocated • 42 Users</span>
            </div>
            <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: "3px" }}>
              <div style={{ width: "82%", height: "100%", backgroundColor: "#2563eb", borderRadius: "3px" }} />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
              <span style={{ fontWeight: "700", color: "#f8fafc" }}>IT Infrastructure</span>
              <span style={{ color: "#94a3b8" }}>₦ 12,800,000 Allocated • 28 Users</span>
            </div>
            <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: "3px" }}>
              <div style={{ width: "55%", height: "100%", backgroundColor: "#10b981", borderRadius: "3px" }} />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
              <span style={{ fontWeight: "700", color: "#f8fafc" }}>Marketing</span>
              <span style={{ color: "#94a3b8" }}>₦ 8,500,000 Allocated • 15 Users</span>
            </div>
            <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: "3px" }}>
              <div style={{ width: "40%", height: "100%", backgroundColor: "#a78bfa", borderRadius: "3px" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
