/**
 * HistoryTab — finalized/archived request history for initiators and approvers.
 *
 * Mirrors `designs/initiator/History.png`: KPI row, a staged filter panel, the
 * REQUEST ID / DATE / CATEGORY / AMOUNT / STATUS / ACTIONS table and a paginated
 * footer. Presentational only — the page layer owns the filter state it shares
 * with other screens.
 */

import React, { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { isOwnRequest, sameId } from "../domains/identity/reference";
import { StatCard } from "./ui/StatCard";
import { Pagination } from "./ui/Pagination";
import { EmptyState } from "./ui/EmptyState";
import { RequestStatus } from "../enums/statuses";
import { CURRENCY_SYMBOL, formatNaira, formatNairaPrecise, formatDate, humanizeStatus, statusBadgeClass } from "./ui/format";

/** Design shows five rows per page in the history table. */
const ROWS_PER_PAGE = 5;

/**
 * Status filter options, derived from the lifecycle enum rather than retyped, so
 * a new status cannot appear in the table with no way to filter for it. DRAFT is
 * omitted because `scoped` never admits drafts.
 */
const SELECTABLE_STATUSES = Object.values(RequestStatus).filter(s => s !== RequestStatus.DRAFT);

interface HistoryTabProps {
  currentUser: any;
  expenses: any[];
  historyFilterCategory: string;
  setHistoryFilterCategory: (cat: string) => void;
  historyFilterStatus: string;
  setHistoryFilterStatus: (status: string) => void;
  historySearchQuery: string;
  setHistorySearchQuery: (query: string) => void;
  historySubTab: "all" | "approved" | "rejected";
  setHistorySubTab: (tab: "all" | "approved" | "rejected") => void;
  setSelectedExpense: (expense: any) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  currentUser,
  expenses,
  historyFilterCategory,
  setHistoryFilterCategory,
  historyFilterStatus,
  setHistoryFilterStatus,
  historySearchQuery,
  setHistorySearchQuery,
  historySubTab,
  setHistorySubTab,
  setSelectedExpense
}) => {
  // Draft filter values — the design commits them via "Apply Filters" rather than
  // filtering on every keystroke, so they are staged locally first.
  const [draftCategory, setDraftCategory] = useState(historyFilterCategory);
  const [draftStatus, setDraftStatus] = useState(historyFilterStatus);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [page, setPage] = useState(1);

  // Requests visible to this user, before any UI filter is applied. Kept separate
  // so the KPI tiles always describe the full history, not the filtered slice.
  const scoped = useMemo(() => expenses.filter(e => {
    // History is the complete log: `designs/initiator/History.png` lists PENDING
    // and CLARIFICATION NEEDED rows beside PAID/APPROVED/REJECTED, and the KPI
    // reads "Total Request — across all statuses". This previously whitelisted
    // only finalised statuses, so a request an initiator had just raised was
    // missing from their own history until somebody approved it.
    // DRAFT is the one exclusion: an unsubmitted draft is not yet part of the
    // record, and it already has an edit affordance on the Requests screen.
    if (e.status === "DRAFT") return false;

    return currentUser?.role === "INITIATOR"
      ? isOwnRequest(e, currentUser)
      : (["ADMIN", "FINANCE_MANAGER", "FINANCE_OFFICER", "FINANCE_HEAD"].includes(currentUser?.role)
        || sameId(e.departmentId, currentUser?.departmentId)
        || sameId(e.initiatorId?.departmentId, currentUser?.departmentId)
        || (e.departmentId as any)?.name === currentUser?.departmentName);
  }), [expenses, currentUser]);

  // KPI figures derived from the scoped list so they stay consistent with the table.
  const stats = useMemo(() => {
    const now = new Date();
    const spentThisMonth = scoped
      .filter(e => {
        if (!["PAID", "CLOSED"].includes(e.status)) return false;
        const d = new Date(e.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      spentThisMonth,
      total: scoped.length,
      approved: scoped.filter(e => ["APPROVED", "PAID", "CLOSED"].includes(e.status)).length,
      rejected: scoped.filter(e => ["REJECTED", "CANCELLED"].includes(e.status)).length,
    };
  }, [scoped]);

  const historical = useMemo(() => scoped.filter(e => {
    if (historyFilterCategory !== "ALL" && e.category !== historyFilterCategory) return false;
    if (historyFilterStatus !== "ALL" && e.status !== historyFilterStatus) return false;

    // Inclusive date window; `appliedTo` is pushed to end-of-day so the selected
    // day itself is never excluded.
    const created = new Date(e.createdAt).getTime();
    if (appliedFrom && created < new Date(appliedFrom).getTime()) return false;
    if (appliedTo && created > new Date(appliedTo).getTime() + 86_399_999) return false;

    const query = historySearchQuery.toLowerCase();
    const matchesSearch = e.description.toLowerCase().includes(query) || e.requestNumber.toLowerCase().includes(query);
    if (!matchesSearch) return false;

    if (historySubTab === "approved") return ["PAID", "CLOSED", "APPROVED"].includes(e.status);
    if (historySubTab === "rejected") return ["REJECTED", "CANCELLED"].includes(e.status);
    return true;
  })
    // Newest first. The order was inherited from whatever `/api/expenses`
    // returned, so any caller that passed an unsorted list silently produced a
    // history table reading oldest-at-top.
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [scoped, historyFilterCategory, historyFilterStatus, historySearchQuery, historySubTab, appliedFrom, appliedTo]);

  // Guard against landing on a page that no longer exists after filtering.
  const safePage = Math.min(page, Math.max(1, Math.ceil(historical.length / ROWS_PER_PAGE)));
  const visibleRows = historical.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const applyFilters = () => {
    setHistoryFilterCategory(draftCategory);
    setHistoryFilterStatus(draftStatus);
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
    setPage(1);
  };

  const resetFilters = () => {
    setDraftCategory("ALL");
    setDraftStatus("ALL");
    setDraftFrom("");
    setDraftTo("");
    setHistoryFilterCategory("ALL");
    setHistoryFilterStatus("ALL");
    setAppliedFrom("");
    setAppliedTo("");
    setHistorySearchQuery("");
    setPage(1);
  };

  return (
    <div>
      {/* Page heading + free-text search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <div>
          <h2>Request History</h2>
          <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.95rem" }}>
            View and manage your previous financial requests and expenditure logs.
          </p>
        </div>

        <div style={{ position: "relative", minWidth: "220px" }}>
          <Icons.Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-dim))" }} />
          <input
            type="text"
            placeholder="Search history..."
            value={historySearchQuery}
            onChange={(e) => { setHistorySearchQuery(e.target.value); setPage(1); }}
            className="form-input"
            style={{ paddingLeft: "2.25rem", fontSize: "0.85rem", padding: "0.5rem 0.5rem 0.5rem 2.25rem", borderRadius: "8px", height: "auto" }}
          />
        </div>
      </div>

      {/* KPI row — always describes the full history, never the filtered slice */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard label="Total Spent" hint="this month" value={formatNaira(stats.spentThisMonth)} icon={<Icons.CreditCard size={18} />} />
        <StatCard label="Total Request" hint="across all statuses" value={stats.total} icon={<Icons.FileText size={18} />} />
        <StatCard label="Total Approved" hint="all approved and paid" value={stats.approved} icon={<Icons.CheckCheck size={18} />} tone="neutral" />
        <StatCard label="Total Rejected" hint="not considered" value={stats.rejected} icon={<Icons.AlertCircle size={18} />} tone="danger" />
      </div>

      {/* Staged filter panel — nothing is applied until "Apply Filters" is pressed */}
      <div className="glass-panel" style={{ padding: "1.15rem 1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr)) auto", gap: "1rem", alignItems: "end" }}>
          <div>
            <label className="form-label" style={{ fontSize: "0.78rem" }}>Filter by Category</label>
            <select value={draftCategory} onChange={(e) => setDraftCategory(e.target.value)} className="form-select">
              <option value="ALL">All Categories</option>
              <option value="Travel">Travel</option>
              <option value="Software">Software</option>
              <option value="Marketing">Marketing</option>
              <option value="Office Equipment">Office Equipment</option>
              <option value="Meals">Meals</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: "0.78rem" }}>Status</label>
            <select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)} className="form-select">
              <option value="ALL">All Statuses</option>
              {SELECTABLE_STATUSES.map(status => (
                <option key={status} value={status}>{humanizeStatus(status)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: "0.78rem" }}>Date Range</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <input type="date" aria-label="From date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} className="form-input" style={{ fontSize: "0.82rem" }} />
              <span style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.8rem" }}>&ndash;</span>
              <input type="date" aria-label="To date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} className="form-input" style={{ fontSize: "0.82rem" }} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button type="button" onClick={applyFilters} className="btn btn-primary" style={{ background: "#2563EB", border: "none" }}>
              Apply Filters
            </button>
            <button type="button" onClick={resetFilters} style={{ background: "none", border: "none", color: "#2563EB", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tabs for History (All Requests, Approved, Rejected) */}
      <div style={{ display: "flex", borderBottom: "1px solid rgb(var(--color-card-border))", marginBottom: "1.5rem" }}>
        {[
          { id: "all", label: "All Requests" },
          { id: "approved", label: "Approved" },
          { id: "rejected", label: "Rejected" }
        ].map(subTab => (
          <button
            key={subTab.id}
            onClick={() => { setHistorySubTab(subTab.id as any); setPage(1); }}
            style={{
              padding: "0.75rem 1.5rem",
              background: "none",
              border: "none",
              borderBottom: historySubTab === subTab.id ? "2px solid rgb(var(--color-primary))" : "none",
              color: historySubTab === subTab.id ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            {subTab.label}
          </button>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        {historical.length > 0 ? (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>REQUEST ID</th>
                    <th>DATE</th>
                    <th>CATEGORY</th>
                    <th style={{ textAlign: "right" }}>AMOUNT ({CURRENCY_SYMBOL})</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((exp) => (
                    <tr key={exp._id}>
                      <td><strong>{exp.requestNumber}</strong></td>
                      <td>{formatDate(exp.createdAt)}</td>
                      <td>{exp.category}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{formatNairaPrecise(exp.amount)}</td>
                      <td>
                        <span className={`badge ${statusBadgeClass(exp.status)}`}>{humanizeStatus(exp.status)}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => setSelectedExpense(exp)}
                          style={{ background: "none", border: "none", color: "#2563EB", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={safePage}
              rowsPerPage={ROWS_PER_PAGE}
              totalCount={historical.length}
              onPageChange={setPage}
              itemLabel="entries"
            />
          </>
        ) : (
          <EmptyState
            icon={<Icons.Archive size={20} />}
            title="No requests found in history"
            description="Every request you submit appears here — in review, approved, paid, rejected or cancelled. Unsubmitted drafts stay on the Requests screen."
          />
        )}
      </div>
    </div>
  );
};
