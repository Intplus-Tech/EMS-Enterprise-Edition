/**
 * AdminEditDepartmentModal
 * Full department editor: identity, head, fiscal-year budget, per-category allocation
 * breakdown and the assigned-user roster. Consumed by DashboardShell (admin routes).
 * Design source: designs/system-admin/Admin_ Edit Department Modal.png
 */
import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { ModalShell } from "../../ui/ModalShell";
import { DEPARTMENT_SCOPED_ROLES } from "../../../enums/roles";
import { formatNairaPrecise, formatNairaCompact } from "../../ui/format";
import { AdminAddBudgetItemModal, BudgetItemPayload } from "./AdminAddBudgetItemModal";

interface BudgetLine {
  category: string;
  amount: number;
  utilization: number;
  description?: string;
}

interface AdminEditDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: any;
  /** Optional roster; when omitted the department's own `members` array is used. */
  users?: any[];
  /** Optional pick-list for the Department Head selector. */
  departmentHeads?: string[];
  onUpdateDepartment: (deptData: any) => void;
  /**
   * Moves a user into this department. Without it the "Add User" button in the
   * Assigned Users header had no handler at all — an admin could search for
   * someone, press it, and nothing whatsoever happened.
   */
  onAssignUser?: (userId: string) => Promise<boolean | void> | void;
}

// Utilisation at or above this share is flagged so admins can react before an overrun.
const AT_RISK_THRESHOLD = 85;

export const AdminEditDepartmentModal: React.FC<AdminEditDepartmentModalProps> = ({
  isOpen,
  onClose,
  department,
  users,
  departmentHeads,
  onUpdateDepartment,
  onAssignUser
}) => {
  const [deptName, setDeptName] = useState("");
  const [head, setHead] = useState("");
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [userSearch, setUserSearch] = useState("");
  // The candidate picked out of the search results, awaiting "Add User".
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);

  useEffect(() => {
    if (department) {
      setDeptName(department.name || "");
      setHead(department.head || department.headName || "");
      // Show what is actually allocated. Placeholder figures (a ₦250,000 budget
      // and three invented allocation lines) previously made an unconfigured
      // department look funded, and saving would have persisted the fiction.
      setTotalBudget(department.totalBudget ?? 0);
      setLines(department.budgetItems ?? []);
      setUserSearch("");
    }
  }, [department]);

  if (!isOpen || !department) return null;

  const departmentId = String(department.id || department._id || "");
  const deptIdOf = (u: any) => String(u.department?.id ?? u.departmentId ?? "");

  // Only staff actually assigned to this department belong on its roster. The
  // filter also admitted anyone with *no* department, so every enterprise-wide
  // account (admin, finance officer/manager/head) was listed as a member of
  // every department, and the headcount counted them.
  const allUsers: any[] = users || department.members || [];
  const roster: any[] = allUsers.filter((u) => deptIdOf(u) === departmentId);
  const headcount = department.usersCount ?? roster.length;
  const spentToDate = department.utilised ?? department.utilized ?? 0;

  // Head list falls back to the roster so the select is never empty in demo data.
  const headOptions: string[] = departmentHeads?.length
    ? departmentHeads
    : Array.from(new Set([head, ...roster.map((u) => u.name || u.fullName)].filter(Boolean))) as string[];

  const matchesSearch = (u: any) =>
    `${u.name || u.fullName || ""} ${u.email || ""}`.toLowerCase().includes(userSearch.trim().toLowerCase());

  const visibleUsers = roster.filter(matchesSearch);

  /**
   * Staff who could be moved into this department. Only the two
   * department-scoped roles are offered: assigning a finance or admin account to
   * a department would silently narrow the work it can see.
   */
  const candidates: any[] = userSearch.trim()
    ? allUsers.filter(
        (u) =>
          deptIdOf(u) !== departmentId &&
          DEPARTMENT_SCOPED_ROLES.includes(u.role) &&
          matchesSearch(u)
      )
    : [];

  const selectedCandidate = candidates.find((u) => String(u.id ?? u._id) === selectedCandidateId) ?? null;

  const handleAddUser = async () => {
    if (!selectedCandidate || !onAssignUser) return;
    await onAssignUser(String(selectedCandidate.id ?? selectedCandidate._id));
    setSelectedCandidateId("");
    setUserSearch("");
  };

  const handleAddLine = (item: BudgetItemPayload) => {
    setLines([...lines, { category: item.category, amount: item.amount, utilization: 0, description: item.description }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onUpdateDepartment({
      ...department,
      name: deptName,
      head,
      totalBudget: Number(totalBudget),
      budgetItems: lines
    });
    onClose();
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Edit Department Details"
        subtitle="Configure organizational structure and fiscal allocation"
        maxWidth="960px"
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            {/* Advisory note — saving is not sandboxed, it hits the live reporting cycle */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>
              <Icons.Info size={18} style={{ color: "#EF4444", flexShrink: 0 }} />
              Changes will affect the Q3 reporting cycle immediately upon saving.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexShrink: 0 }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ background: "none", border: "none" }}>
                Cancel
              </button>
              <button type="button" onClick={handleSubmit} className="btn btn-primary" style={{ background: "#2563EB", border: "none" }}>
                Save Changes
              </button>
            </div>
          </div>
        }
      >
        {/* Identity row — editable name beside read-only vitals */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) auto auto", gap: "1rem", alignItems: "end", marginBottom: "1.5rem" }}>
          <div>
            <label className="form-label">Department Name</label>
            <input type="text" className="form-input" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
          </div>

          <div style={{
            minWidth: "170px",
            padding: "0.85rem 1rem",
            borderRadius: "0.65rem",
            background: "rgba(37, 99, 235, 0.08)",
            border: "1px solid rgba(37, 99, 235, 0.18)"
          }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em", color: "rgb(var(--color-text-muted))" }}>
              TOTAL HEADCOUNT
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#2563EB", marginTop: "0.25rem" }}>{headcount} Members</div>
          </div>

          <div style={{
            minWidth: "170px",
            padding: "0.85rem 1rem",
            borderRadius: "0.65rem",
            background: "rgba(var(--color-surface-secondary), 0.5)",
            border: "1px solid rgb(var(--color-card-border))"
          }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em", color: "rgb(var(--color-text-muted))" }}>
              SPENT TO DATE
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, marginTop: "0.25rem" }}>{formatNairaCompact(spentToDate)}</div>
          </div>
        </div>

        {/* Ownership + fiscal envelope */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.75rem" }}>
          <div>
            <label className="form-label">Department Head</label>
            <select className="form-select" value={head} onChange={(e) => setHead(e.target.value)}>
              <option value="">Select a department head</option>
              {headOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Fiscal Year Budget (₦)</label>
            <input
              type="number"
              min={0}
              className="form-input"
              value={totalBudget}
              onChange={(e) => setTotalBudget(Number(e.target.value))}
              style={{ textAlign: "right" }}
            />
          </div>
        </div>

        {/* Budget Allocation Breakdown */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Budget Allocation Breakdown</h4>
          <button
            type="button"
            onClick={() => setShowAddCategory(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", color: "#2563EB", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
          >
            <Icons.Plus size={15} /> Add Category
          </button>
        </div>

        <div className="table-container" style={{ marginBottom: "1.75rem" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>CATEGORY</th>
                <th style={{ textAlign: "right" }}>ALLOCATED AMOUNT</th>
                <th>UTILIZATION</th>
                <th>STATUS</th>
                <th style={{ width: "2.5rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const atRisk = line.utilization >= AT_RISK_THRESHOLD;
                return (
                  <tr key={`${line.category}-${index}`}>
                    <td style={{ fontWeight: 600 }}>{line.category}</td>
                    <td style={{ textAlign: "right" }}>{formatNairaPrecise(line.amount)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{ width: "62px", height: "6px", borderRadius: "3px", background: "rgba(var(--color-surface-secondary), 0.8)", overflow: "hidden" }}>
                          <div style={{
                            width: `${Math.min(line.utilization, 100)}%`,
                            height: "100%",
                            borderRadius: "3px",
                            background: atRisk ? "#DC2626" : "#2563EB"
                          }} />
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>{line.utilization}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${atRisk ? "badge-rejected" : "badge-paid"}`} style={{ fontSize: "0.68rem" }}>
                        {atRisk ? "AT RISK" : "ON TRACK"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(index)}
                        aria-label={`Remove ${line.category}`}
                        style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))", cursor: "pointer" }}
                      >
                        <Icons.MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "rgb(var(--color-text-dim))", padding: "1rem" }}>
                    No budget categories yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Assigned Users */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "0.85rem" }}>
          <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Assigned Users</h4>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ position: "relative" }}>
              <Icons.Search
                size={15}
                style={{ position: "absolute", left: "0.7rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-dim))" }}
              />
              <input
                type="text"
                className="form-input"
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setSelectedCandidateId(""); }}
                placeholder="Search users..."
                style={{ paddingLeft: "2rem", minWidth: "210px" }}
              />
            </div>
            <button
              type="button"
              onClick={handleAddUser}
              disabled={!selectedCandidate || !onAssignUser}
              title={selectedCandidate ? undefined : "Search for a user, then pick them from the results"}
              className="btn btn-primary"
              style={{
                whiteSpace: "nowrap",
                opacity: selectedCandidate && onAssignUser ? 1 : 0.5,
                cursor: selectedCandidate && onAssignUser ? "pointer" : "not-allowed",
              }}
            >
              Add User
            </button>
          </div>
        </div>

        {/* Search results for staff not yet in this department. Pick one, then
            "Add User" moves them across. Only initiators and approvers appear —
            the other roles are enterprise-wide by design. */}
        {userSearch.trim() && (
          <div
            style={{
              border: "1px solid rgb(var(--color-card-border))",
              borderRadius: "0.65rem",
              padding: "0.5rem",
              marginBottom: "0.85rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              maxHeight: "170px",
              overflowY: "auto",
            }}
          >
            {candidates.length === 0 ? (
              <span style={{ fontSize: "0.82rem", color: "rgb(var(--color-text-dim))", padding: "0.4rem 0.5rem" }}>
                No unassigned initiators or approvers match &quot;{userSearch.trim()}&quot;.
              </span>
            ) : (
              candidates.map((u: any) => {
                const id = String(u.id ?? u._id);
                const picked = id === selectedCandidateId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedCandidateId(picked ? "" : id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      padding: "0.5rem 0.65rem",
                      borderRadius: "0.5rem",
                      border: `1px solid ${picked ? "rgb(var(--color-primary))" : "transparent"}`,
                      background: picked ? "rgba(var(--color-primary), 0.1)" : "transparent",
                      color: "rgb(var(--color-text))",
                      cursor: "pointer",
                      textAlign: "left",
                      font: "inherit",
                    }}
                  >
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      {u.name || u.fullName}
                      <span style={{ fontWeight: 400, color: "rgb(var(--color-text-muted))", marginLeft: "0.4rem" }}>
                        {u.email}
                      </span>
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "rgb(var(--color-text-dim))", whiteSpace: "nowrap" }}>
                      {u.department?.name ? `in ${u.department.name}` : "Unassigned"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.85rem" }}>
          {visibleUsers.map((user: any, index: number) => {
            const name = user.name || user.fullName || "Unnamed user";
            const initials = name.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
            const active = user.isActive !== false;
            return (
              <div
                key={user._id || user.id || `${name}-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 0.9rem",
                  borderRadius: "0.65rem",
                  background: "rgb(var(--color-card))",
                  border: "1px solid rgb(var(--color-card-border))"
                }}
              >
                <div style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "rgba(37, 99, 235, 0.12)",
                  color: "#2563EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                  <div style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.jobTitle || user.role || "Team Member"}
                  </div>
                </div>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: active ? "#10B981" : "rgb(var(--color-text-dim))",
                  flexShrink: 0
                }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: active ? "#10B981" : "rgb(var(--color-text-dim))" }} />
                  {active ? "Active" : "Inactive"}
                </span>
              </div>
            );
          })}
          {visibleUsers.length === 0 && (
            <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-dim))", margin: 0 }}>No users assigned to this department yet.</p>
          )}
        </div>
      </ModalShell>

      {/* "Add Category" reuses the standalone budget-item modal instead of a bespoke form */}
      <AdminAddBudgetItemModal
        isOpen={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        departmentName={deptName}
        onAddItem={handleAddLine}
      />
    </>
  );
};
