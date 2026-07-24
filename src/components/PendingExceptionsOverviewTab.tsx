import React, { useState } from "react";
import * as Icons from "lucide-react";

interface PendingExceptionsOverviewTabProps {
  currentUser?: any;
  expenses?: any[];
  onReviewRequest?: (req: any) => void;
}

export const PendingExceptionsOverviewTab: React.FC<PendingExceptionsOverviewTabProps> = ({
  currentUser,
  expenses = [],
  onReviewRequest
}) => {
  const [sortFilter, setSortFilter] = useState("Deficit (Largest First)");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [searchQuery, setSearchQuery] = useState("");
  const [isReloading, setIsReloading] = useState(false);

  // Initial mockup records matching exact screenshot
  const initialPendingExceptions = [
    {
      id: "exc-0044",
      deficit: -21000,
      reqId: "#0044",
      title: "Emergency Data Centre Cooling Unit",
      subtitle: "Urgent Hardware Maintenance",
      dept: "IT",
      amount: 47200,
      budget: 26200,
      waitDays: 3,
      isHighWait: true
    },
    {
      id: "exc-0051",
      deficit: -12500,
      reqId: "#0051",
      title: "Cloud Infrastructure Expansion",
      subtitle: "Q3 Growth Scaling",
      dept: "Ops",
      amount: 32500,
      budget: 20000,
      waitDays: 1,
      isHighWait: false
    },
    {
      id: "exc-0048",
      deficit: -8200,
      reqId: "#0048",
      title: "Legal Retainer Renewal (Special Counsel)",
      subtitle: "Arbitration Services",
      dept: "Legal",
      amount: 17200,
      budget: 9000,
      waitDays: 5,
      isHighWait: true
    },
    {
      id: "exc-0055",
      deficit: -5400,
      reqId: "#0055",
      title: "Regional Office Logistics Subsidy",
      subtitle: "Transportation Adjustment",
      dept: "Ops",
      amount: 12400,
      budget: 7000,
      waitDays: 2,
      isHighWait: false
    },
    {
      id: "exc-0059",
      deficit: -2800,
      reqId: "#0059",
      title: "Premium Software License Renewal",
      subtitle: "Annual Compliance Tools",
      dept: "IT",
      amount: 15800,
      budget: 13000,
      waitDays: 1,
      isHighWait: false
    }
  ];

  const [records, setRecords] = useState(initialPendingExceptions);

  // Calculate dynamic KPIs
  const totalDeficitExposed = records.reduce((sum, r) => sum + Math.abs(r.deficit), 0);

  // Filter records
  const filteredRecords = records.filter(r => {
    if (deptFilter !== "All Departments" && r.dept !== deptFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.reqId.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.dept.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sort records
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (sortFilter === "Deficit (Largest First)") return Math.abs(b.deficit) - Math.abs(a.deficit);
    if (sortFilter === "Deficit (Smallest First)") return Math.abs(a.deficit) - Math.abs(b.deficit);
    if (sortFilter === "Oldest First") return b.waitDays - a.waitDays;
    if (sortFilter === "Newest First") return a.waitDays - b.waitDays;
    return 0;
  });

  const handleExportCSV = () => {
    const headers = ["DEFICIT", "REQ ID", "REQUEST TITLE", "SUBTITLE", "DEPT", "AMOUNT", "BUDGET", "WAIT DAYS"];
    const rows = sortedRecords.map(r => [
      r.deficit,
      r.reqId,
      `"${r.title}"`,
      `"${r.subtitle}"`,
      r.dept,
      r.amount,
      r.budget,
      `${r.waitDays} days`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pending_exceptional_approvals_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReload = () => {
    setIsReloading(true);
    setTimeout(() => setIsReloading(false), 600);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", width: "100%" }}>
      {/* Header Title Section */}
      <div>
        <h1 style={{ fontSize: "1.85rem", fontWeight: "800", color: "rgb(var(--color-text))", letterSpacing: "-0.025em", margin: 0 }}>
          Pending Exceptional Approvals
        </h1>
        <p style={{ fontSize: "0.925rem", color: "rgb(var(--color-text-muted))", marginTop: "0.25rem", margin: 0 }}>
          Manage and process financial disbursement requests.
        </p>
      </div>

      {/* Top Summary KPI Cards (2 Columns) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Card 1: Total Deficit Exposed */}
        <div
          className="glass-card"
          style={{
            background: "rgb(var(--color-card))",
            border: "1px solid rgba(var(--color-card-border), 0.5)",
            borderRadius: "16px",
            padding: "1.6rem 1.75rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "#1E3A8A" }}>
              Total Deficit Exposed
            </span>
            <span style={{ fontSize: "2rem", fontWeight: "800", color: "#2563EB", letterSpacing: "-0.02em" }}>
              ₦{totalDeficitExposed.toLocaleString()}
            </span>
          </div>

          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              color: "#DC2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Icons.TrendingDown size={24} />
          </div>
        </div>

        {/* Card 2: Avg. Release Time */}
        <div
          className="glass-card"
          style={{
            background: "rgb(var(--color-card))",
            border: "1px solid rgba(var(--color-card-border), 0.5)",
            borderRadius: "16px",
            padding: "1.6rem 1.75rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "#1E3A8A" }}>
              Avg. Release Time
            </span>
            <span style={{ fontSize: "2rem", fontWeight: "800", color: "#2563EB", letterSpacing: "-0.02em" }}>
              1.4 Days
            </span>
          </div>

          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "rgba(37, 99, 235, 0.1)",
              color: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Icons.FileText size={24} />
          </div>
        </div>
      </div>

      {/* Filter Bar Controls Box */}
      <div
        className="glass-panel"
        style={{
          background: "rgb(var(--color-card))",
          border: "1px solid rgba(var(--color-card-border), 0.5)",
          borderRadius: "14px",
          padding: "1.15rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
          boxShadow: "var(--shadow-sm)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap", flexGrow: 1 }}>
          {/* Sorted Dropdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "rgb(var(--color-text-muted))" }}>
              Sorted
            </label>
            <select
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value)}
              className="form-select"
              style={{
                minWidth: "170px",
                padding: "0.55rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid rgba(var(--color-card-border), 0.8)",
                background: "rgba(var(--color-surface), 0.6)",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "rgb(var(--color-text))"
              }}
            >
              <option value="Deficit (Largest First)">Deficit (Largest First)</option>
              <option value="Deficit (Smallest First)">Deficit (Smallest First)</option>
              <option value="Oldest First">Oldest First</option>
              <option value="Newest First">Newest First</option>
            </select>
          </div>

          {/* Department Dropdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "rgb(var(--color-text-muted))" }}>
              Department
            </label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="form-select"
              style={{
                minWidth: "170px",
                padding: "0.55rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid rgba(var(--color-card-border), 0.8)",
                background: "rgba(var(--color-surface), 0.6)",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "rgb(var(--color-text))"
              }}
            >
              <option value="All Departments">All Departments</option>
              <option value="IT">IT</option>
              <option value="Ops">Ops</option>
              <option value="Legal">Legal</option>
              <option value="Marketing">Marketing</option>
              <option value="HR">HR</option>
            </select>
          </div>

          {/* Search Input */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flexGrow: 1, maxWidth: "340px" }}>
            <div style={{ position: "relative" }}>
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Req ID, Dept or Title..."
                style={{
                  width: "100%",
                  padding: "0.55rem 0.85rem 0.55rem 2.35rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(var(--color-card-border), 0.8)",
                  background: "rgba(var(--color-surface), 0.6)",
                  fontSize: "0.85rem",
                  color: "rgb(var(--color-text))",
                  outline: "none"
                }}
              />
            </div>
          </div>
        </div>

        {/* Export CSV Button */}
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

      {/* Main Data Table Card */}
      <div
        className="glass-panel"
        style={{
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid rgba(var(--color-card-border), 0.5)",
          background: "rgb(var(--color-card))",
          boxShadow: "var(--shadow-sm)"
        }}
      >
        <div className="table-container" style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(239, 246, 255, 0.6)", borderBottom: "1px solid rgba(var(--color-card-border), 0.6)" }}>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase" }}>DEFICIT</th>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase" }}>REQ ID</th>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase" }}>REQUEST TITLE</th>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase" }}>DEPT</th>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase" }}>AMOUNT</th>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase" }}>BUDGET</th>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase" }}>WAIT</th>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase", textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.length > 0 ? (
                sortedRecords.map((r) => {
                  const isHighDeficit = Math.abs(r.deficit) >= 20000;
                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: "1px solid rgba(var(--color-card-border), 0.3)",
                        transition: "background 0.15s ease"
                      }}
                    >
                      {/* DEFICIT Badge */}
                      <td style={{ padding: "1.1rem 1.25rem" }}>
                        <span
                          style={{
                            padding: "0.3rem 0.65rem",
                            borderRadius: "999px",
                            background: isHighDeficit ? "#FEE2E2" : "#FFEDD5",
                            color: isHighDeficit ? "#DC2626" : "#EA580C",
                            fontWeight: "800",
                            fontSize: "0.8rem"
                          }}
                        >
                          -₦{Math.abs(r.deficit).toLocaleString()}
                        </span>
                      </td>

                      {/* REQ ID */}
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", fontWeight: "600", color: "rgb(var(--color-text-muted))" }}>
                        {r.reqId}
                      </td>

                      {/* REQUEST TITLE + Subtitle */}
                      <td style={{ padding: "1.1rem 1.25rem" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
                            {r.title}
                          </span>
                          <span style={{ fontSize: "0.775rem", color: "rgb(var(--color-text-dim))", marginTop: "2px" }}>
                            {r.subtitle}
                          </span>
                        </div>
                      </td>

                      {/* DEPT Pill Badge */}
                      <td style={{ padding: "1.1rem 1.25rem" }}>
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "8px",
                            background: "#DBEAFE",
                            color: "#1E40AF",
                            fontWeight: "700",
                            fontSize: "0.775rem"
                          }}
                        >
                          {r.dept}
                        </span>
                      </td>

                      {/* AMOUNT */}
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.9rem", fontWeight: "800", color: "rgb(var(--color-text))" }}>
                        ₦{r.amount.toLocaleString()}
                      </td>

                      {/* BUDGET */}
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", color: "rgb(var(--color-text-muted))" }}>
                        ₦{r.budget.toLocaleString()}
                      </td>

                      {/* WAIT */}
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", fontWeight: "700", color: r.isHighWait ? "#DC2626" : "rgb(var(--color-text-muted))" }}>
                        {r.waitDays} {r.waitDays === 1 ? "day" : "days"}
                      </td>

                      {/* ACTION Button */}
                      <td style={{ padding: "1.1rem 1.25rem", textAlign: "right" }}>
                        <button
                          onClick={() => onReviewRequest && onReviewRequest(r)}
                          className="btn btn-secondary"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            padding: "0.45rem 1rem",
                            fontSize: "0.825rem",
                            fontWeight: "700",
                            borderRadius: "8px",
                            border: "1px solid #BFDBFE",
                            background: "#EFF6FF",
                            color: "#2563EB",
                            cursor: "pointer"
                          }}
                        >
                          <Icons.FileText size={15} /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "rgb(var(--color-text-muted))" }}>
                    No pending exceptional approvals found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Toolbar */}
        <div
          style={{
            padding: "1rem 1.5rem",
            background: "rgba(var(--color-surface-secondary), 0.4)",
            borderTop: "1px solid rgba(var(--color-card-border), 0.4)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem"
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>
            Showing {sortedRecords.length} of {records.length} pending exceptions
          </span>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              onClick={handleReload}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "none",
                border: "none",
                color: "rgb(var(--color-text-muted))",
                fontSize: "0.85rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              <Icons.RefreshCw size={15} className={isReloading ? "spin" : ""} /> Reload Data
            </button>

            <button
              className="btn btn-secondary"
              style={{
                padding: "0.45rem 1rem",
                fontSize: "0.825rem",
                fontWeight: "600",
                borderRadius: "8px",
                border: "1px solid #DBEAFE",
                background: "#EFF6FF",
                color: "#2563EB",
                cursor: "pointer"
              }}
            >
              Load More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
