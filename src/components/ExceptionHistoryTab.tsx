import React, { useState } from "react";
import * as Icons from "lucide-react";
import { RequestJustificationModal } from "./RequestJustificationModal";
import { formatNaira } from "./ui/format";
import { datedFilename, downloadCsv } from "./ui/exportCsv";
import { ThreadEntryDto } from "../types/api";

interface ExceptionHistoryTabProps {
  currentUser?: any;
  expenses?: any[];
  setSelectedExpense?: (expense: any) => void;
  /** Thread for whichever record the justification dialog is open on. */
  thread?: ThreadEntryDto[];
  threadLoading?: boolean;
  /** Tells the page which request to load the thread for. */
  onFocusThreadRequest?: (requestId: string | null) => void;
}

export const ExceptionHistoryTab: React.FC<ExceptionHistoryTabProps> = ({
  currentUser,
  expenses = [],
  setSelectedExpense,
  thread = [],
  threadLoading = false,
  onFocusThreadRequest
}) => {
  // Defaults to "All Periods" — the previous default was a literal "FY 2026"
  // which showed nothing at all in any other fiscal year.
  const [periodFilter, setPeriodFilter] = useState("All Periods");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("Approved");
  const [searchQuery, setSearchQuery] = useState("");
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [justificationTarget, setJustificationTarget] = useState<any>(null);

  /**
   * One row per request that went down the exception path.
   *
   * Three things here were wrong and are fixed:
   *  - `expansionAmt` was the whole request amount. The granted expansion is the
   *    shortfall the Finance Head covered, which the workflow records on the
   *    approving history entry.
   *  - `financeHead` fell back to the *current* user, so the reader was named as
   *    the approver of a decision someone else made.
   *  - `period` was the literal "FY 2026" on every row, which made the Period
   *    filter above it inert.
   */
  const allRecords = expenses
    .filter(e =>
      e.exceptionalBudgetApproved ||
      e.status === "PENDING_EXCEPTIONAL" ||
      (e.history && e.history.some((h: any) => h.action?.includes("EXCEPTIONAL") || h.action?.includes("EXPANSION")))
    )
    .map(e => {
      // The entry that granted (or is awaiting) the expansion.
      const decision = [...(e.history ?? [])]
        .reverse()
        .find((h: any) => h.action?.includes("EXCEPTIONAL") || h.action?.includes("EXPANSION"));
      const decidedAt = decision?.timestamp || e.updatedAt || e.createdAt;
      const decidedOn = new Date(decidedAt);

      return {
        id: e._id,
        date: decidedOn.toISOString().split("T")[0],
        reqId: `#${e.requestNumber?.replace(/^REQ-/, "") || e.requestNumber}`,
        dept: e.departmentId?.name || "Unassigned",
        requestTitle: e.description || e.category,
        // `exceptionalBudgetAmount` is the granted expansion when the workflow
        // recorded one; otherwise the deficit is unknown rather than the amount.
        expansionAmt: Number(e.exceptionalBudgetAmount ?? 0),
        financeHead: e.exceptionalApprovedBy?.name || decision?.actorName || "—",
        period: `FY ${decidedOn.getFullYear()}`,
        status: e.status === "PENDING_EXCEPTIONAL" ? "Pending" : "Approved",
        // Kept for ordering: `date` is a display string, so the raw decision
        // instant is what the sort below has to read.
        decidedAtMs: decidedOn.getTime(),
        rawExpense: e
      };
    })
    // Most recent expansion at the top — rows are keyed on the decision date,
    // not the request's creation order, so the incoming list's order is wrong here.
    .sort((a, b) => b.decidedAtMs - a.decidedAtMs);

  // Filtering logic
  const filteredRecords = allRecords.filter(rec => {
    if (periodFilter !== "All Periods" && rec.period !== periodFilter) return false;
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

  // Filter options come from the records themselves, so a new department or a
  // new fiscal year appears without a code change.
  const periodOptions = Array.from(new Set(allRecords.map(r => r.period))).sort().reverse();
  const departmentOptions = Array.from(new Set(allRecords.map(r => r.dept))).sort();

  // Calculate departmental totals dynamically for filtered view
  const deptTotalsMap: Record<string, number> = {};
  filteredRecords.forEach(rec => {
    deptTotalsMap[rec.dept] = (deptTotalsMap[rec.dept] || 0) + rec.expansionAmt;
  });

  // Total calculation for bottom blue card
  const totalExpansionSum = filteredRecords.reduce((sum, r) => sum + r.expansionAmt, 0);
  const approvedCount = filteredRecords.filter(r => r.status === "Approved").length;

  const handleExportCSV = () => {
    downloadCsv(datedFilename(`exception-history-${periodFilter.replace(/\s+/g, "-")}`), filteredRecords, [
      { header: "Date", value: r => r.date },
      { header: "Req ID", value: r => r.reqId },
      { header: "Dept", value: r => r.dept },
      { header: "Request Title", value: r => r.requestTitle },
      { header: "Expansion Amount", value: r => r.expansionAmt },
      { header: "Finance Head", value: r => r.financeHead },
      { header: "Total Expansions (Dept)", value: r => deptTotalsMap[r.dept] ?? 0 },
    ]);
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
          border: "1px solid rgb(var(--color-card-border) / 0.5)",
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
                background: "rgb(var(--color-surface-secondary) / 0.5)",
                border: "1px solid rgb(var(--color-card-border) / 0.6)",
                fontWeight: "500"
              }}
            >
              <option value="All Periods">All Periods</option>
              {periodOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
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
                background: "rgb(var(--color-surface-secondary) / 0.5)",
                border: "1px solid rgb(var(--color-card-border) / 0.6)",
                fontWeight: "500"
              }}
            >
              <option value="All Departments">All Departments</option>
              {departmentOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
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
                  background: "rgb(var(--color-surface-secondary) / 0.5)",
                  border: "1px solid rgb(var(--color-card-border) / 0.6)",
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
                  background: "rgb(var(--color-surface-secondary) / 0.5)",
                  border: "1px solid rgb(var(--color-card-border) / 0.6)"
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
              border: "1px solid rgb(var(--color-card-border) / 0.8)",
              background: "rgb(var(--color-surface) / 0.6)",
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
          border: "1px solid rgb(var(--color-card-border) / 0.5)",
          background: "rgb(var(--color-card))",
          boxShadow: "var(--shadow-sm)"
        }}
      >
        <div className="table-container" style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgb(var(--color-surface-secondary) / 0.5)", borderBottom: "1px solid rgb(var(--color-card-border) / 0.6)" }}>
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
                  const deptTotal = deptTotalsMap[rec.dept] ?? 0;
                  return (
                    <tr
                      key={rec.id}
                      style={{
                        borderBottom: "1px solid rgb(var(--color-card-border) / 0.3)",
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
                            onFocusThreadRequest?.(String(rec.rawExpense?._id ?? ""));
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
                        {formatNaira(rec.expansionAmt)}
                      </td>
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", color: "rgb(var(--color-text-muted))" }}>
                        {rec.financeHead}
                      </td>
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
                        {formatNaira(deptTotal)}
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
              background: "rgb(var(--color-card-border) / 0.80)",
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
                color: "rgb(var(--color-card-border) / 1.00)",
                display: "block",
                marginBottom: "0.35rem"
              }}
            >
              TOTAL ONE-TIME EXPANSIONS GRANTED IN {periodFilter === "All Periods" ? "ALL PERIODS" : periodFilter}
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "2.35rem", fontWeight: "800", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {formatNaira(totalExpansionSum)}
              </span>
              <span style={{ fontSize: "0.875rem", color: "rgb(var(--color-card-border) / 1.00)", fontWeight: "500" }}>
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
      {/* History is a record, not a conversation: the question box is hidden and
          the timeline is the request's real thread. Both the number and the
          title used to fall back to "#0044 / Cooling Unit Replacement" — the
          design's sample request — whenever a row lacked them. */}
      <RequestJustificationModal
        isOpen={showJustificationModal}
        onClose={() => { setShowJustificationModal(false); onFocusThreadRequest?.(null); }}
        requestNumber={justificationTarget?.reqId}
        requestTitle={justificationTarget?.requestTitle}
        entries={thread}
        loading={threadLoading}
        readOnly
      />
    </div>
  );
};
