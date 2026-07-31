import React, { useState } from "react";
import { Pagination } from "../ui/Pagination";
import { formatNaira } from "../ui/format";
import { datedFilename, downloadCsv } from "../ui/exportCsv";
import { DepartmentDto, DepartmentSpendDto } from "../../types/api";

// Matches the row density shown in designs/system-admin/Admin_ Department Management.png
const ROWS_PER_PAGE = 5;
import * as Icons from "lucide-react";

/** A department row joined with its budget figures for this screen. */
export type AdminDepartmentRow = DepartmentDto & Omit<DepartmentSpendDto, "id" | "name" | "description" | "isActive">;

interface AdminDepartmentalSpendTabProps {
  departments: AdminDepartmentRow[];
  onOpenCreateDept: () => void;
  onOpenEditDept: (dept: AdminDepartmentRow) => void;
  onOpenDeleteDept: (dept: AdminDepartmentRow) => void;
}

export const AdminDepartmentalSpendTab: React.FC<AdminDepartmentalSpendTabProps> = ({
  departments,
  onOpenCreateDept,
  onOpenEditDept,
  onOpenDeleteDept
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

  const deptList = departments;

  // Clamp the page so a shrinking department list never strands an empty page.
  const safePage = Math.min(page, Math.max(1, Math.ceil(deptList.length / ROWS_PER_PAGE)));
  const visibleDepts = deptList.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

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
              <Icons.Download size={15} /> Export PDF
            </button>
          </div>
        </div>

        {/* Top Split Section */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          {/* Left Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Efficiency Score Gauge Card */}
            <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
                EFFICIENCY SCORE
              </div>
              <div style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                border: "8px solid #2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 0.5rem auto",
                fontSize: "1.75rem",
                fontWeight: "800",
                color: "rgb(var(--color-text))"
              }}>
                85%
              </div>
            </div>

            {/* Budget Utilized Card */}
            <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                BUDGET UTILIZED
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "rgb(var(--color-text))" }}>
                ₦4.2M <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-dim))", fontWeight: "500" }}>/ ₦5.0M</span>
              </div>
              {/* Progress bar */}
              <div style={{ width: "100%", height: "8px", backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: "4px", margin: "0.85rem 0" }}>
                <div style={{ width: "84%", height: "100%", backgroundColor: "#2563eb", borderRadius: "4px" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                <span>84% of quarterly cap</span>
                <span style={{ color: "#38bdf8", fontWeight: "600" }}>₦800k left</span>
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
              <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ width: "10px", height: "10px", backgroundColor: "#2563eb", borderRadius: "2px" }} /> Actual
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ width: "10px", height: "10px", backgroundColor: "#93c5fd", borderRadius: "2px" }} /> Projected
                </span>
              </div>
            </div>

            {/* Bar Chart Simulation */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: "180px", paddingTop: "1rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
              {[
                { month: "JAN", projected: 60, actual: 70 },
                { month: "FEB", projected: 55, actual: 50 },
                { month: "MAR", projected: 65, actual: 75 },
                { month: "APR", projected: 60, actual: 58 },
                { month: "MAY", projected: 70, actual: 85 },
                { month: "JUN", projected: 75, actual: 65 }
              ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", height: "130px" }}>
                    <div style={{ width: "14px", height: `${item.projected}%`, backgroundColor: "#93c5fd", borderRadius: "2px 2px 0 0" }} />
                    <div style={{ width: "14px", height: `${item.actual}%`, backgroundColor: "#2563eb", borderRadius: "2px 2px 0 0" }} />
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", fontWeight: "600" }}>{item.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Split Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {/* Budget Item List */}
          <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "rgb(var(--color-text))", marginBottom: "1.25rem" }}>
              Budget Item
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                  <span style={{ fontWeight: "700", color: "rgb(var(--color-text))" }}>SaaS Subscriptions</span>
                  <span style={{ fontWeight: "700", color: "rgb(var(--color-text))" }}>₦2.4M</span>
                </div>
                <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", marginBottom: "0.35rem" }}>
                  <div style={{ width: "75%", height: "100%", backgroundColor: "#2563eb", borderRadius: "3px" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                  <span style={{ color: "rgb(var(--color-text-muted))" }}>75% used</span>
                  <span style={{ color: "#ef4444", fontWeight: "600" }}>+12% vs last month</span>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                  <span style={{ fontWeight: "700", color: "rgb(var(--color-text))" }}>Hardware Procurement</span>
                  <span style={{ fontWeight: "700", color: "rgb(var(--color-text))" }}>₦1.1M</span>
                </div>
                <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", marginBottom: "0.35rem" }}>
                  <div style={{ width: "45%", height: "100%", backgroundColor: "#2563eb", borderRadius: "3px" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                  <span style={{ color: "rgb(var(--color-text-muted))" }}>45% used</span>
                  <span style={{ color: "#10b981", fontWeight: "600" }}>-5% vs last month</span>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                  <span style={{ fontWeight: "700", color: "rgb(var(--color-text))" }}>Consulting & Support</span>
                  <span style={{ fontWeight: "700", color: "rgb(var(--color-text))" }}>₦500k</span>
                </div>
                <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", marginBottom: "0.35rem" }}>
                  <div style={{ width: "92%", height: "100%", backgroundColor: "#2563eb", borderRadius: "3px" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                  <span style={{ color: "rgb(var(--color-text-muted))" }}>92% used</span>
                  <span style={{ color: "rgb(var(--color-text-muted))", fontWeight: "600" }}>Stable</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent High-Value Requests */}
          <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>Recent High-Value Requests</h3>
              <span style={{ fontSize: "0.8rem", color: "#3b82f6", fontWeight: "600", cursor: "pointer" }}>View All</span>
            </div>

            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>REQUEST DETAILS</th>
                  <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>STATUS</th>
                  <th style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", textAlign: "right" }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <td style={{ padding: "0.85rem 0" }}>
                    <div style={{ fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}>AWS Cloud Infrastructure</div>
                    <div style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>Requested by: Emeka Nnamdi</div>
                  </td>
                  <td>
                    <span className="badge badge-paid" style={{ fontSize: "0.7rem" }}>APPROVED</span>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}>
                    ₦850,000
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <td style={{ padding: "0.85rem 0" }}>
                    <div style={{ fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}>MacBook Pro M3 Max (5 Units)</div>
                    <div style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>Requested by: Sarah Alabi</div>
                  </td>
                  <td>
                    <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>PENDING</span>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}>
                    ₦12,500,000
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <td style={{ padding: "0.85rem 0" }}>
                    <div style={{ fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}>Salesforce Enterprise Renewal</div>
                    <div style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>Requested by: IT Procurement</div>
                  </td>
                  <td>
                    <span className="badge badge-draft" style={{ fontSize: "0.7rem" }}>REVIEWING</span>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}>
                    ₦4,200,000
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "0.85rem 0" }}>
                    <div style={{ fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}>Cybersecurity Audit Fees</div>
                    <div style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>Requested by: Security Team</div>
                  </td>
                  <td>
                    <span className="badge badge-paid" style={{ fontSize: "0.7rem" }}>APPROVED</span>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.85rem" }}>
                    ₦1,800,000
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DEPARTMENTAL SPEND OVERVIEW VIEW
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
              <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>₦500,000,000</div>
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
              <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>₦34,642,300</div>
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
              <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>14</div>
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
              <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>6</div>
            </div>
          </div>
        </div>
      </div>

      {/* Department Overview Table Card */}
      <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>Department Overview</h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button style={{ padding: "0.4rem 0.6rem", background: "none", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "0.375rem", color: "rgb(var(--color-text-muted))" }}>
              <Icons.SlidersHorizontal size={14} />
            </button>
            <button style={{ padding: "0.4rem 0.6rem", background: "none", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "0.375rem", color: "rgb(var(--color-text-muted))" }}>
              <Icons.ListFilter size={14} />
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
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
                  <tr key={d.id || idx} style={{ borderBottom: "1px solid rgba(var(--color-card-border), 0.5)" }}>
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
                        <div style={{ width: "100%", height: "5px", backgroundColor: "rgba(var(--color-card-border), 0.6)", borderRadius: "2px" }}>
                          <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", backgroundColor: isHighPct ? "#EF4444" : "#2563EB", borderRadius: "2px" }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem" }}>
                      {d.usersCount}
                    </td>
                    <td>
                      <span className={`badge ${d.isActive !== false ? "badge-paid" : "badge-draft"}`} style={{ fontSize: "0.7rem" }}>
                        {d.isActive !== false ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                        {/* Edit Button */}
                        <button
                          onClick={() => onOpenEditDept(d)}
                          title="Edit Department"
                          style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", padding: "0.25rem" }}
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
                        {/* Delete Button */}
                        <button
                          onClick={() => onOpenDeleteDept(d)}
                          title="Delete Department"
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.25rem" }}
                        >
                          <Icons.Trash2 size={16} />
                        </button>
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

      {/* Bottom Section: Budget Trends & Efficiency Score Card */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem" }}>
        {/* Budget Trends by Quarter */}
        <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "rgb(var(--color-card))", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>Budget Trends by Quarter</h3>
            <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ width: "10px", height: "10px", backgroundColor: "#2563eb", borderRadius: "2px" }} /> Budgeted
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ width: "10px", height: "10px", backgroundColor: "#93c5fd", borderRadius: "2px" }} /> Utilized
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: "160px", paddingTop: "1rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
            {[
              { quarter: "Q1", pct: 40 },
              { quarter: "Q2", pct: 75 },
              { quarter: "Q3", pct: 68 },
              { quarter: "Q4 (Projected)", pct: 95 }
            ].map((q, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "65px", height: `${q.pct}%`, backgroundColor: "#2563eb", borderRadius: "4px 4px 0 0", position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", backgroundColor: "rgba(147, 197, 253, 0.4)", borderRadius: "4px 4px 0 0" }} />
                </div>
                <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", fontWeight: "600" }}>{q.quarter}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Efficiency Score Blue Card */}
        <div style={{
          backgroundColor: "#2563eb",
          borderRadius: "0.75rem",
          padding: "1.75rem",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.4)"
        }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem" }}>Efficiency Score</h3>
            <p style={{ fontSize: "0.82rem", color: "#bfdbfe", lineHeight: "1.4" }}>
              Based on request throughput and budget alignment.
            </p>
          </div>

          {/* Radial score simulation */}
          <div style={{
            width: "130px",
            height: "130px",
            borderRadius: "50%",
            border: "8px solid rgba(255, 255, 255, 0.3)",
            borderTopColor: "#ffffff",
            borderRightColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "1.5rem auto",
            fontSize: "2.2rem",
            fontWeight: "800",
            color: "#ffffff"
          }}>
            8.4
          </div>
        </div>
      </div>
    </div>
  );
};
