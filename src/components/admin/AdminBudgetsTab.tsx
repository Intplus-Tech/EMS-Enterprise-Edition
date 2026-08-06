"use client";

/**
 * AdminBudgetsTab — Enterprise Budget Management View for System Administrators.
 *
 * Provides executive visibility into enterprise budget allocations, committed spend,
 * and line-item ledgers across all departments. Allows administrators to configure
 * department budget periods, inspect line-item utilization, and export financial summaries.
 */

import React, { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { formatNaira, formatNairaCompact } from "../ui/format";
import { Pagination } from "../ui/Pagination";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { datedFilename, downloadCsv } from "../ui/exportCsv";
import { BudgetPeriodDto, DepartmentDto, DepartmentSpendDto, PopulatedExpenseDto } from "../../types/api";

/** Rows shown per page in the admin budgets directory. */
const ROWS_PER_PAGE = 8;

/** Threshold percentage where a department's budget is marked "At Risk". */
const AT_RISK_THRESHOLD = 85;

export interface AdminBudgetRow {
  id: string;
  departmentId: string;
  name: string;
  periodName: string;
  totalBudget: number;
  utilised: number;
  pending: number;
  remaining: number;
  pctUsed: number;
  hasBudget: boolean;
  lineItems: Array<{
    id?: string;
    name: string;
    description?: string;
    amount: number;
    utilised?: number;
    pending?: number;
    expansionsGranted?: number;
  }>;
}

interface AdminBudgetsTabProps {
  departments: DepartmentDto[];
  budgets: DepartmentSpendDto[];
  budgetPeriods: BudgetPeriodDto[];
  expenses?: PopulatedExpenseDto[];
  onOpenSetBudget: (departmentId?: string) => void;
  onOpenDepartmentAnalytics?: (deptId: string) => void;
  onReload?: () => void | Promise<void>;
}

export const AdminBudgetsTab: React.FC<AdminBudgetsTabProps> = ({
  departments,
  budgets,
  budgetPeriods,
  expenses = [],
  onOpenSetBudget,
  onOpenDepartmentAnalytics,
  onReload,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "AT_RISK" | "EXHAUSTED" | "UNSET">("ALL");
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isReloading, setIsReloading] = useState(false);

  /**
   * Merges departments with their spend summaries and budget periods.
   * Ensures every department (whether funded or unset) has an authoritative row.
   */
  const budgetRows = useMemo<AdminBudgetRow[]>(() => {
    const spendMap = new Map(budgets.map((b) => [b.id, b]));
    const periodMap = new Map(budgetPeriods.map((p) => [p.departmentId, p]));

    return departments.map((dept) => {
      const spend = spendMap.get(dept.id);
      const period = periodMap.get(dept.id);

      return {
        id: dept.id,
        departmentId: dept.id,
        name: dept.name,
        periodName: period?.periodName ?? "Current Fiscal Period",
        totalBudget: spend?.totalBudget ?? period?.totalBudget ?? 0,
        utilised: spend?.utilised ?? period?.utilisedBudget ?? 0,
        pending: spend?.pending ?? period?.pendingBudget ?? 0,
        remaining: spend?.remaining ?? (period ? period.totalBudget - period.utilisedBudget - period.pendingBudget : 0),
        pctUsed: spend?.pctUsed ?? (period && period.totalBudget > 0 ? Math.round(((period.utilisedBudget + period.pendingBudget) / period.totalBudget) * 100) : 0),
        hasBudget: spend?.hasBudget ?? Boolean(period),
        lineItems: period?.lineItems ?? [],
      };
    });
  }, [departments, budgets, budgetPeriods]);

  /** KPI Metrics aggregated across all active budget allocations. */
  const metrics = useMemo(() => {
    let totalAllocated = 0;
    let totalUtilised = 0;
    let totalPending = 0;
    let atRiskCount = 0;

    budgetRows.forEach((r) => {
      if (r.hasBudget) {
        totalAllocated += r.totalBudget;
        totalUtilised += r.utilised;
        totalPending += r.pending;
        if (r.pctUsed >= AT_RISK_THRESHOLD) atRiskCount++;
      }
    });

    const totalRemaining = Math.max(0, totalAllocated - totalUtilised - totalPending);
    const overallPct = totalAllocated > 0 ? Math.round(((totalUtilised + totalPending) / totalAllocated) * 100) : 0;

    return {
      totalAllocated,
      totalUtilised,
      totalPending,
      totalRemaining,
      overallPct,
      atRiskCount,
      activeCount: budgetRows.filter((r) => r.hasBudget).length,
    };
  }, [budgetRows]);

  /** Filters rows based on user criteria (search query, department select, and status). */
  const filteredRows = useMemo(() => {
    return budgetRows.filter((row) => {
      if (deptFilter !== "ALL" && row.id !== deptFilter) return false;

      if (statusFilter === "ACTIVE" && !row.hasBudget) return false;
      if (statusFilter === "AT_RISK" && (!row.hasBudget || row.pctUsed < AT_RISK_THRESHOLD)) return false;
      if (statusFilter === "EXHAUSTED" && (!row.hasBudget || row.pctUsed < 100)) return false;
      if (statusFilter === "UNSET" && row.hasBudget) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = row.name.toLowerCase().includes(query);
        const matchesPeriod = row.periodName.toLowerCase().includes(query);
        const matchesItem = row.lineItems.some((item) => item.name.toLowerCase().includes(query));
        if (!matchesName && !matchesPeriod && !matchesItem) return false;
      }

      return true;
    });
  }, [budgetRows, deptFilter, statusFilter, searchQuery]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE)));
  const visibleRows = filteredRows.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleExportCSV = () => {
    downloadCsv(datedFilename("admin-budgets-overview"), filteredRows, [
      { header: "Department", value: (r) => r.name },
      { header: "Period", value: (r) => r.periodName },
      { header: "Allocation", value: (r) => (r.hasBudget ? r.totalBudget : "Not Set") },
      { header: "Utilised", value: (r) => r.utilised },
      { header: "Pending", value: (r) => r.pending },
      { header: "Remaining", value: (r) => (r.hasBudget ? r.remaining : "") },
      { header: "% Used", value: (r) => `${r.pctUsed}%` },
      { header: "Line Items Count", value: (r) => r.lineItems.length },
    ]);
  };

  const handleReload = async () => {
    setIsReloading(true);
    try {
      await onReload?.();
    } finally {
      setIsReloading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedDeptId(expandedDeptId === id ? null : id);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Title & Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0, color: "rgb(var(--color-text))" }}>
            Enterprise Budget Overview
          </h2>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>
            View departmental budget allocations, monitor line-item ledgers, and manage fiscal periods.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleReload}
            className="btn btn-secondary"
            disabled={isReloading}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Icons.RefreshCw size={16} className={isReloading ? "animate-spin" : ""} />
            {isReloading ? "Reloading..." : "Reload Data"}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Icons.Download size={16} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => onOpenSetBudget()}
            className="btn btn-primary"
            style={{ background: "#2563EB", border: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Icons.PlusCircle size={16} />
            Configure Budget
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
        <StatCard
          label="TOTAL ENTERPRISE BUDGET"
          value={formatNairaCompact(metrics.totalAllocated)}
          description={`${metrics.activeCount} funded departments`}
          icon={<Icons.Wallet size={20} />}
          tone="primary"
        />

        <StatCard
          label="UTILISED SPEND"
          value={formatNairaCompact(metrics.totalUtilised)}
          description={`${metrics.overallPct}% of total allocation spent`}
          icon={<Icons.CheckCircle2 size={20} />}
          tone="neutral"
        />

        <StatCard
          label="RESERVED / PENDING"
          value={formatNairaCompact(metrics.totalPending)}
          description="In-flight approvals reserved"
          icon={<Icons.Clock size={20} />}
          tone="warning"
        />

        <StatCard
          label="AVAILABLE HEADROOM"
          value={formatNairaCompact(metrics.totalRemaining)}
          description={metrics.atRiskCount > 0 ? `${metrics.atRiskCount} depts at risk (>85%)` : "Healthy headroom"}
          icon={<Icons.PieChart size={20} />}
          tone={metrics.atRiskCount > 0 ? "danger" : "neutral"}
        />
      </div>

      {/* Search & Filters Toolbar */}
      <div className="glass-panel" style={{ padding: "1rem 1.25rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", flex: 1 }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "260px", flex: 1 }}>
            <Icons.Search size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-dim))" }} />
            <input
              type="text"
              placeholder="Search by department, period, or line item..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="form-input"
              style={{ paddingLeft: "2.3rem", width: "100%" }}
            />
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
            className="form-select"
            style={{ width: "auto", minWidth: "180px" }}
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
            className="form-select"
            style={{ width: "auto", minWidth: "160px" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Budget</option>
            <option value="AT_RISK">At Risk (&gt;85% Used)</option>
            <option value="EXHAUSTED">Exhausted (100% Used)</option>
            <option value="UNSET">Unset Budget</option>
          </select>
        </div>

        <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>
          Showing {visibleRows.length} of {filteredRows.length} departments
        </span>
      </div>

      {/* Main Budget Directory Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgb(var(--color-surface-secondary) / 0.4)", borderBottom: "1px solid rgb(var(--color-card-border))" }}>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left", fontSize: "0.75rem", textTransform: "uppercase", color: "rgb(var(--color-text-dim))" }}>Department</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left", fontSize: "0.75rem", textTransform: "uppercase", color: "rgb(var(--color-text-dim))" }}>Period</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right", fontSize: "0.75rem", textTransform: "uppercase", color: "rgb(var(--color-text-dim))" }}>Allocation</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right", fontSize: "0.75rem", textTransform: "uppercase", color: "rgb(var(--color-text-dim))" }}>Utilised</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right", fontSize: "0.75rem", textTransform: "uppercase", color: "rgb(var(--color-text-dim))" }}>Remaining</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center", fontSize: "0.75rem", textTransform: "uppercase", color: "rgb(var(--color-text-dim))" }}>Utilisation %</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right", fontSize: "0.75rem", textTransform: "uppercase", color: "rgb(var(--color-text-dim))" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const isExpanded = expandedDeptId === row.id;
                const isAtRisk = row.pctUsed >= AT_RISK_THRESHOLD;
                const isExhausted = row.pctUsed >= 100;

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      style={{
                        borderBottom: "1px solid rgb(var(--color-card-border) / 0.5)",
                        background: isExpanded ? "rgb(var(--color-surface-secondary) / 0.3)" : "transparent",
                        transition: "background 0.2s ease",
                      }}
                    >
                      {/* Department Name */}
                      <td style={{ padding: "1rem", fontWeight: "600" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <button
                            type="button"
                            onClick={() => toggleExpand(row.id)}
                            style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))", cursor: "pointer", padding: 0 }}
                          >
                            {isExpanded ? <Icons.ChevronDown size={18} /> : <Icons.ChevronRight size={18} />}
                          </button>
                          <span>{row.name}</span>
                          {row.lineItems.length > 0 && (
                            <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem", borderRadius: "10px", background: "rgb(var(--color-surface-secondary))", color: "rgb(var(--color-text-muted))" }}>
                              {row.lineItems.length} items
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Period Name */}
                      <td style={{ padding: "1rem", fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>
                        {row.periodName}
                      </td>

                      {/* Total Allocation */}
                      <td style={{ padding: "1rem", textAlign: "right", fontWeight: "600" }}>
                        {row.hasBudget ? formatNaira(row.totalBudget) : <span style={{ color: "rgb(var(--color-text-dim))" }}>Unset</span>}
                      </td>

                      {/* Utilised Spend */}
                      <td style={{ padding: "1rem", textAlign: "right", fontSize: "0.88rem" }}>
                        {formatNaira(row.utilised)}
                        {row.pending > 0 && (
                          <span style={{ display: "block", fontSize: "0.72rem", color: "rgb(var(--color-text-muted))" }}>
                            +{formatNaira(row.pending)} pending
                          </span>
                        )}
                      </td>

                      {/* Remaining Headroom */}
                      <td style={{ padding: "1rem", textAlign: "right", fontWeight: "600", color: isExhausted ? "rgb(var(--color-danger))" : "rgb(var(--color-text))" }}>
                        {row.hasBudget ? formatNaira(row.remaining) : "—"}
                      </td>

                      {/* Utilisation Bar & Badge */}
                      <td style={{ padding: "1rem", width: "180px" }}>
                        {row.hasBudget ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                              <span style={{ fontWeight: "600", color: isExhausted ? "#EF4444" : isAtRisk ? "#F59E0B" : "#10B981" }}>
                                {row.pctUsed}%
                              </span>
                              <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>
                                {isExhausted ? "Exhausted" : isAtRisk ? "At Risk" : "Healthy"}
                              </span>
                            </div>
                            <div style={{ width: "100%", height: "6px", borderRadius: "3px", background: "rgb(var(--color-card-border) / 0.3)", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${Math.min(100, row.pctUsed)}%`,
                                  height: "100%",
                                  background: isExhausted ? "#EF4444" : isAtRisk ? "#F59E0B" : "#10B981",
                                  borderRadius: "3px",
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="badge" style={{ background: "rgb(var(--color-surface-secondary))", color: "rgb(var(--color-text-dim))" }}>
                            No Budget Set
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "1rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => onOpenSetBudget(row.id)}
                            className="btn btn-secondary"
                            style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
                            title="Configure Department Budget & Items"
                          >
                            <Icons.Sliders size={14} />
                            {row.hasBudget ? "Configure" : "Set Budget"}
                          </button>

                          {onOpenDepartmentAnalytics && (
                            <button
                              type="button"
                              onClick={() => onOpenDepartmentAnalytics(row.id)}
                              className="btn btn-secondary"
                              style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                              title="View Department Analytics"
                            >
                              <Icons.BarChart2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Line-Items Ledger Sub-Table */}
                    {isExpanded && (
                      <tr style={{ background: "rgb(var(--color-surface-secondary) / 0.15)" }}>
                        <td colSpan={7} style={{ padding: "1.25rem 1.5rem" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
                                Line Item Allocation Ledger — {row.name}
                              </h4>
                              <button
                                type="button"
                                onClick={() => onOpenSetBudget(row.id)}
                                style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.3rem" }}
                              >
                                <Icons.Plus size={14} /> Add Line Item
                              </button>
                            </div>

                            {row.lineItems.length > 0 ? (
                              <table className="data-table" style={{ width: "100%", fontSize: "0.82rem", background: "rgb(var(--color-surface))", borderRadius: "8px", border: "1px solid rgb(var(--color-card-border))" }}>
                                <thead>
                                  <tr style={{ borderBottom: "1px solid rgb(var(--color-card-border))", background: "rgb(var(--color-surface-secondary) / 0.3)" }}>
                                    <th style={{ padding: "0.6rem 0.85rem", textAlign: "left" }}>Item Name & Purpose</th>
                                    <th style={{ padding: "0.6rem 0.85rem", textAlign: "right" }}>Allocation</th>
                                    <th style={{ padding: "0.6rem 0.85rem", textAlign: "right" }}>Expansions</th>
                                    <th style={{ padding: "0.6rem 0.85rem", textAlign: "right" }}>Utilised</th>
                                    <th style={{ padding: "0.6rem 0.85rem", textAlign: "right" }}>Remaining</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.lineItems.map((item, idx) => {
                                    const itemUtil = item.utilised ?? 0;
                                    const itemPending = item.pending ?? 0;
                                    const expansions = item.expansionsGranted ?? 0;
                                    const totalCap = item.amount + expansions;
                                    const rem = Math.max(0, totalCap - itemUtil - itemPending);

                                    return (
                                      <tr key={item.id || idx} style={{ borderBottom: "1px solid rgb(var(--color-card-border) / 0.4)" }}>
                                        <td style={{ padding: "0.65rem 0.85rem" }}>
                                          <strong style={{ display: "block" }}>{item.name}</strong>
                                          {item.description && (
                                            <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                                              {item.description}
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontWeight: "600" }}>
                                          {formatNaira(item.amount)}
                                        </td>
                                        <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", color: expansions > 0 ? "#10B981" : "rgb(var(--color-text-dim))" }}>
                                          {expansions > 0 ? `+${formatNaira(expansions)}` : "—"}
                                        </td>
                                        <td style={{ padding: "0.65rem 0.85rem", textAlign: "right" }}>
                                          {formatNaira(itemUtil)}
                                          {itemPending > 0 && (
                                            <span style={{ display: "block", fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>
                                              +{formatNaira(itemPending)} pend
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontWeight: "600" }}>
                                          {formatNaira(rem)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            ) : (
                              <p style={{ margin: 0, fontSize: "0.8rem", color: "rgb(var(--color-text-muted))", fontStyle: "italic" }}>
                                No line items configured for this department's budget period yet. Click "Configure" to add line items.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 0 }}>
                    <EmptyState
                      icon={<Icons.Wallet size={24} />}
                      title="No budget records found"
                      description="Try adjusting your search query or filter criteria, or click 'Configure Budget' to set up a department."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredRows.length > 0 && (
          <Pagination
            page={safePage}
            rowsPerPage={ROWS_PER_PAGE}
            totalCount={filteredRows.length}
            onPageChange={setPage}
            itemLabel="departments"
          />
        )}
      </div>
    </div>
  );
};
