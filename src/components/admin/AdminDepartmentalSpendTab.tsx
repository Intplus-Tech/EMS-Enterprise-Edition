import React, { useState } from "react";
import { Pagination } from "../ui/Pagination";
import { formatNaira, humanizeStatus, statusBadgeClass } from "../ui/format";
import { datedFilename, downloadCsv } from "../ui/exportCsv";
import { DepartmentDto, DepartmentSpendDto, PopulatedExpenseDto } from "../../types/api";
import { RequestStatus } from "../../enums/statuses";

// Matches the row density shown in designs/system-admin/Admin_ Department Management.png
const ROWS_PER_PAGE = 5;
import * as Icons from "lucide-react";

/** A department row joined with its budget figures for this screen. */
export type AdminDepartmentRow = DepartmentDto & Omit<DepartmentSpendDto, "id" | "name" | "description" | "isActive">;

/** Statuses that count as still open for the Pending Requests tile. */
const OPEN_STATUSES: string[] = [
  RequestStatus.SUBMITTED,
  RequestStatus.BUDGET_CHECK,
  RequestStatus.INSUFFICIENT_BUDGET,
  RequestStatus.PENDING_EXCEPTIONAL,
  RequestStatus.PENDING_APPROVAL,
  RequestStatus.APPROVED,
  RequestStatus.SENT_TO_FINANCE,
  RequestStatus.UPLOADED_TO_BANK,
  RequestStatus.AWAITING_RELEASE,
];

/** A deleted department stays in the table awaiting purge — see DepartmentService.beginDeletion. */
const pendingDeletion = (d: AdminDepartmentRow) => d.isPendingDeletion === true;

interface AdminDepartmentalSpendTabProps {
  departments: AdminDepartmentRow[];
  /** Every request, used by the per-department analytics drill-down. */
  expenses?: PopulatedExpenseDto[];
  onOpenCreateDept: () => void;
  onOpenEditDept: (dept: AdminDepartmentRow) => void;
  onOpenDeleteDept: (dept: AdminDepartmentRow) => void;
  /** Reactivates an archived department — no confirmation, it is reversible. */
  onRestoreDept: (dept: AdminDepartmentRow) => void;
}

export const AdminDepartmentalSpendTab: React.FC<AdminDepartmentalSpendTabProps> = ({
  departments,
  expenses = [],
  onOpenCreateDept,
  onOpenEditDept,
  onOpenDeleteDept,
  onRestoreDept
}) => {
  const [selectedAnalyticsDept, setSelectedAnalyticsDept] = useState<AdminDepartmentRow | null>(null);

  // CSV rather than PDF: the project carries no PDF renderer, and a spreadsheet
  // is the more useful artefact for budget figures anyway.
  const handleExportSummary = () => {
    downloadCsv(datedFilename("departmental-spend"), departments, [
      { header: "Department", value: (d) => d.name },
      { header: "Allocated", value: (d) => (d.hasBudget ? d.totalBudget : "Not set") },
      { header: "Utilised", value: (d) => d.utilised },
      { header: "Pending", value: (d) => d.pending },
      { header: "Remaining", value: (d) => (d.hasBudget ? d.remaining : "") },
      { header: "Utilisation %", value: (d) => d.pctUsed },
      { header: "Users", value: (d) => d.usersCount },
      { header: "Over-budget Requests", value: (d) => d.overBudgetCount },
    ]);
  };
  const [page, setPage] = useState(1);
  // Controls behind the two icon buttons above the table. Both rendered as bare
  // icons with no handler, so the "filter" and "sort" affordances the design
  // shows did nothing at all.
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "AT_RISK">("ALL");
  const [sortBy, setSortBy] = useState<"NAME" | "UTILISATION">("NAME");

  /** A department is at risk once it has committed most of its allocation. */
  const AT_RISK_PCT = 85;

  const deptList = departments
    .filter((d) => {
      if (statusFilter === "ACTIVE") return d.isActive !== false;
      if (statusFilter === "AT_RISK") return d.hasBudget && d.pctUsed >= AT_RISK_PCT;
      return true;
    })
    .sort((a, b) =>
      sortBy === "UTILISATION" ? b.pctUsed - a.pctUsed : a.name.localeCompare(b.name)
    );

  /**
   * Enterprise roll-up for the two tiles at the top. These were the design's
   * sample figures (₦500,000,000 / ₦34,642,300) hardcoded into the markup.
   */
  const enterpriseTotals = departments.reduce(
    (acc, d) => ({
      allocated: acc.allocated + (d.totalBudget || 0),
      utilised: acc.utilised + (d.utilised || 0),
      pending: acc.pending + (d.pending || 0),
    }),
    { allocated: 0, utilised: 0, pending: 0 }
  );

  // The other two tiles kept the design's sample figures (14 / 6) hardcoded, so
  // deleting a department left "Active Depts." unchanged.
  const activeDeptCount = departments.filter((d) => d.isActive !== false).length;
  const pendingRequestCount = expenses.filter((e) => OPEN_STATUSES.includes(e.status)).length;

  /**
   * Utilisation against allocation, department by department, as the substitute
   * for the "Budget Trends by Quarter" chart: nothing in the data model records
   * a quarterly series, and the previous chart drew four fixed bars (40/75/68/95)
   * that were the same for every organisation.
   */
  const utilisationBars = [...departments]
    .filter((d) => d.hasBudget)
    .sort((a, b) => b.pctUsed - a.pctUsed)
    .slice(0, 6);

  /**
   * Share of the enterprise allocation actually committed. Replaces the fixed
   * "8.4" score, which was not computed from anything.
   */
  const utilisationPct =
    enterpriseTotals.allocated > 0
      ? Math.round(((enterpriseTotals.utilised + enterpriseTotals.pending) / enterpriseTotals.allocated) * 100)
      : 0;

  // Clamp the page so a shrinking department list never strands an empty page.
  const safePage = Math.min(page, Math.max(1, Math.ceil(deptList.length / ROWS_PER_PAGE)));
  const visibleDepts = deptList.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  /**
   * Everything the analytics drill-down shows, derived from the department's own
   * requests. Every panel on that screen used to be hardcoded: a fixed 85%
   * "efficiency score", ₦4.2M of ₦5.0M utilised, three invented budget items and
   * four invented high-value requests with invented requesters.
   */
  const analytics = (() => {
    const dept = selectedAnalyticsDept;
    if (!dept) return null;

    const deptExpenses = expenses.filter((e) => String(e.departmentId?._id ?? "") === dept.id);
    const spent = deptExpenses.filter((e) => ["PAID", "CLOSED"].includes(e.status));

    // Six-month actual spend, newest bucket last.
    const now = new Date();
    const months: { label: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(), amount: 0 });
    }
    spent.forEach((e) => {
      const d = new Date(e.paymentDate || e.updatedAt || e.createdAt);
      const offset = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (offset >= 0 && offset <= 5) months[5 - offset].amount += e.amount || 0;
    });

    // Spend per category. The summary endpoint returns departmental totals but
    // not per-line allocations, so the bars are sized against the largest
    // category rather than against an allocation this screen cannot see.
    const byCategory = new Map<string, number>();
    spent.forEach((e) => {
      const key = e.category || "Uncategorised";
      byCategory.set(key, (byCategory.get(key) || 0) + (e.amount || 0));
    });
    const ranked = Array.from(byCategory.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    const topCategoryAmount = ranked[0]?.amount ?? 0;
    const budgetItems = ranked.map((item) => ({
      ...item,
      // Share of the department's own committed spend.
      pct: dept.utilised > 0 ? Math.round((item.amount / dept.utilised) * 100) : 0,
      barPct: topCategoryAmount > 0 ? Math.round((item.amount / topCategoryAmount) * 100) : 0,
    }));

    const highValue = [...deptExpenses].sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 4);

    return {
      months,
      maxMonth: Math.max(...months.map((m) => m.amount), 1),
      budgetItems,
      highValue,
      remaining: dept.remaining,
    };
  })();

  // If Analytics Detail view is selected
  if (selectedAnalyticsDept) {
    return (
      <div>
        {/* Back Button */}
        <button
          onClick={() => setSelectedAnalyticsDept(null)}
          style={{
            background: "none",
            border: "none",
            color: "#3b82f6",
            fontSize: "0.85rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            cursor: "pointer",
            marginBottom: "1rem"
          }}
        >
          <Icons.ChevronLeft size={16} /> Back
        </button>

        {/* Analytics Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
              Departmental Analytics ({selectedAnalyticsDept.name})
            </h1>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div className="glass-panel" style={{ padding: "0.5rem 0.85rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>
              <Icons.Calendar size={14} /> Last 30 Days
            </div>
            <button
              onClick={handleExportSummary}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                cursor: "pointer"
              }}
            >
              <Icons.Download size={15} /> Export CSV
            </button>
          </div>
        </div>

        {/* Top Split Section */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          {/* Left Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Utilisation gauge — the department's real percentage. This was a
                fixed "85% efficiency score" with no backing calculation. */}
            <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
                BUDGET UTILISATION
              </div>
              <div style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: `conic-gradient(${selectedAnalyticsDept.pctUsed > 90 ? "#DC2626" : "#2563EB"} ${Math.min(100, selectedAnalyticsDept.pctUsed) * 3.6}deg, rgb(var(--color-card-border) / 0.5) 0deg)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 0.5rem auto",
              }}>
                <div style={{
                  width: "92px",
                  height: "92px",
                  borderRadius: "50%",
                  backgroundColor: "rgb(var(--color-card))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.6rem",
                  fontWeight: "800",
                  color: "rgb(var(--color-text))",
                }}>
                  {selectedAnalyticsDept.hasBudget ? `${selectedAnalyticsDept.pctUsed}%` : "—"}
                </div>
              </div>
            </div>

            {/* Budget Utilized Card — the department's own allocation and spend. */}
            <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                BUDGET UTILIZED
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "rgb(var(--color-text))" }}>
                {formatNaira(selectedAnalyticsDept.utilised)}{" "}
                <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-dim))", fontWeight: "500" }}>
                  / {selectedAnalyticsDept.hasBudget ? formatNaira(selectedAnalyticsDept.totalBudget) : "no budget set"}
                </span>
              </div>
              <div style={{ width: "100%", height: "8px", backgroundColor: "rgb(var(--color-card-border) / 0.5)", borderRadius: "4px", margin: "0.85rem 0" }}>
                <div style={{ width: `${Math.min(100, selectedAnalyticsDept.pctUsed)}%`, height: "100%", backgroundColor: "#2563EB", borderRadius: "4px" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                <span>{selectedAnalyticsDept.pctUsed}% of allocation</span>
                {selectedAnalyticsDept.hasBudget && (
                  <span style={{ color: selectedAnalyticsDept.remaining < 0 ? "#DC2626" : "#2563EB", fontWeight: "600" }}>
                    {formatNaira(selectedAnalyticsDept.remaining)} left
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Spend Trends Over Time Chart */}
          <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>Spend Trends Over Time</h3>
                <p style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-muted))", marginTop: "0.15rem" }}>Monthly comparison of actual vs projected spend</p>
              </div>
            </div>

            {/* Six months of actual spend for this department. The bars used to
                be twelve hardcoded percentages labelled "actual vs projected". */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: "200px", gap: "0.75rem" }}>
              {analytics!.months.map((month) => (
                <div key={month.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", height: "100%" }}>
                  <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                    <div
                      title={formatNaira(month.amount)}
                      style={{
                        width: "50%",
                        minHeight: month.amount > 0 ? "4px" : "0",
                        height: `${(month.amount / analytics!.maxMonth) * 100}%`,
                        backgroundColor: "#2563EB",
                        borderRadius: "4px 4px 0 0",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", fontWeight: "600" }}>{month.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Split Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {/* Spend per category against the department's own budget lines. This
              listed three fixed items (SaaS / Hardware / Consulting) with fixed
              amounts and invented month-on-month deltas. */}
          <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "rgb(var(--color-text))", marginBottom: "1.25rem" }}>
              Budget Item
            </h3>

            {analytics!.budgetItems.length === 0 ? (
              <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem", margin: 0 }}>
                No spend recorded for this department.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {analytics!.budgetItems.map((item) => (
                  <div key={item.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.85rem", gap: "0.75rem" }}>
                      <span style={{ fontWeight: "700", color: "rgb(var(--color-text))" }}>{item.name}</span>
                      <span style={{ fontWeight: "700", color: "rgb(var(--color-text))" }}>{formatNaira(item.amount)}</span>
                    </div>
                    <div style={{ width: "100%", height: "6px", backgroundColor: "rgb(var(--color-card-border) / 0.5)", borderRadius: "3px", marginBottom: "0.35rem" }}>
                      <div style={{ width: `${item.barPct}%`, height: "100%", backgroundColor: "#2563EB", borderRadius: "3px" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <span style={{ color: "rgb(var(--color-text-muted))" }}>
                        {item.pct}% of departmental spend
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* The department's own largest requests. These were four invented
              requests attributed to invented requesters. */}
          <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "rgb(var(--color-text))", marginBottom: "1.25rem" }}>
              Highest-Value Requests
            </h3>

            {analytics!.highValue.length === 0 ? (
              <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem", margin: 0 }}>
                No requests raised in this department yet.
              </p>
            ) : (
              <table className="data-table" style={{ width: "100%" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgb(var(--color-card-border) / 0.5)" }}>
                    <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>REQUEST DETAILS</th>
                    <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>STATUS</th>
                    <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", textAlign: "right" }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics!.highValue.map((request) => (
                    <tr key={request._id} style={{ borderBottom: "1px solid rgb(var(--color-card-border) / 0.3)" }}>
                      <td style={{ padding: "0.85rem 0" }}>
                        <div style={{ fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}>{request.description}</div>
                        <div style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                          Requested by: {request.initiatorId?.name || "—"}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${statusBadgeClass(request.status)}`} style={{ fontSize: "0.7rem" }}>
                          {humanizeStatus(request.status)}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}>
                        {formatNaira(request.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>Departmental Spend</h1>
          <p style={{ fontSize: "0.9rem", color: "rgb(var(--color-text-muted))", marginTop: "0.25rem" }}>
            View and manage Departmental budget spend
          </p>
        </div>
        <button
          onClick={onOpenCreateDept}
          style={{
            padding: "0.65rem 1.25rem",
            borderRadius: "0.5rem",
            border: "none",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            fontWeight: "600",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)"
          }}
        >
          <Icons.Plus size={18} /> New Department
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        {/* Total Budget */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.Landmark size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase" }}>TOTAL FY2026 BUDGET</div>
              <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>{formatNaira(enterpriseTotals.allocated)}</div>
            </div>
          </div>
        </div>

        {/* Current Utilizations */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(99, 102, 241, 0.15)", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.BarChart2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase" }}>CURRENT UTILIZATIONS</div>
              <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>{formatNaira(enterpriseTotals.utilised)}</div>
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase" }}>PENDING REQUESTS</div>
              <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>{pendingRequestCount}</div>
            </div>
          </div>
        </div>

        {/* Active Depts */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.Building2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase" }}>ACTIVE DEPTS.</div>
              <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>{activeDeptCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Department Overview Table Card */}
      <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>Department Overview</h3>
          {/* The design's two icon affordances, now backed by the filter and
              sort the table actually applies. */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "rgb(var(--color-text-muted))" }}>
              <Icons.SlidersHorizontal size={14} />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
                aria-label="Filter departments"
                className="form-select"
                style={{ width: "auto", padding: "0.3rem 0.5rem", fontSize: "0.78rem" }}
              >
                <option value="ALL">All departments</option>
                <option value="ACTIVE">Active only</option>
                <option value="AT_RISK">At risk ({AT_RISK_PCT}%+ used)</option>
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "rgb(var(--color-text-muted))" }}>
              <Icons.ListFilter size={14} />
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setPage(1); }}
                aria-label="Sort departments"
                className="form-select"
                style={{ width: "auto", padding: "0.3rem 0.5rem", fontSize: "0.78rem" }}
              >
                <option value="NAME">Sort: Name</option>
                <option value="UTILISATION">Sort: Utilisation</option>
              </select>
            </label>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgb(var(--color-card-border) / 0.5)" }}>
                <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>DEPARTMENT</th>
                <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>BUDGET (FY2026)</th>
                <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>UTILIZED</th>
                <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>REMAINING</th>
                <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>% USED</th>
                <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}># USERS</th>
                <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>STATUS</th>
                <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {visibleDepts.map((d, idx) => {
                const pct = d.pctUsed;
                const isHighPct = pct > 80;
                return (
                  <tr key={d.id || idx} style={{ borderBottom: "1px solid rgb(var(--color-card-border) / 0.5)" }}>
                    <td style={{ padding: "1.1rem 0", fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.9rem" }}>
                      {d.name}
                    </td>
                    {/* An unbudgeted department reads "Not set" rather than
                        borrowing a fabricated ₦250,000 allocation. */}
                    <td style={{ color: "rgb(var(--color-text))", fontWeight: "600", fontSize: "0.85rem" }}>
                      {d.hasBudget ? formatNaira(d.totalBudget) : <span style={{ color: "rgb(var(--color-text-dim))" }}>Not set</span>}
                    </td>
                    <td style={{ color: "rgb(var(--color-text))", fontWeight: "600", fontSize: "0.85rem" }}>
                      {formatNaira(d.utilised)}
                    </td>
                    <td style={{ color: "rgb(var(--color-text))", fontWeight: "600", fontSize: "0.85rem" }}>
                      {d.hasBudget ? formatNaira(d.remaining) : <span style={{ color: "rgb(var(--color-text-dim))" }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", width: "100px" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: "700", color: isHighPct ? "#EF4444" : "#2563EB" }}>
                          {pct}%
                        </span>
                        <div style={{ width: "100%", height: "5px", backgroundColor: "rgb(var(--color-card-border) / 0.6)", borderRadius: "2px" }}>
                          <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", backgroundColor: isHighPct ? "#EF4444" : "#2563EB", borderRadius: "2px" }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem" }}>
                      {d.usersCount}
                    </td>
                    {/* Three states, not two: a department deliberately made
                        inactive is not the same as one awaiting deletion, and
                        only the latter offers Restore. */}
                    <td>
                      <span
                        className={`badge ${pendingDeletion(d) ? "badge-rejected" : d.isActive === false ? "badge-draft" : "badge-paid"}`}
                        style={{ fontSize: "0.7rem" }}
                      >
                        {pendingDeletion(d) ? "PENDING DELETION" : d.isActive === false ? "INACTIVE" : "ACTIVE"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                        {/* Edit Button */}
                        <button
                          onClick={() => onOpenEditDept(d)}
                          title="Edit Department"
                          style={{ background: "none", border: "none", color: "rgb(var(--color-primary))", cursor: "pointer", padding: "0.25rem" }}
                        >
                          <Icons.Edit2 size={16} />
                        </button>
                        {/* Analytics Detail Drilldown */}
                        <button
                          onClick={() => setSelectedAnalyticsDept(d)}
                          title="View Department Analytics"
                          style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer", padding: "0.25rem" }}
                        >
                          <Icons.TrendingUp size={16} />
                        </button>
                        {/* Delete / Restore. The design pairs a Pending Deletion
                            row with a red "Restore" link rather than an icon, so
                            the way back is unmissable. */}
                        {pendingDeletion(d) ? (
                          <button
                            onClick={() => onRestoreDept(d)}
                            aria-label={`Restore ${d.name}`}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              padding: "0.25rem",
                              fontWeight: "700",
                              fontSize: "0.82rem"
                            }}
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenDeleteDept(d)}
                            title="Delete Department"
                            aria-label={`Delete ${d.name}`}
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.25rem" }}
                          >
                            <Icons.Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <Pagination
          page={safePage}
          rowsPerPage={ROWS_PER_PAGE}
          totalCount={deptList.length}
          onPageChange={setPage}
          itemLabel="departments"
        />
      </div>

      {/* Bottom section: utilisation by department and the enterprise
          commitment rate. Both panels previously drew fixed values. */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem" }}>
        <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>Budget Utilisation by Department</h3>
              <p style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-muted))", marginTop: "0.15rem" }}>
                Committed spend against allocation
              </p>
            </div>
          </div>

          {utilisationBars.length === 0 ? (
            <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem", margin: 0 }}>
              No departmental budgets have been set.
            </p>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: "180px", gap: "0.75rem" }}>
              {utilisationBars.map((d) => (
                <div key={d.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", height: "100%" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: d.pctUsed > 90 ? "#DC2626" : "rgb(var(--color-text-muted))" }}>
                    {d.pctUsed}%
                  </span>
                  <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                    <div
                      title={`${formatNaira(d.utilised)} of ${formatNaira(d.totalBudget)}`}
                      style={{
                        width: "60%",
                        minHeight: "4px",
                        height: `${Math.min(100, d.pctUsed)}%`,
                        backgroundColor: d.pctUsed > 90 ? "#DC2626" : "#2563EB",
                        borderRadius: "4px 4px 0 0",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "rgb(var(--color-text-muted))", fontWeight: "600", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                    {d.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: "#2563EB",
          borderRadius: "0.75rem",
          padding: "1.75rem",
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.4)"
        }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem" }}>Budget Committed</h3>
            <p style={{ fontSize: "0.82rem", color: "rgb(var(--color-card-border) / 1.00)", lineHeight: "1.4" }}>
              Utilised plus pending, across every departmental allocation.
            </p>
          </div>

          <div style={{
            width: "130px",
            height: "130px",
            borderRadius: "50%",
            background: `conic-gradient(#FFFFFF ${Math.min(100, utilisationPct) * 3.6}deg, rgb(var(--color-card-border) / 1.00) 0deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "1.5rem auto",
          }}>
            <div style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              backgroundColor: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.9rem",
              fontWeight: "800",
            }}>
              {utilisationPct}%
            </div>
          </div>

          <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-card-border) / 1.00)", textAlign: "center" }}>
            {formatNaira(enterpriseTotals.utilised + enterpriseTotals.pending)} of {formatNaira(enterpriseTotals.allocated)}
          </span>
        </div>
      </div>
    </div>
  );
};
