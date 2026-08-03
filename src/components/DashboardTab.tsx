import React, { useState } from "react";
import * as Icons from "lucide-react";
import { isOwnRequest } from "../domains/identity/reference";
import { StatCard } from "./ui/StatCard";
import { Pagination } from "./ui/Pagination";
import { EmptyState } from "./ui/EmptyState";
import { formatNaira, formatNairaCompact, formatDate } from "./ui/format";
import { datedFilename, downloadCsv } from "./ui/exportCsv";
import { PopulatedExpenseDto, SessionUserDto } from "../types/api";

/** Rows per page in the Top Expenditures table. */
const ROWS_PER_PAGE = 4;

/** Statuses that count as committed departmental spend. */
const SPENT_STATUSES = ["PAID", "CLOSED", "APPROVED"];

interface DashboardTabProps {
  currentUser: (SessionUserDto & { _id?: string; departmentName?: string | null }) | null;
  expenses: PopulatedExpenseDto[];
  chartViewMode: "daily" | "monthly";
  setChartViewMode: (mode: "daily" | "monthly") => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  currentUser,
  expenses,
  chartViewMode,
  setChartViewMode
}) => {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const isDeptMatch = (e: PopulatedExpenseDto) =>
    !currentUser?.departmentId ||
    e.departmentId?._id === currentUser.departmentId ||
    e.departmentId?.name === currentUser.departmentName;

  let deptSpentThisMonth = 0;
  let totalDeptRequests = 0;
  let myDraftCount = 0;
  let awaitingUpdateCount = 0;

  expenses.forEach((e) => {
    if (isDeptMatch(e)) {
      totalDeptRequests++;
      const expDate = new Date(e.createdAt);
      if (SPENT_STATUSES.includes(e.status) && expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
        deptSpentThisMonth += e.amount;
      }
    }
    if (isOwnRequest(e, currentUser)) {
      if (e.status === "DRAFT") myDraftCount++;
      if (e.status === "RETURNED") awaitingUpdateCount++;
    }
  });

  const spentExpenses = expenses.filter((e) => SPENT_STATUSES.includes(e.status));

  /**
   * Six months ending with the current one. The chart was fixed to April–
   * September of the current year while claiming to show "the last 6 months",
   * and hardcoded August as the highlighted bar.
   */
  const monthlyData = (() => {
    const buckets: { label: string; value: number; active: boolean }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      buckets.push({
        label: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
        value: 0,
        active: i === 0,
      });
    }
    spentExpenses.forEach((e) => {
      const d = new Date(e.createdAt);
      const offset = (currentYear - d.getFullYear()) * 12 + (currentMonth - d.getMonth());
      if (offset >= 0 && offset <= 5) buckets[5 - offset].value += e.amount || 0;
    });
    return buckets;
  })();

  /** Five-day buckets across the current month; the active one contains today. */
  const dailyData = (() => {
    const ranges = ["1-5", "6-10", "11-15", "16-20", "21-25", "26-31"];
    const today = now.getDate();
    const activeIndex = Math.min(5, Math.floor((today - 1) / 5));
    const buckets = ranges.map((label, idx) => ({ label, value: 0, active: idx === activeIndex }));
    spentExpenses.forEach((e) => {
      const d = new Date(e.createdAt);
      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return;
      buckets[Math.min(5, Math.floor((d.getDate() - 1) / 5))].value += e.amount || 0;
    });
    return buckets;
  })();

  const chartData = chartViewMode === "monthly" ? monthlyData : dailyData;
  // The y-axis scales to the data. It was fixed at 0–10M, so anything larger
  // clipped at full height and anything smaller rendered as a sliver.
  const chartMax = Math.max(...chartData.map((b) => b.value), 1);
  const axisTicks = [1, 0.8, 0.6, 0.4, 0.2, 0].map((f) => formatNairaCompact(chartMax * f));

  /**
   * Spend by the request's own category, rather than five fixed buckets fed by
   * keyword matching where everything unmatched fell into "Training".
   */
  const breakdownItems = (() => {
    const totals = new Map<string, number>();
    spentExpenses.forEach((e) => {
      const key = e.category || "Uncategorised";
      totals.set(key, (totals.get(key) || 0) + (e.amount || 0));
    });
    const ranked = Array.from(totals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const max = Math.max(...ranked.map((i) => i.value), 1);
    return ranked.map((item) => ({ ...item, pct: Math.round((item.value / max) * 100) }));
  })();

  const allExpenditures = spentExpenses
    .map((e) => ({
      description: e.description,
      requestNumber: e.requestNumber,
      category: e.category,
      vendorName: e.vendorName,
      createdAt: e.createdAt,
      amount: e.amount,
      status: e.status,
    }))
    .sort((a, b) => b.amount - a.amount);

  // The "Filter" button used to have no handler at all; it now narrows the
  // table by category, which is the only dimension the design offers.
  const categoryOptions = Array.from(new Set(allExpenditures.map((e) => e.category).filter(Boolean))).sort();
  const filteredExpenditures = categoryFilter === "ALL"
    ? allExpenditures
    : allExpenditures.filter((e) => e.category === categoryFilter);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredExpenditures.length / ROWS_PER_PAGE)));
  const displayedExpenditures = filteredExpenditures.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleExport = () => {
    downloadCsv(datedFilename("top-expenditures"), filteredExpenditures, [
      { header: "Project Name", value: (e) => e.description },
      { header: "Request ID", value: (e) => e.requestNumber },
      { header: "Category", value: (e) => e.category },
      { header: "Vendor", value: (e) => e.vendorName },
      { header: "Date", value: (e) => formatDate(e.createdAt) },
      { header: "Amount", value: (e) => e.amount },
      { header: "Status", value: (e) => e.status },
    ]);
  };

  return (
    <div>
      {/* Header / Top Metric Cards — the shared StatCard, not four hand-rolled
          copies of the same block (rule 2). */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
        <StatCard label="Department Spent" hint="this month" value={formatNaira(deptSpentThisMonth)} icon={<Icons.CreditCard size={18} />} />
        <StatCard label="Total Dept. Request" hint="across all statuses" value={totalDeptRequests} icon={<Icons.FileText size={18} />} />
        <StatCard label="My Draft" hint="not yet submitted" value={myDraftCount} icon={<Icons.FolderOpen size={18} />} tone="neutral" />
        <StatCard label="Awaiting Update" hint="returned for clarification" value={awaitingUpdateCount} icon={<Icons.AlertTriangle size={18} />} tone="danger" />
      </div>

      {/* Split Grid for Chart & Breakdown */}
      <div className="dashboard-grid">
        {/* Left Column: Spending Trends Chart */}
        <div className="glass-panel chart-card">
          <div className="chart-header">
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "bold" }}>Spending Trends</h3>
              <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.8rem", marginTop: "0.1rem" }}>Last 6 Months Data Visualization</p>
            </div>
            <div className="chart-toggle-group">
              <button 
                onClick={() => setChartViewMode("daily")}
                className={`chart-toggle-btn ${chartViewMode === "daily" ? "active" : ""}`}
              >
                Daily
              </button>
              <button 
                onClick={() => setChartViewMode("monthly")}
                className={`chart-toggle-btn ${chartViewMode === "monthly" ? "active" : ""}`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="chart-body">
            {/* Y axis, scaled to the data rather than a fixed 0–10M range */}
            <div className="chart-y-axis">
              {axisTicks.map((tick, idx) => (
                <span key={idx}>{tick}</span>
              ))}
            </div>

            <div className="chart-area">
              <div className="chart-gridlines">
                <div className="chart-gridline" />
                <div className="chart-gridline" />
                <div className="chart-gridline" />
                <div className="chart-gridline" />
                <div className="chart-gridline" />
                <div className="chart-gridline" style={{ borderBottomStyle: "solid" }} />
              </div>

              <div className="chart-bars">
                {chartData.map((bar, idx) => (
                  <div key={idx} className="chart-bar-container">
                    <div className="chart-bar-tooltip">{formatNaira(bar.value)}</div>
                    <div
                      className={`chart-bar-fill ${bar.active ? "active" : ""}`}
                      style={{ height: `${Math.round((bar.value / chartMax) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>

              <div className="chart-x-axis">
                {chartData.map((bar, idx) => (
                  <span key={idx} style={{ width: "40px", textAlign: "center" }}>{bar.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Spend Breakdown */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.25rem" }}>Spend Breakdown</h3>
          <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.8rem", marginBottom: "1.5rem" }}>Category-wise distribution of department expenses</p>
          <div className="breakdown-list">
            {breakdownItems.map((item, idx) => (
              <div key={idx} className="breakdown-item">
                <div className="breakdown-info">
                  <span style={{ color: "rgb(var(--color-text))" }}>{item.name}</span>
                  <span style={{ fontWeight: "bold" }}>{formatNairaCompact(item.value)}</span>
                </div>
                <div className="breakdown-progress-track">
                  <div 
                    className="breakdown-progress-bar"
                    style={{ width: `${item.pct}%`, backgroundColor: "#2563EB" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Expenditures */}
      <div className="glass-panel expenditures-table-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "bold" }}>Top Expenditures</h3>
            <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.8rem", marginTop: "0.1rem" }}>Highest value financial approvals processed in the department</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {/* Category filter replaces a "Filter" button that had no handler. */}
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              aria-label="Filter by category"
              className="form-select"
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", width: "auto", minWidth: "150px" }}
            >
              <option value="ALL">All Categories</option>
              {categoryOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button onClick={handleExport} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
              <Icons.Download size={14} style={{ marginRight: "0.25rem" }} /> Export CSV
            </button>
          </div>
        </div>

        {filteredExpenditures.length === 0 ? (
          <EmptyState
            icon={<Icons.BarChart2 size={20} />}
            title="No approved expenditure yet"
            description="Approved and paid requests appear here, ranked by value."
          />
        ) : (
          <>
            <div className="table-container" style={{ border: "none" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 0 }}>PROJECT / ITEM NAME</th>
                    <th>CATEGORY</th>
                    <th>VENDOR</th>
                    <th>DATE</th>
                    <th style={{ textAlign: "right" }}>AMOUNT</th>
                    <th style={{ textAlign: "right", paddingRight: 0 }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedExpenditures.map((exp, idx) => (
                    <tr key={`${exp.requestNumber}-${idx}`} style={{ background: "none" }}>
                      <td style={{ padding: "1rem 0", borderBottom: "1px solid rgb(var(--color-card-border) / 0.4)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <span style={{ fontWeight: "700", color: "rgb(var(--color-text))" }}>{exp.description}</span>
                          <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))", fontWeight: "bold" }}>ID: {exp.requestNumber}</span>
                        </div>
                      </td>
                      <td style={{ borderBottom: "1px solid rgb(var(--color-card-border) / 0.4)" }}>
                        <span className="badge badge-submitted">{exp.category}</span>
                      </td>
                      <td style={{ borderBottom: "1px solid rgb(var(--color-card-border) / 0.4)", color: "rgb(var(--color-text-muted))" }}>{exp.vendorName || "—"}</td>
                      <td style={{ borderBottom: "1px solid rgb(var(--color-card-border) / 0.4)", color: "rgb(var(--color-text-muted))" }}>
                        {formatDate(exp.createdAt)}
                      </td>
                      <td style={{ borderBottom: "1px solid rgb(var(--color-card-border) / 0.4)", textAlign: "right", fontWeight: "700" }}>
                        {formatNaira(exp.amount)}
                      </td>
                      <td style={{ borderBottom: "1px solid rgb(var(--color-card-border) / 0.4)", textAlign: "right", paddingRight: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.35rem" }}>
                          <span className={`dot-indicator ${["PAID", "APPROVED", "CLOSED"].includes(exp.status) ? "dot-approved" : "dot-pending"}`} />
                          <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                            {["PAID", "APPROVED", "CLOSED"].includes(exp.status) ? "Approved" : "Pending"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Real paging. The two arrow buttons here had no handlers and the
                table always showed the same first four rows. */}
            <Pagination
              page={safePage}
              rowsPerPage={ROWS_PER_PAGE}
              totalCount={filteredExpenditures.length}
              onPageChange={setPage}
              itemLabel="expenditures"
            />
          </>
        )}
      </div>
    </div>
  );
};
