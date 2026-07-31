import React, { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { formatNaira, formatNairaCompact } from "../ui/format";
import { DepartmentDto, DepartmentSpendDto, PopulatedExpenseDto } from "../../types/api";
import { datedFilename, downloadCsv } from "../ui/exportCsv";

/** Period presets, expressed as a day window. 0 means "no cut-off". */
const PERIOD_OPTIONS: { label: string; days: number }[] = [
  { label: "Last 30 Days", days: 30 },
  { label: "This Quarter", days: 90 },
  { label: "Year to Date", days: 0 },
];

/** Statuses counted as spend for the reporting figures. */
const SPENT_STATUSES = ["PAID", "CLOSED"];

interface AdminEnterpriseReportingTabProps {
  /** Server-computed departmental budget summaries. */
  budgets: DepartmentSpendDto[];
  departments: DepartmentDto[];
  expenses?: PopulatedExpenseDto[];
  /** Org-wide roll-up from `/api/admin/stats`; null until it loads. */
  metrics?: { pendingRequestsCount?: number } | null;
}

export const AdminEnterpriseReportingTab: React.FC<AdminEnterpriseReportingTabProps> = ({
  budgets,
  departments,
  expenses = [],
  metrics
}) => {
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0].label);
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  /**
   * Every panel below reads this slice.
   *
   * The three controls in the filter bar used to set state that nothing read,
   * so the dashboard showed the same numbers whatever was selected.
   */
  const scopedExpenses = useMemo(() => {
    const days = PERIOD_OPTIONS.find(p => p.label === period)?.days ?? 0;
    const cutoff = days > 0 ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;

    return expenses.filter(e => {
      if (cutoff && new Date(e.createdAt).getTime() < cutoff) return false;
      if (selectedDept !== "ALL") {
        const deptId = String(e.departmentId?._id ?? "");
        if (deptId !== selectedDept) return false;
      }
      if (selectedCategory !== "ALL" && e.category !== selectedCategory) return false;
      return true;
    });
  }, [expenses, period, selectedDept, selectedCategory]);

  // Category options come from the data, so a newly used category appears here
  // without a code change. This was a fixed two-entry list.
  const categoryOptions = useMemo(
    () => Array.from(new Set(expenses.map(e => e.category).filter(Boolean))).sort(),
    [expenses]
  );

  // Status counters. `metrics` is the server's org-wide roll-up and is only
  // trusted while the view is unfiltered.
  const isUnfiltered = period === "Year to Date" && selectedDept === "ALL" && selectedCategory === "ALL";
  const countOf = (predicate: (e: any) => boolean) => scopedExpenses.filter(predicate).length;

  const pendingCount = isUnfiltered && metrics?.pendingRequestsCount != null
    ? metrics.pendingRequestsCount
    : countOf(e => String(e.status).startsWith("PENDING"));
  const approvedCount = countOf(e => e.status === "APPROVED");
  const rejectedCount = countOf(e => e.status === "REJECTED");
  const paidCount = countOf(e => SPENT_STATUSES.includes(e.status));
  const uploadedCount = countOf(e => e.status === "UPLOADED_TO_BANK");

  // Utilisation reads the server-computed budget summaries rather than assuming
  // a ₦250,000 allocation for any department without one — an unbudgeted
  // department now reports 0% instead of a percentage of an invented ceiling.
  const deptUtilization = budgets
    .filter(d => selectedDept === "ALL" || d.id === selectedDept)
    .map(d => ({
      name: d.name,
      spent: d.utilised,
      budget: d.totalBudget,
      pct: d.pctUsed,
      remaining: d.remaining,
      hasBudget: d.hasBudget,
    }));

  /**
   * Request status breakdown. The donut and its legend used to be four literal
   * numbers (34 / 29 / 12 / 8, "91 TOTAL") that never moved.
   */
  const statusSegments = [
    { label: "Approved", count: approvedCount, color: "#2563EB" },
    { label: "Paid", count: paidCount, color: "#93C5FD" },
    { label: "Pending", count: pendingCount, color: "#64748B" },
    { label: "Rejected", count: rejectedCount, color: "#EF4444" },
  ];
  const statusTotal = statusSegments.reduce((sum, seg) => sum + seg.count, 0);

  // Conic gradient stops, so the ring is proportional to the real counts.
  const donutGradient = (() => {
    if (statusTotal === 0) return "rgba(var(--color-card-border), 0.5)";
    let cursor = 0;
    const stops = statusSegments.map(seg => {
      const start = (cursor / statusTotal) * 360;
      cursor += seg.count;
      const end = (cursor / statusTotal) * 360;
      return `${seg.color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  })();

  /** Remaining balance per department — was four hardcoded rows. */
  const budgetBalance = budgets
    .filter(d => d.hasBudget)
    .sort((a, b) => a.remaining - b.remaining);

  /**
   * Exceptional approvals granted per month over the scoped window. The chart
   * rendered month labels with no bars at all.
   */
  const exceptionalByMonth = useMemo(() => {
    const buckets = new Map<string, { label: string; count: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.set(`${d.getFullYear()}-${d.getMonth()}`, {
        label: d.toLocaleDateString(undefined, { month: "short" }),
        count: 0,
      });
    }
    scopedExpenses.forEach(e => {
      if (!e.exceptionalBudgetApproved) return;
      const d = new Date(e.createdAt);
      const bucket = buckets.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) bucket.count += 1;
    });
    return Array.from(buckets.values());
  }, [scopedExpenses]);

  const maxExceptional = Math.max(...exceptionalByMonth.map(m => m.count), 1);
  // Flagged when any single month accounts for more than half the window.
  const highVariance =
    exceptionalByMonth.reduce((sum, m) => sum + m.count, 0) > 0 &&
    maxExceptional / exceptionalByMonth.reduce((sum, m) => sum + m.count, 0) > 0.5;

  /** Spend and volume by category — was four hardcoded rows. */
  const topBudgetItems = useMemo(() => {
    const totals = new Map<string, { name: string; amount: number; count: number }>();
    scopedExpenses.forEach(e => {
      if (!SPENT_STATUSES.includes(e.status)) return;
      const key = e.category || "Uncategorised";
      const entry = totals.get(key) ?? { name: key, amount: 0, count: 0 };
      entry.amount += e.amount || 0;
      entry.count += 1;
      totals.set(key, entry);
    });
    return Array.from(totals.values()).sort((a, b) => b.amount - a.amount).slice(0, 4);
  }, [scopedExpenses]);

  /** Highest-volume requesters — was four invented people with invented totals. */
  const topRequesters = useMemo(() => {
    const totals = new Map<string, { name: string; dept: string; amount: number; count: number }>();
    scopedExpenses.forEach(e => {
      const name = e.initiatorId?.name;
      if (!name) return;
      const entry = totals.get(name) ?? {
        name,
        dept: e.departmentId?.name || "Unassigned",
        amount: 0,
        count: 0,
      };
      entry.amount += e.amount || 0;
      entry.count += 1;
      totals.set(name, entry);
    });
    return Array.from(totals.values()).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [scopedExpenses]);

  // Departmental utilisation is the substance of this dashboard, so that is
  // what the export carries.
  const handleExportReport = () => {
    downloadCsv(datedFilename("enterprise-report"), deptUtilization, [
      { header: "Department", value: (d) => d.name },
      { header: "Allocated", value: (d) => (d.hasBudget ? d.budget : "Not set") },
      { header: "Spent", value: (d) => d.spent },
      { header: "Remaining", value: (d) => (d.hasBudget ? d.remaining : "") },
      { header: "Utilisation %", value: (d) => d.pct },
    ]);
  };

  return (
    <div>
      {/* Top Filter Bar */}
      <div className="glass-panel" style={{
        padding: "1rem 1.5rem",
        backgroundColor: "rgb(var(--color-card))",
        borderRadius: "0.75rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.75rem"
      }}>
        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", fontWeight: "600", marginBottom: "0.25rem" }}>Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="form-select"
              style={{ padding: "0.45rem 0.85rem", fontSize: "0.85rem", width: "auto", minWidth: "170px" }}
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", fontWeight: "600", marginBottom: "0.25rem" }}>Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="form-select"
              style={{ padding: "0.45rem 0.85rem", fontSize: "0.85rem", width: "auto", minWidth: "170px" }}
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", fontWeight: "600", marginBottom: "0.25rem" }}>Budget Items</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-select"
              style={{ padding: "0.45rem 0.85rem", fontSize: "0.85rem", width: "auto", minWidth: "170px" }}
            >
              <option value="ALL">All Budget Items</option>
              {categoryOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleExportReport}
          style={{
            padding: "0.55rem 1.15rem",
            borderRadius: "0.375rem",
            border: "1px solid #2563eb",
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
          <Icons.Download size={15} /> Export
        </button>
      </div>

      {/* 5 Counter Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        {/* PENDING */}
        <div className="glass-panel" style={{ padding: "1.25rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.Clock size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase" }}>PENDING</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "rgb(var(--color-text))" }}>{pendingCount}</div>
          </div>
        </div>

        {/* APPROVED */}
        <div className="glass-panel" style={{ padding: "1.25rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.CheckCircle2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase" }}>APPROVED</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "rgb(var(--color-text))" }}>{approvedCount}</div>
          </div>
        </div>

        {/* REJECTED */}
        <div className="glass-panel" style={{ padding: "1.25rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.XCircle size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase" }}>REJECTED</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "rgb(var(--color-text))" }}>{rejectedCount}</div>
          </div>
        </div>

        {/* PAID */}
        <div className="glass-panel" style={{ padding: "1.25rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "rgba(99, 102, 241, 0.15)", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.Banknote size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase" }}>PAID</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "rgb(var(--color-text))" }}>{paidCount}</div>
          </div>
        </div>

        {/* UPLOADED */}
        <div className="glass-panel" style={{ padding: "1.25rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "rgba(139, 92, 246, 0.15)", color: "#a78bfa", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.Upload size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase" }}>UPLOADED</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "rgb(var(--color-text))" }}>{uploadedCount}</div>
          </div>
        </div>
      </div>

      {/* Middle Row Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Card 1: Budget Utilization */}
        <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>Budget Utilization</h3>
            <Icons.TrendingUp size={16} style={{ color: "rgb(var(--color-text-muted))" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {deptUtilization.map((d, idx) => (
              <div key={idx}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: "600", color: "rgb(var(--color-text))" }}>{d.name}</span>
                  <span style={{ color: "rgb(var(--color-text-muted))" }}>
                    {d.hasBudget
                      ? `${formatNaira(d.spent)} / ${formatNairaCompact(d.budget)} (${d.pct}%)`
                      : `${formatNaira(d.spent)} \u2022 no budget set`}
                  </span>
                </div>
                <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(var(--color-card-border), 0.5)", borderRadius: "3px" }}>
                  <div style={{ width: `${d.pct}%`, height: "100%", backgroundColor: d.pct > 90 ? "#ef4444" : "#2563eb", borderRadius: "3px" }} />
                </div>
              </div>
            ))}
            {deptUtilization.length === 0 && (
              <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem", margin: 0 }}>No department budget utilization recorded.</p>
            )}
          </div>
        </div>

        {/* Card 2: Request Status Breakdown */}
        <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "rgb(var(--color-text))", marginBottom: "1.25rem" }}>
            Request Status Breakdown
          </h3>

          {/* Donut and legend are proportional to the real counts. Both used to
              be literal numbers (91 total; 34/29/12/8) that never changed. */}
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: donutGradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem auto",
            }}
          >
            <div
              style={{
                width: "84px",
                height: "84px",
                borderRadius: "50%",
                background: "rgb(var(--color-card))",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "rgb(var(--color-text))" }}>{statusTotal}</div>
              <div style={{ fontSize: "0.65rem", color: "rgb(var(--color-text-muted))", textTransform: "uppercase", fontWeight: "600" }}>TOTAL</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.78rem" }}>
            {statusSegments.map((seg) => (
              <span key={seg.label} style={{ color: "rgb(var(--color-text-muted))", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: seg.color }} /> {seg.label} ({seg.count})
              </span>
            ))}
          </div>
        </div>

        {/* Card 3: Budget Balance */}
        <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "rgb(var(--color-text))", marginBottom: "1.25rem" }}>
            Budget Balance
          </h3>

          {/* Remaining balance per department, straight off the budget
              summaries. These were four hardcoded rows and amounts. */}
          {budgetBalance.length === 0 ? (
            <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem", margin: 0 }}>
              No departmental budgets have been set.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(var(--color-card-border), 0.5)", textTransform: "uppercase" }}>
                  <th style={{ textAlign: "left", paddingBottom: "0.5rem", fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>DEPT</th>
                  <th style={{ textAlign: "right", paddingBottom: "0.5rem", fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>REMAINING (₦)</th>
                </tr>
              </thead>
              <tbody>
                {budgetBalance.map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid rgba(var(--color-card-border), 0.3)" }}>
                    <td style={{ padding: "0.75rem 0", color: "rgb(var(--color-text))", fontWeight: "600" }}>{d.name}</td>
                    <td style={{ textAlign: "right", fontWeight: "700", color: d.remaining <= 0 ? "#EF4444" : "rgb(var(--color-text))" }}>
                      {formatNaira(d.remaining)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Lower Middle Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Exceptional Approvals Granted — real monthly volume. The chart used
            to render six month labels and no bars whatsoever. */}
        <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>Exceptional Approvals Granted</h3>
              <p style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-muted))", marginTop: "0.15rem" }}>Volume of out-of-policy requests approved by month</p>
            </div>
            {/* Only shown when the data actually is skewed. */}
            {highVariance && (
              <span style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#EF4444", borderRadius: "0.375rem", padding: "0.3rem 0.6rem", fontSize: "0.7rem", fontWeight: "700" }}>
                High Variance Detected
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: "160px", gap: "0.75rem" }}>
            {exceptionalByMonth.map((month) => (
              <div key={month.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", height: "100%" }}>
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  <div
                    title={`${month.count} exceptional approval(s)`}
                    style={{
                      width: "60%",
                      minHeight: month.count > 0 ? "4px" : "0",
                      height: `${(month.count / maxExceptional) * 100}%`,
                      background: "#2563EB",
                      borderRadius: "4px 4px 0 0",
                    }}
                  />
                </div>
                <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", fontWeight: "600" }}>{month.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Budget Item — spend by category. Was four fixed rows. */}
        <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "rgb(var(--color-text))", marginBottom: "1.25rem" }}>
            Top Budget Item
          </h3>

          {topBudgetItems.length === 0 ? (
            <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem", margin: 0 }}>No spend recorded in this period.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {topBudgetItems.map((item) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                    <div style={{ width: "36px", height: "36px", flexShrink: 0, borderRadius: "0.5rem", backgroundColor: "rgba(37, 99, 235, 0.15)", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icons.Tag size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>{item.count} Requests</div>
                    </div>
                  </div>
                  <span style={{ fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.9rem", whiteSpace: "nowrap" }}>{formatNairaCompact(item.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Requesters (by Volume) — derived from the requests themselves. The
          four cards here named invented people with invented totals. */}
      <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "rgb(var(--color-text))", marginBottom: "1.25rem" }}>
          Top Requesters (by Volume)
        </h3>

        {topRequesters.length === 0 ? (
          <EmptyState
            icon={<Icons.Users size={20} />}
            title="No requests in this period"
            description="Adjust the period or department filter to see who is raising requests."
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
            {topRequesters.map((requester) => (
              <div
                key={requester.name}
                style={{
                  backgroundColor: "rgba(var(--color-surface-secondary), 0.5)",
                  border: "1px solid rgba(var(--color-card-border), 0.5)",
                  borderRadius: "0.5rem",
                  padding: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", minWidth: 0 }}>
                  <div style={{ width: "40px", height: "40px", flexShrink: 0, borderRadius: "50%", backgroundColor: "#2563EB", color: "#FFFFFF", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {requester.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{requester.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>{requester.dept}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: "800", color: "rgb(var(--color-text))", fontSize: "0.9rem" }}>{formatNaira(requester.amount)}</div>
                  <div style={{ fontSize: "0.72rem", color: "rgb(var(--color-text-muted))" }}>{requester.count} Requests</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
