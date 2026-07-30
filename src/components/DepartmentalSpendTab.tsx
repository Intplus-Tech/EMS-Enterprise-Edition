import React, { useState } from "react";
import * as Icons from "lucide-react";

interface DepartmentalSpendTabProps {
  currentUser?: any;
  expenses?: any[];
  setSelectedExpense?: (expense: any) => void;
}

export const DepartmentalSpendTab: React.FC<DepartmentalSpendTabProps> = ({
  currentUser,
  expenses = [],
  setSelectedExpense
}) => {
  const [periodFilter, setPeriodFilter] = useState("FY 2026");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [searchQuery, setSearchQuery] = useState("");
  const [isReloading, setIsReloading] = useState(false);

  // Dynamic departmental spend calculation from DB expenses
  const liveDeptMap: Record<string, { totalBudget: number; utilized: number; topRequester: string; overBudgetCount: number; requesters: Record<string, number> }> = {};
  
  if (expenses && expenses.length > 0) {
    expenses.forEach(e => {
      const deptName = (e.departmentId as any)?.name || e.departmentName || "IT";
      if (!liveDeptMap[deptName]) {
        liveDeptMap[deptName] = { totalBudget: 250000, utilized: 0, topRequester: "N/A", overBudgetCount: 0, requesters: {} };
      }
      if (e.status === "PAID" || e.status === "CLOSED" || e.status === "APPROVED") {
        liveDeptMap[deptName].utilized += e.amount;
      }
      if (e.status === "INSUFFICIENT_BUDGET" || e.status === "PENDING_EXCEPTIONAL" || e.exceptionalBudgetApproved) {
        liveDeptMap[deptName].overBudgetCount++;
      }
      const reqName = (e.initiatorId as any)?.name || "Team Member";
      liveDeptMap[deptName].requesters[reqName] = (liveDeptMap[deptName].requesters[reqName] || 0) + e.amount;
    });

    Object.keys(liveDeptMap).forEach(d => {
      const sorted = Object.entries(liveDeptMap[d].requesters).sort((a, b) => b[1] - a[1]);
      if (sorted[0]) liveDeptMap[d].topRequester = sorted[0][0];
    });
  }

  const liveDeptSpendList = Object.keys(liveDeptMap).map((dName, idx) => {
    const item = liveDeptMap[dName];
    const remaining = Math.max(0, item.totalBudget - item.utilized);
    const percentUsed = Math.min(100, Math.round((item.utilized / item.totalBudget) * 100));
    const colors = ["#2563EB", "#475569", "#DC2626", "rgb(var(--color-card-border))", "#94A3B8"];
    const color = colors[idx % colors.length];
    return {
      id: `dept-${idx}`,
      dept: dName,
      dotColor: color,
      totalBudget: item.totalBudget,
      utilized: item.utilized,
      remaining,
      percentUsed,
      barColor: color,
      topRequester: item.topRequester,
      overBudgetCount: item.overBudgetCount
    };
  });

  const currentDeptSpendData = liveDeptSpendList;

  // Filtering logic
  const filteredDeptSpend = currentDeptSpendData.filter(row => {
    if (deptFilter !== "All Departments" && row.dept !== deptFilter) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchesDept = row.dept.toLowerCase().includes(q);
      const matchesRequester = row.topRequester.toLowerCase().includes(q);
      if (!matchesDept && !matchesRequester) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = ["DEPT", "TOTAL BUDGET", "UTILIZED", "REMAINING", "% USED", "TOP REQUESTER", "OVER-BUDGET COUNT"];
    const rows = filteredDeptSpend.map(r => [
      r.dept,
      r.totalBudget,
      r.utilized,
      r.remaining,
      `${r.percentUsed}%`,
      `"${r.topRequester}"`,
      r.overBudgetCount
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Departmental_Spend_${periodFilter.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReloadData = () => {
    setIsReloading(true);
    setTimeout(() => {
      setIsReloading(false);
    }, 600);
  };

  // Dynamic Monthly Trend Chart calculated from DB expenses
  const monthTotals: number[] = new Array(12).fill(0);
  const currentMonthIdx = new Date().getMonth();
  if (expenses && expenses.length > 0) {
    expenses.forEach(e => {
      if (e.createdAt && ["PAID", "CLOSED", "APPROVED"].includes(e.status)) {
        const m = new Date(e.createdAt).getMonth();
        monthTotals[m] += e.amount || 0;
      }
    });
  }
  const maxMonthSpend = Math.max(...monthTotals, 1);
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const monthsData = monthNames.map((name, idx) => {
    const val = monthTotals[idx];
    const heightPct = val > 0 ? Math.max(15, Math.round((val / maxMonthSpend) * 100)) : (idx <= currentMonthIdx ? 12 : 10);
    const isProjection = idx > currentMonthIdx;
    return {
      month: name,
      isProjection,
      height: `${heightPct}%`,
      color: idx === currentMonthIdx ? "#2563EB" : "#93C5FD",
      amount: val
    };
  });

  // Dynamic Key Approvers list calculated from DB expenses history
  const approverMap: Record<string, { name: string; dept: string; totalApproved: number }> = {};
  if (expenses && expenses.length > 0) {
    expenses.forEach(e => {
      if (e.history) {
        e.history.forEach((h: any) => {
          if (h.action === "APPROVE" || h.action === "APPROVED" || h.action?.includes("APPROV")) {
            const name = h.actorName || "Approver";
            const dept = (e.departmentId as any)?.name || e.departmentName || "Management";
            if (!approverMap[name]) approverMap[name] = { name, dept, totalApproved: 0 };
            approverMap[name].totalApproved += e.amount || 0;
          }
        });
      }
    });
  }
  const keyApproversList = Object.values(approverMap).map((app, idx) => {
    const initials = app.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    const colors = ["#2563EB", "#94A3B8", "#475569", "#3b82f6"];
    return {
      id: `app-${idx}`,
      initials,
      avatarBg: colors[idx % colors.length],
      avatarColor: "#FFFFFF",
      name: app.name,
      subtitle: app.dept,
      amount: `₦${app.totalApproved >= 1000 ? Math.round(app.totalApproved / 1000) + "k" : app.totalApproved}`,
      status: "Approved"
    };
  });
  const keyApprovers = keyApproversList;

  const totalEnterpriseBudget = currentDeptSpendData.reduce((sum, d) => sum + d.totalBudget, 0);
  const totalUtilized = currentDeptSpendData.reduce((sum, d) => sum + d.utilized, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", width: "100%" }}>
      {/* Title & Subtitle */}
      <div>
        <h1 style={{ fontSize: "1.85rem", fontWeight: "700", color: "rgb(var(--color-text))", letterSpacing: "-0.02em", margin: 0 }}>
          Departmental Spend Overview
        </h1>
        <p style={{ fontSize: "0.95rem", color: "rgb(var(--color-text-muted))", marginTop: "0.25rem" }}>
          Manage and process financial disbursement requests.
        </p>
      </div>

      {/* Top Metric Cards (2 Cards) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        {/* Card 1: Total Enterprise Budget */}
        <div
          className="glass-card"
          style={{
            background: "rgb(var(--color-card))",
            border: "1px solid rgba(var(--color-card-border), 0.5)",
            borderRadius: "16px",
            padding: "1.75rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "#2563EB" }}>
              Total Enterprise Budget
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(37, 99, 235, 0.12)",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Icons.PieChart size={20} />
            </div>
          </div>
          <div style={{ marginTop: "1.25rem" }}>
            <h2 style={{ fontSize: "2.35rem", fontWeight: "800", color: "rgb(var(--color-text))", letterSpacing: "-0.03em", margin: 0 }}>
              ₦{totalEnterpriseBudget.toLocaleString()}
            </h2>
          </div>
        </div>

        {/* Card 2: Total Utilized */}
        <div
          className="glass-card"
          style={{
            background: "rgb(var(--color-card))",
            border: "1px solid rgba(var(--color-card-border), 0.5)",
            borderRadius: "16px",
            padding: "1.75rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "#2563EB" }}>
              Total Utilized
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#EF4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Icons.TrendingDown size={20} />
            </div>
          </div>
          <div style={{ marginTop: "1.25rem" }}>
            <h2 style={{ fontSize: "2.35rem", fontWeight: "800", color: "rgb(var(--color-text))", letterSpacing: "-0.03em", margin: 0 }}>
              ₦{totalUtilized.toLocaleString()}
            </h2>
          </div>
        </div>
      </div>

      {/* Filter controls card */}
      <div
        className="glass-card"
        style={{
          background: "rgb(var(--color-card))",
          border: "1px solid rgba(var(--color-card-border), 0.5)",
          borderRadius: "12px",
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "1.25rem",
          flexWrap: "wrap",
          boxShadow: "var(--shadow-sm)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap", flexGrow: 1 }}>
          {/* Period Filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "rgb(var(--color-text-muted))" }}>
              Period
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="form-select"
              style={{
                width: "130px",
                padding: "0.55rem 0.85rem",
                fontSize: "0.85rem",
                borderRadius: "8px",
                background: "rgba(var(--color-surface-secondary), 0.5)",
                border: "1px solid rgba(var(--color-card-border), 0.6)",
                fontWeight: "500"
              }}
            >
              <option value="FY 2026">FY 2026</option>
              <option value="FY 2025">FY 2025</option>
              <option value="FY 2024">FY 2024</option>
            </select>
          </div>

          {/* Department Filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "rgb(var(--color-text-muted))" }}>
              Department
            </label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="form-select"
              style={{
                width: "180px",
                padding: "0.55rem 0.85rem",
                fontSize: "0.85rem",
                borderRadius: "8px",
                background: "rgba(var(--color-surface-secondary), 0.5)",
                border: "1px solid rgba(var(--color-card-border), 0.6)",
                fontWeight: "500"
              }}
            >
              <option value="All Departments">All Departments</option>
              <option value="IT">IT</option>
              <option value="Marketing">Marketing</option>
              <option value="Ops">Ops</option>
              <option value="Legal">Legal</option>
              <option value="HR">HR</option>
            </select>
          </div>

          {/* Search bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexGrow: 1, minWidth: "240px", maxWidth: "360px" }}>
            <div style={{ position: "relative", width: "100%" }}>
              <Icons.Search
                size={16}
                style={{
                  position: "absolute",
                  left: "0.85rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgb(var(--color-text-dim))"
                }}
              />
              <input
                type="text"
                placeholder="Search by Req ID, Dept or Title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{
                  paddingLeft: "2.4rem",
                  fontSize: "0.85rem",
                  paddingTop: "0.55rem",
                  paddingBottom: "0.55rem",
                  borderRadius: "8px",
                  background: "rgba(var(--color-surface-secondary), 0.5)",
                  border: "1px solid rgba(var(--color-card-border), 0.6)"
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Action: Export CSV */}
        <div>
          <button
            onClick={handleExportCSV}
            className="btn btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.55rem 1.15rem",
              fontSize: "0.85rem",
              fontWeight: "600",
              borderRadius: "8px",
              border: "1px solid rgba(var(--color-card-border), 0.8)",
              background: "rgba(var(--color-surface), 0.6)",
              color: "rgb(var(--color-text))",
              cursor: "pointer"
            }}
          >
            <Icons.Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Main Departmental Spend Data Table */}
      <div
        className="glass-panel"
        style={{
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid rgba(var(--color-card-border), 0.5)",
          background: "rgb(var(--color-card))",
          boxShadow: "var(--shadow-sm)"
        }}
      >
        <div className="table-container" style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(var(--color-surface-secondary), 0.5)", borderBottom: "1px solid rgba(var(--color-card-border), 0.6)" }}>
                <th style={{ padding: "0.9rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase" }}>DEPT</th>
                <th style={{ padding: "0.9rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase" }}>TOTAL BUDGET</th>
                <th style={{ padding: "0.9rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase" }}>UTILIZED</th>
                <th style={{ padding: "0.9rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase" }}>REMAINING</th>
                <th style={{ padding: "0.9rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase" }}>% USED</th>
                <th style={{ padding: "0.9rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase" }}>TOP REQUESTER</th>
                <th style={{ padding: "0.9rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase" }}>OVER-BUDGET COUNT</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeptSpend.length > 0 ? (
                filteredDeptSpend.map((row) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: "1px solid rgba(var(--color-card-border), 0.3)",
                      transition: "background 0.15s ease"
                    }}
                  >
                    {/* DEPT with dot indicator */}
                    <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: row.dotColor, display: "inline-block" }} />
                        {row.dept}
                      </div>
                    </td>

                    {/* TOTAL BUDGET */}
                    <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
                      ₦{row.totalBudget.toLocaleString()}
                    </td>

                    {/* UTILIZED */}
                    <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
                      ₦{row.utilized.toLocaleString()}
                    </td>

                    {/* REMAINING */}
                    <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
                      ₦{row.remaining.toLocaleString()}
                    </td>

                    {/* % USED with Progress Bar */}
                    <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.85rem", width: "180px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ flexGrow: 1, height: "6px", background: "rgba(var(--color-card-border), 0.3)", borderRadius: "999px", overflow: "hidden" }}>
                          <div style={{ width: `${row.percentUsed}%`, height: "100%", backgroundColor: row.barColor, borderRadius: "999px" }} />
                        </div>
                        <span style={{ fontSize: "0.75rem", fontWeight: "700", color: row.barColor, minWidth: "28px" }}>
                          {row.percentUsed}%
                        </span>
                      </div>
                    </td>

                    {/* TOP REQUESTER */}
                    <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", color: "rgb(var(--color-text-muted))" }}>
                      {row.topRequester}
                    </td>

                    {/* OVER-BUDGET COUNT badge */}
                    <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          backgroundColor: row.overBudgetCount > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(148, 163, 184, 0.15)",
                          color: row.overBudgetCount > 0 ? "#DC2626" : "rgb(var(--color-text-muted))"
                        }}
                      >
                        {row.overBudgetCount}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem 1rem", color: "rgb(var(--color-text-dim))", fontSize: "0.9rem" }}>
                    No department data matches the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer toolbar */}
        <div
          style={{
            padding: "1rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(var(--color-card-border), 0.4)",
            background: "rgba(var(--color-surface-secondary), 0.3)",
            fontSize: "0.85rem",
            color: "rgb(var(--color-text-muted))"
          }}
        >
          <span>Showing {filteredDeptSpend.length} of {currentDeptSpendData.length} department records</span>

          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <button
              onClick={handleReloadData}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "none",
                border: "none",
                color: "rgb(var(--color-text-muted))",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "500"
              }}
            >
              <Icons.RefreshCw size={15} className={isReloading ? "animate-spin" : ""} /> Reload Data
            </button>

            <button
              onClick={() => alert("All department records are currently loaded.")}
              className="btn btn-primary"
              style={{
                background: "#DBEAFE",
                color: "#1E40AF",
                padding: "0.45rem 1rem",
                fontSize: "0.85rem",
                borderRadius: "8px",
                fontWeight: "600",
                border: "none"
              }}
            >
              Load More
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Dual Panels Section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem", marginTop: "0.5rem" }}>
        {/* Panel 1: Key Approvers */}
        <div
          className="glass-panel"
          style={{
            borderRadius: "16px",
            padding: "1.75rem",
            background: "rgb(var(--color-card))",
            border: "1px solid rgba(var(--color-card-border), 0.5)",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem"
          }}
        >
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "rgb(var(--color-text))", margin: 0 }}>
            Key Approvers
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
            {keyApprovers.map((appr) => (
              <div key={appr.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      backgroundColor: appr.avatarBg,
                      color: appr.avatarColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                      fontSize: "0.95rem"
                    }}
                  >
                    {appr.initials}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <strong style={{ fontSize: "0.925rem", color: "rgb(var(--color-text))" }}>{appr.name}</strong>
                    <span style={{ fontSize: "0.775rem", color: "rgb(var(--color-text-dim))", marginTop: "0.1rem" }}>{appr.subtitle}</span>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ display: "block", fontWeight: "800", fontSize: "0.925rem", color: "rgb(var(--color-text))" }}>
                    {appr.amount}
                  </span>
                  <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#10B981" }}>
                    {appr.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: Monthly Spend Trend */}
        <div
          className="glass-panel"
          style={{
            borderRadius: "16px",
            padding: "1.75rem",
            background: "rgb(var(--color-card))",
            border: "1px solid rgba(var(--color-card-border), 0.5)",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "1.25rem"
          }}
        >
          {/* Header & Legend */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "rgb(var(--color-text))", margin: 0 }}>
                Monthly Spend Trend
              </h3>
              <p style={{ fontSize: "0.775rem", color: "rgb(var(--color-text-dim))", margin: "0.2rem 0 0" }}>
                Cumulative enterprise spend vs. budget ceiling
              </p>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.75rem", fontWeight: "600" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#1D4ED8" }} />
                <span style={{ color: "rgb(var(--color-text))" }}>Actual</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#94A3B8" }} />
                <span style={{ color: "rgb(var(--color-text-dim))" }}>Projection</span>
              </div>
            </div>
          </div>

          {/* Bar chart rendering */}
          <div style={{ height: "170px", display: "flex", alignItems: "flex-end", gap: "0.4rem", paddingTop: "1rem" }}>
            {monthsData.map((item, idx) => (
              <div key={idx} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                <div
                  style={{
                    width: "100%",
                    height: item.height,
                    backgroundColor: item.isProjection ? "transparent" : item.color,
                    border: item.isProjection ? "2px dashed #94A3B8" : "none",
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.3s ease"
                  }}
                />
                <span style={{ fontSize: "0.65rem", fontWeight: "600", color: "rgb(var(--color-text-dim))", marginTop: "0.5rem" }}>
                  {item.month}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
