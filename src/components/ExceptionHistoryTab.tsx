import React, { useState } from "react";
import * as Icons from "lucide-react";
import { RequestJustificationModal } from "./RequestJustificationModal";

interface ExceptionHistoryTabProps {
  currentUser?: any;
  expenses?: any[];
  setSelectedExpense?: (expense: any) => void;
}

export const ExceptionHistoryTab: React.FC<ExceptionHistoryTabProps> = ({
  currentUser,
  expenses = [],
  setSelectedExpense
}) => {
  const [periodFilter, setPeriodFilter] = useState("FY 2026");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("Approved");
  const [searchQuery, setSearchQuery] = useState("");
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [justificationTarget, setJustificationTarget] = useState<any>(null);

  // Default initial mock exception records matching the exact screenshot design
  const initialExceptionRecords = [
    {
      id: "exc-0044",
      date: "2026-07-12",
      reqId: "#0044",
      dept: "IT",
      requestTitle: "Data Centre Cooling Upgrade",
      expansionAmt: 21000,
      financeHead: "Michael Chen",
      totalExpansionsDept: 35500,
      period: "FY 2026",
      status: "Approved",
      rawExpense: {
        _id: "exc-0044-raw",
        requestNumber: "REQ-0044",
        category: "IT Equipment",
        description: "Data Centre Cooling Upgrade - Emergency expansion authorized",
        amount: 21000,
        status: "APPROVED",
        vendorName: "Michael Chen IT Solutions",
        vendorBankDetails: { bankName: "Zenith Bank", accountNumber: "1092837465", accountName: "Michael Chen" },
        createdAt: "2026-07-12T10:00:00.000Z"
      }
    },
    {
      id: "exc-0032",
      date: "2026-06-28",
      reqId: "#0032",
      dept: "Ops",
      requestTitle: "Supply Chain Emergency Logistics",
      expansionAmt: 18500,
      financeHead: "Aisha Bello",
      totalExpansionsDept: 18500,
      period: "FY 2026",
      status: "Approved",
      rawExpense: {
        _id: "exc-0032-raw",
        requestNumber: "REQ-0032",
        category: "Operations",
        description: "Supply Chain Emergency Logistics - Unplanned freight surcharge",
        amount: 18500,
        status: "APPROVED",
        vendorName: "Aisha Logistics Ltd",
        vendorBankDetails: { bankName: "Access Bank", accountNumber: "0019283746", accountName: "Aisha Logistics" },
        createdAt: "2026-06-28T14:20:00.000Z"
      }
    },
    {
      id: "exc-0021",
      date: "2026-05-15",
      reqId: "#0021",
      dept: "IT",
      requestTitle: "Cybersecurity License True-up",
      expansionAmt: 14500,
      financeHead: "Michael Chen",
      totalExpansionsDept: 35500,
      period: "FY 2026",
      status: "Approved",
      rawExpense: {
        _id: "exc-0021-raw",
        requestNumber: "REQ-0021",
        category: "Software",
        description: "Cybersecurity License True-up - Additional enterprise seat licenses",
        amount: 14500,
        status: "APPROVED",
        vendorName: "CyberSec Global",
        vendorBankDetails: { bankName: "First Bank", accountNumber: "3029182736", accountName: "CyberSec Global" },
        createdAt: "2026-05-15T09:15:00.000Z"
      }
    },
    {
      id: "exc-0018",
      date: "2026-04-03",
      reqId: "#0018",
      dept: "HR",
      requestTitle: "Annual Leadership Offsite Surplus",
      expansionAmt: 13000,
      financeHead: "Robert Sterling",
      totalExpansionsDept: 13000,
      period: "FY 2026",
      status: "Approved",
      rawExpense: {
        _id: "exc-0018-raw",
        requestNumber: "REQ-0018",
        category: "Human Resources",
        description: "Annual Leadership Offsite Surplus - Accommodation buffer override",
        amount: 13000,
        status: "APPROVED",
        vendorName: "Sterling Events Ltd",
        vendorBankDetails: { bankName: "GTBank", accountNumber: "0129384756", accountName: "Sterling Events" },
        createdAt: "2026-04-03T11:45:00.000Z"
      }
    }
  ];

  // Include dynamic exceptional budget expenses from database if available
  const dbExceptions = expenses
    .filter(e => e.exceptionalBudgetApproved || e.status === "PENDING_EXCEPTIONAL" || (e.history && e.history.some((h: any) => h.action?.includes("EXCEPTIONAL") || h.action?.includes("EXPANSION"))))
    .map(e => ({
      id: e._id,
      date: new Date(e.createdAt || Date.now()).toISOString().split("T")[0],
      reqId: `#${e.requestNumber?.replace(/^REQ-/, '') || e.requestNumber}`,
      dept: e.departmentId?.name || "IT",
      requestTitle: e.description || e.category,
      expansionAmt: e.amount || 0,
      financeHead: e.exceptionalApprovedBy?.name || currentUser?.name || "Finance Head",
      totalExpansionsDept: e.amount || 0,
      period: "FY 2026",
      status: e.status === "PENDING_EXCEPTIONAL" ? "Pending" : "Approved",
      rawExpense: e
    }));

  const allRecords = dbExceptions.length > 0 ? dbExceptions : initialExceptionRecords;

  // Filtering logic
  const filteredRecords = allRecords.filter(rec => {
    if (periodFilter !== "All Periods" && rec.period !== periodFilter) {
      // Allow FY 2026 matches
      if (periodFilter === "FY 2026" && !rec.date.startsWith("2026")) return false;
    }
    if (deptFilter !== "All Departments" && rec.dept !== deptFilter) {
      return false;
    }
    if (statusFilter !== "All Statuses" && rec.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchesReq = rec.reqId.toLowerCase().includes(q);
      const matchesDept = rec.dept.toLowerCase().includes(q);
      const matchesTitle = rec.requestTitle.toLowerCase().includes(q);
      const matchesHead = rec.financeHead.toLowerCase().includes(q);
      if (!matchesReq && !matchesDept && !matchesTitle && !matchesHead) return false;
    }
    return true;
  });

  // Calculate departmental totals dynamically for filtered view
  const deptTotalsMap: Record<string, number> = {};
  filteredRecords.forEach(rec => {
    deptTotalsMap[rec.dept] = (deptTotalsMap[rec.dept] || 0) + rec.expansionAmt;
  });

  // Total calculation for bottom blue card
  const totalExpansionSum = filteredRecords.reduce((sum, r) => sum + r.expansionAmt, 0);
  const approvedCount = filteredRecords.filter(r => r.status === "Approved").length;

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = ["DATE", "REQ ID", "DEPT", "REQUEST TITLE", "EXPANSION AMT", "FINANCE HEAD", "TOTAL EXPANSIONS (DEPT)"];
    const rows = filteredRecords.map(r => [
      r.date,
      r.reqId,
      r.dept,
      `"${r.requestTitle.replace(/"/g, '""')}"`,
      r.expansionAmt,
      `"${r.financeHead}"`,
      deptTotalsMap[r.dept] || r.totalExpansionsDept
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Exception_History_${periodFilter.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", width: "100%" }}>
      {/* Header section */}
      <div>
        <h1 style={{ fontSize: "1.85rem", fontWeight: "700", color: "rgb(var(--color-text))", letterSpacing: "-0.02em", margin: 0 }}>
          Exception History
        </h1>
        <p style={{ fontSize: "0.95rem", color: "rgb(var(--color-text-muted))", marginTop: "0.25rem" }}>
          All One-Time Budget Expansions Granted.
        </p>
      </div>

      {/* Filter bar card */}
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
        {/* Left filters group */}
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
              <option value="All Periods">All Periods</option>
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
              <option value="Ops">Ops</option>
              <option value="HR">HR</option>
              <option value="Engineering">Engineering</option>
              <option value="Marketing">Marketing</option>
              <option value="Technology">Technology</option>
              <option value="Legal">Legal</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "rgb(var(--color-text-muted))" }}>
              Status
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-select"
                style={{
                  width: "140px",
                  padding: "0.55rem 0.85rem 0.55rem 2.25rem",
                  fontSize: "0.85rem",
                  borderRadius: "8px",
                  background: "rgba(var(--color-surface-secondary), 0.5)",
                  border: "1px solid rgba(var(--color-card-border), 0.6)",
                  fontWeight: "600",
                  color: statusFilter === "Approved" ? "#2563EB" : "rgb(var(--color-text))"
                }}
              >
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="All Statuses">All Statuses</option>
              </select>
              <div
                style={{
                  position: "absolute",
                  left: "0.85rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: statusFilter === "Approved" ? "#2563EB" : "#EAB308",
                  pointerEvents: "none"
                }}
              />
            </div>
          </div>

          {/* Search box */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexGrow: 1, minWidth: "240px", maxWidth: "340px" }}>
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

        {/* Right side: Export CSV button */}
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
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <Icons.Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Main Exception History Data Table */}
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
                <th style={{ padding: "0.9rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase" }}>DATE</th>
                <th style={{ padding: "0.9rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase" }}>REQ ID</th>
                <th style={{ padding: "0.9rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase" }}>DEPT</th>
                <th style={{ padding: "0.9rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase" }}>REQUEST TITLE</th>
                <th style={{ padding: "0.9rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase" }}>EXPANSION AMT</th>
                <th style={{ padding: "0.9rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase" }}>FINANCE HEAD</th>
                <th style={{ padding: "0.9rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase" }}>TOTAL EXPANSIONS (DEPT)</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => {
                  const deptTotal = deptTotalsMap[rec.dept] || rec.totalExpansionsDept;
                  return (
                    <tr
                      key={rec.id}
                      style={{
                        borderBottom: "1px solid rgba(var(--color-card-border), 0.3)",
                        transition: "background 0.15s ease"
                      }}
                    >
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", color: "rgb(var(--color-text-muted))" }}>
                        {rec.date}
                      </td>
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem" }}>
                        <button
                          onClick={() => {
                            setJustificationTarget(rec);
                            setShowJustificationModal(true);
                            if (setSelectedExpense) setSelectedExpense(rec.rawExpense);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#2563EB",
                            fontWeight: "700",
                            cursor: "pointer",
                            padding: 0,
                            fontSize: "0.875rem",
                            textDecoration: "underline"
                          }}
                        >
                          {rec.reqId}
                        </button>
                      </td>
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.85rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.2rem 0.65rem",
                            borderRadius: "6px",
                            background: "rgba(148, 163, 184, 0.15)",
                            color: "rgb(var(--color-text))",
                            fontWeight: "600",
                            fontSize: "0.75rem"
                          }}
                        >
                          {rec.dept}
                        </span>
                      </td>
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", fontWeight: "600", color: "rgb(var(--color-text))" }}>
                        {rec.requestTitle}
                      </td>
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
                        ₦{rec.expansionAmt.toLocaleString()}
                      </td>
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", color: "rgb(var(--color-text-muted))" }}>
                        {rec.financeHead}
                      </td>
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
                        ₦{deptTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem 1rem", color: "rgb(var(--color-text-dim))", fontSize: "0.9rem" }}>
                    No exception expansion records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom dual cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem", marginTop: "0.5rem" }}>
        {/* Left Card: Vibrant Blue Total Expansions Summary */}
        <div
          style={{
            background: "linear-gradient(135deg, #0284C7 0%, #1D4ED8 100%)",
            borderRadius: "16px",
            padding: "1.75rem 2rem",
            color: "#FFFFFF",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 10px 25px -5px rgba(29, 78, 216, 0.4)",
            minHeight: "165px"
          }}
        >
          {/* Top Left Icon Container */}
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF"
            }}
          >
            <Icons.BarChart2 size={24} />
          </div>

          {/* Metric details */}
          <div style={{ marginTop: "1.5rem", zIndex: 2 }}>
            <span
              style={{
                fontSize: "0.725rem",
                fontWeight: "700",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(255, 255, 255, 0.9)",
                display: "block",
                marginBottom: "0.35rem"
              }}
            >
              TOTAL ONE-TIME EXPANSIONS GRANTED IN {periodFilter === "All Periods" ? "ALL PERIODS" : periodFilter}
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "2.35rem", fontWeight: "800", letterSpacing: "-0.03em", lineHeight: 1 }}>
                ₦{totalExpansionSum.toLocaleString()}
              </span>
              <span style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.85)", fontWeight: "500" }}>
                ({approvedCount} approved request{approvedCount !== 1 ? "s" : ""})
              </span>
            </div>
          </div>

          {/* Bottom Right Graphic Backdrop lines */}
          <div
            style={{
              position: "absolute",
              right: "-20px",
              bottom: "-20px",
              width: "160px",
              height: "160px",
              pointerEvents: "none",
              opacity: 0.18
            }}
          >
            <svg width="160" height="160" viewBox="0 0 160 160" fill="none">
              <rect x="20" y="20" width="120" height="120" rx="16" stroke="white" strokeWidth="6" />
              <rect x="50" y="50" width="90" height="90" rx="12" stroke="white" strokeWidth="4" />
              <rect x="80" y="80" width="60" height="60" rx="8" stroke="white" strokeWidth="3" />
            </svg>
          </div>
        </div>

        {/* Right Card: Soft Light Blue Audit Compliance Note */}
        <div
          style={{
            background: "rgba(239, 246, 255, 0.85)",
            border: "1px solid #BFDBFE",
            borderRadius: "16px",
            padding: "1.75rem 2rem",
            display: "flex",
            gap: "1.25rem",
            alignItems: "flex-start",
            color: "#1E3A8A",
            boxShadow: "var(--shadow-sm)",
            minHeight: "165px"
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(37, 99, 235, 0.12)",
              color: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: "0.1rem"
            }}
          >
            <Icons.Info size={22} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "#1E3A8A", margin: 0 }}>
              Audit Compliance Note
            </h4>
            <p style={{ fontSize: "0.875rem", lineHeight: "1.55", color: "#2563EB", margin: 0, fontWeight: "400" }}>
              "These expansions are request-specific and did NOT permanently increase departmental budgets. Each figure represents a non-recurring adjustment authorized for singular procurement events only."
            </p>
          </div>
        </div>
      </div>

      {/* Request Justification Modal */}
      <RequestJustificationModal
        isOpen={showJustificationModal}
        onClose={() => setShowJustificationModal(false)}
        requestNumber={justificationTarget?.reqId || "#0044"}
        requestTitle={justificationTarget?.requestTitle || "Cooling Unit Replacement"}
      />
    </div>
  );
};
