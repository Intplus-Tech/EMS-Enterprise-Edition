import React, { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Pagination } from "./ui/Pagination";
import { EmptyState } from "./ui/EmptyState";
import { formatNaira } from "./ui/format";
import { datedFilename, downloadCsv } from "./ui/exportCsv";
import { ExpenseClient } from "../services/expense.client";
import { BudgetContextDto } from "../types/api";
import { isDecidableException } from "../enums/statuses";

/** Rows shown per page in the exceptions queue. */
const ROWS_PER_PAGE = 8;

interface PendingExceptionsOverviewTabProps {
  currentUser?: any;
  expenses?: any[];
  onReviewRequest?: (req: any) => void;
  /** Refetches the dashboard so "Reload Data" actually reloads. */
  onReload?: () => void | Promise<void>;
}

export const PendingExceptionsOverviewTab: React.FC<PendingExceptionsOverviewTabProps> = ({
  currentUser,
  expenses = [],
  onReviewRequest,
  onReload
}) => {
  const [sortFilter, setSortFilter] = useState("Deficit (Largest First)");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [searchQuery, setSearchQuery] = useState("");
  const [isReloading, setIsReloading] = useState(false);
  const [page, setPage] = useState(1);

  /**
   * Real budget position per open exception, keyed by request id.
   *
   * The DEFICIT and BUDGET columns used to be `amount * 0.4` and `amount * 0.6`
   * — invented ratios with no relationship to any department's allocation — and
   * the "Total Deficit Exposed" KPI was their sum. They are now the server's
   * own figures, the same ones the review screen shows.
   */
  const [budgetByRequest, setBudgetByRequest] = useState<Record<string, BudgetContextDto>>({});

  const openExceptions = useMemo(
    // Held requests share the flagged status but have no period to expand, so
    // they are not the Finance Head's to decide and stay out of this queue.
    () => expenses.filter(e => isDecidableException(e)),
    [expenses]
  );

  // One fetch per request in the queue; results are cached by id so re-renders
  // and unrelated dashboard refreshes do not re-request them.
  React.useEffect(() => {
    let cancelled = false;
    const missing = openExceptions.filter(e => !budgetByRequest[String(e._id)]);
    if (missing.length === 0) return;

    Promise.all(
      missing.map(e =>
        ExpenseClient.budgetContext(String(e._id))
          .then(context => [String(e._id), context] as const)
          .catch(() => null)
      )
    ).then(results => {
      if (cancelled) return;
      const next: Record<string, BudgetContextDto> = {};
      for (const entry of results) if (entry) next[entry[0]] = entry[1];
      if (Object.keys(next).length > 0) setBudgetByRequest(prev => ({ ...prev, ...next }));
    });

    return () => { cancelled = true; };
  }, [openExceptions, budgetByRequest]);

  // Derived on every render from `expenses`, so a decision taken on the review
  // screen removes the row. This was seeded once into `useState`, which left
  // decided exceptions in the table until a full page reload.
  const records = openExceptions.map(e => {
    const createdDate = new Date(e.createdAt || Date.now());
    const diffDays = Math.max(1, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
    const context = budgetByRequest[String(e._id)];
    return {
      id: String(e._id),
      // `criticalGap` is the shortfall this request would create. Null until the
      // figure has loaded, so the cell says "—" instead of guessing.
      deficit: context?.hasBudget ? context.criticalGap : null,
      reqId: e.requestNumber ? `#${e.requestNumber.replace(/^REQ-/, "")}` : `#${String(e._id).slice(-4)}`,
      title: e.description || e.category,
      subtitle: e.category,
      dept: (e.departmentId as any)?.name || "Unassigned",
      amount: e.amount,
      budget: context?.hasBudget ? context.remaining : null,
      waitDays: diffDays,
      isHighWait: diffDays >= 3,
      rawExpense: e
    };
  });

  const totalDeficitExposed = records.reduce((sum, r) => sum + Math.abs(r.deficit ?? 0), 0);

  // Department options come from the queue itself rather than a fixed list that
  // could never match a newly created department.
  const departmentOptions = Array.from(new Set(records.map(r => r.dept))).sort();

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

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (sortFilter === "Deficit (Largest First)") return Math.abs(b.deficit ?? 0) - Math.abs(a.deficit ?? 0);
    if (sortFilter === "Deficit (Smallest First)") return Math.abs(a.deficit ?? 0) - Math.abs(b.deficit ?? 0);
    if (sortFilter === "Oldest First") return b.waitDays - a.waitDays;
    if (sortFilter === "Newest First") return a.waitDays - b.waitDays;
    return 0;
  });

  const safePage = Math.min(page, Math.max(1, Math.ceil(sortedRecords.length / ROWS_PER_PAGE)));
  const visibleRows = sortedRecords.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleExportCSV = () => {
    downloadCsv(datedFilename("pending-exceptional-approvals"), sortedRecords, [
      { header: "Deficit", value: r => r.deficit ?? "" },
      { header: "Req ID", value: r => r.reqId },
      { header: "Request Title", value: r => r.title },
      { header: "Category", value: r => r.subtitle },
      { header: "Dept", value: r => r.dept },
      { header: "Amount", value: r => r.amount },
      { header: "Remaining Budget", value: r => r.budget ?? "" },
      { header: "Wait Days", value: r => r.waitDays },
    ]);
  };

  /** Refetches the dashboard. This used to spin for 600ms and load nothing. */
  const handleReload = async () => {
    setIsReloading(true);
    try {
      await onReload?.();
    } finally {
      setIsReloading(false);
    }
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
            border: "1px solid rgb(var(--color-card-border) / 0.5)",
            borderRadius: "16px",
            padding: "1.6rem 1.75rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "#2563EB" }}>
              Total Deficit Exposed
            </span>
            <span style={{ fontSize: "2rem", fontWeight: "800", color: "#2563EB", letterSpacing: "-0.02em" }}>
              {formatNaira(totalDeficitExposed)}
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
            border: "1px solid rgb(var(--color-card-border) / 0.5)",
            borderRadius: "16px",
            padding: "1.6rem 1.75rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "#2563EB" }}>
              Longest Wait
            </span>
            {/* Measured from the queue. This tile showed a fixed "1.4 Days". */}
            <span style={{ fontSize: "2rem", fontWeight: "800", color: "#2563EB", letterSpacing: "-0.02em" }}>
              {records.length === 0
                ? "—"
                : `${Math.max(...records.map(r => r.waitDays))} days`}
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
          border: "1px solid rgb(var(--color-card-border) / 0.5)",
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
                border: "1px solid rgb(var(--color-card-border) / 0.8)",
                background: "rgb(var(--color-surface) / 0.6)",
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
                border: "1px solid rgb(var(--color-card-border) / 0.8)",
                background: "rgb(var(--color-surface) / 0.6)",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "rgb(var(--color-text))"
              }}
            >
              <option value="All Departments">All Departments</option>
              {departmentOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
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
                  border: "1px solid rgb(var(--color-card-border) / 0.8)",
                  background: "rgb(var(--color-surface) / 0.6)",
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
              border: "1px solid rgb(var(--color-card-border) / 0.8)",
              background: "rgb(var(--color-surface) / 0.6)",
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
          border: "1px solid rgb(var(--color-card-border) / 0.5)",
          background: "rgb(var(--color-card))",
          boxShadow: "var(--shadow-sm)"
        }}
      >
        <div className="table-container" style={{ overflowX: "auto" }}>
          <table className="data-table table-fixed" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              {/* Every column but REQUEST TITLE is sized to its longest realistic
                  value, so the title absorbs the slack and wraps rather than
                  stretching the table past the panel. */}
              <tr style={{ background: "rgb(var(--color-surface-secondary) / 0.5)", borderBottom: "1px solid rgb(var(--color-card-border) / 0.6)" }}>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase", width: "160px" }}>DEFICIT</th>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase", width: "120px" }}>REQ ID</th>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase" }}>REQUEST TITLE</th>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase", width: "150px" }}>DEPT</th>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase", width: "150px" }}>AMOUNT</th>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase", width: "140px" }}>BUDGET</th>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase", width: "100px" }}>WAIT</th>
                <th style={{ padding: "1rem 1.25rem", fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.05em", textTransform: "uppercase", textAlign: "right", width: "150px" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length > 0 ? (
                visibleRows.map((r) => {
                  const isHighDeficit = Math.abs(r.deficit ?? 0) >= 20000;
                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: "1px solid rgb(var(--color-card-border) / 0.3)",
                        transition: "background 0.15s ease"
                      }}
                    >
                      {/* DEFICIT Badge */}
                      <td style={{ padding: "1.1rem 1.25rem" }}>
                        <span
                          style={{
                            padding: "0.3rem 0.65rem",
                            borderRadius: "999px",
                            background: isHighDeficit ? "rgba(220, 38, 38, 0.12)" : "rgba(234, 88, 12, 0.12)",
                            color: isHighDeficit ? "#DC2626" : "#EA580C",
                            fontWeight: "800",
                            fontSize: "0.8rem"
                          }}
                        >
                          {r.deficit === null ? "—" : `-${formatNaira(Math.abs(r.deficit))}`}
                        </span>
                      </td>

                      {/* REQ ID */}
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", fontWeight: "600", color: "rgb(var(--color-text-muted))" }}>
                        {r.reqId}
                      </td>

                      {/* REQUEST TITLE + Subtitle — free text, so it wraps */}
                      <td className="cell-wrap" style={{ padding: "1.1rem 1.25rem" }}>
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
                      <td className="cell-wrap" style={{ padding: "1.1rem 1.25rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "8px",
                            background: "rgba(37, 99, 235, 0.12)",
                            color: "#2563EB",
                            fontWeight: "700",
                            fontSize: "0.775rem"
                          }}
                        >
                          {r.dept}
                        </span>
                      </td>

                      {/* AMOUNT */}
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.9rem", fontWeight: "800", color: "rgb(var(--color-text))" }}>
                        {formatNaira(r.amount)}
                      </td>

                      {/* BUDGET */}
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", color: "rgb(var(--color-text-muted))" }}>
                        {r.budget === null ? "Not set" : formatNaira(r.budget)}
                      </td>

                      {/* WAIT */}
                      <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.875rem", fontWeight: "700", color: r.isHighWait ? "#DC2626" : "rgb(var(--color-text-muted))" }}>
                        {r.waitDays} {r.waitDays === 1 ? "day" : "days"}
                      </td>

                      {/* ACTION Button */}
                      <td style={{ padding: "1.1rem 1.25rem", textAlign: "right" }}>
                        {/* Hands back the raw expense, not the display record:
                            the page resolves the selection by `_id`, which only
                            exists on the former. Passing `r` sent `_id:
                            undefined`, so the lookup missed and Review did
                            nothing. */}
                        <button
                          onClick={() => onReviewRequest && onReviewRequest(r.rawExpense)}
                          className="btn btn-secondary"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            padding: "0.45rem 1rem",
                            fontSize: "0.825rem",
                            fontWeight: "700",
                            borderRadius: "8px",
                            border: "1px solid rgba(37, 99, 235, 0.3)",
                            background: "rgba(37, 99, 235, 0.08)",
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
                  <td colSpan={8} style={{ padding: 0 }}>
                    <EmptyState
                      icon={<Icons.ShieldCheck size={20} />}
                      title="No pending exceptional approvals"
                      description="Over-budget requests forwarded by a Finance Officer appear here for authorisation."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer: real paging plus a Reload that refetches. "Load More"
            used to have no handler at all, and the summary line counted the
            whole list rather than the page on screen. */}
        <div
          style={{
            padding: "0.5rem 1.5rem 1rem",
            background: "rgb(var(--color-surface-secondary) / 0.4)",
            borderTop: "1px solid rgb(var(--color-card-border) / 0.4)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}
        >
          <Pagination
            page={safePage}
            rowsPerPage={ROWS_PER_PAGE}
            totalCount={sortedRecords.length}
            onPageChange={setPage}
            itemLabel="pending exceptions"
          />

          <button
            onClick={handleReload}
            disabled={isReloading}
            style={{
              alignSelf: "flex-start",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "none",
              border: "none",
              color: "rgb(var(--color-text-muted))",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: isReloading ? "wait" : "pointer"
            }}
          >
            <Icons.RefreshCw size={15} className={isReloading ? "spin" : ""} />
            {isReloading ? "Reloading…" : "Reload Data"}
          </button>
        </div>
      </div>
    </div>
  );
};
