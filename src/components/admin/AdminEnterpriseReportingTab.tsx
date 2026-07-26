import React, { useState } from "react";
import * as Icons from "lucide-react";

interface AdminEnterpriseReportingTabProps {
  departments: any[];
  expenses?: any[];
  metrics?: any;
}

export const AdminEnterpriseReportingTab: React.FC<AdminEnterpriseReportingTabProps> = ({
  departments,
  expenses = [],
  metrics
}) => {
  const [period, setPeriod] = useState("Last 30 Days");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedBudgetItem, setSelectedBudgetItem] = useState("ALL");

  const pendingCount = metrics?.pendingRequestsCount ?? expenses.filter(e => e.status?.includes("PENDING")).length;
  const approvedCount = metrics?.approvedCount ?? expenses.filter(e => e.status === "APPROVED").length;
  const rejectedCount = metrics?.rejectedCount ?? expenses.filter(e => e.status === "REJECTED").length;
  const paidCount = metrics?.paidCount ?? expenses.filter(e => e.status === "PAID" || e.status === "CLOSED").length;
  const uploadedCount = metrics?.uploadedCount ?? expenses.filter(e => Boolean(e.supportingDocument)).length;

  const deptUtilization = departments.map((d: any) => {
    const deptExpenses = expenses.filter(e => (e.departmentId?._id || e.departmentId) === (d._id || d.id));
    const spent = deptExpenses.filter(e => ["PAID", "CLOSED", "APPROVED"].includes(e.status)).reduce((sum, e) => sum + (e.amount || 0), 0);
    const budget = d.totalBudget || 250000;
    const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
    return { name: d.name, spent, budget, pct };
  });

  return (
    <div>
      {/* Top Filter Bar */}
      <div className="glass-panel" style={{
        padding: "1rem 1.5rem",
        backgroundColor: "#1e293b",
        borderRadius: "0.75rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.75rem"
      }}>
        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600", marginBottom: "0.25rem" }}>Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{ padding: "0.45rem 0.85rem", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.375rem", color: "#f8fafc", fontSize: "0.85rem", outline: "none" }}
            >
              <option value="Last 30 Days" style={{ background: "#1e293b" }}>Last 30 Days</option>
              <option value="This Quarter" style={{ background: "#1e293b" }}>This Quarter</option>
              <option value="Year to Date" style={{ background: "#1e293b" }}>Year to Date</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600", marginBottom: "0.25rem" }}>Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{ padding: "0.45rem 0.85rem", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.375rem", color: "#f8fafc", fontSize: "0.85rem", outline: "none" }}
            >
              <option value="ALL" style={{ background: "#1e293b" }}>All Departments</option>
              {departments.map((d: any) => (
                <option key={d._id || d.id} value={d._id || d.id} style={{ background: "#1e293b" }}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600", marginBottom: "0.25rem" }}>Budget Items</label>
            <select
              value={selectedBudgetItem}
              onChange={(e) => setSelectedBudgetItem(e.target.value)}
              style={{ padding: "0.45rem 0.85rem", backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.375rem", color: "#f8fafc", fontSize: "0.85rem", outline: "none" }}
            >
              <option value="ALL" style={{ background: "#1e293b" }}>All Budget Items</option>
              <option value="TRAVEL" style={{ background: "#1e293b" }}>Travel & Flights</option>
              <option value="SAAS" style={{ background: "#1e293b" }}>SaaS Subscriptions</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => alert("Exporting Enterprise Report CSV/PDF...")}
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
        <div className="glass-panel" style={{ padding: "1.25rem", backgroundColor: "#1e293b", borderRadius: "0.75rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.Clock size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>PENDING</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#f8fafc" }}>{pendingCount}</div>
          </div>
        </div>

        {/* APPROVED */}
        <div className="glass-panel" style={{ padding: "1.25rem", backgroundColor: "#1e293b", borderRadius: "0.75rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.CheckCircle2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>APPROVED</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#f8fafc" }}>{approvedCount}</div>
          </div>
        </div>

        {/* REJECTED */}
        <div className="glass-panel" style={{ padding: "1.25rem", backgroundColor: "#1e293b", borderRadius: "0.75rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.XCircle size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>REJECTED</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#f8fafc" }}>{rejectedCount}</div>
          </div>
        </div>

        {/* PAID */}
        <div className="glass-panel" style={{ padding: "1.25rem", backgroundColor: "#1e293b", borderRadius: "0.75rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "rgba(99, 102, 241, 0.15)", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.Banknote size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>PAID</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#f8fafc" }}>{paidCount}</div>
          </div>
        </div>

        {/* UPLOADED */}
        <div className="glass-panel" style={{ padding: "1.25rem", backgroundColor: "#1e293b", borderRadius: "0.75rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "rgba(139, 92, 246, 0.15)", color: "#a78bfa", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.Upload size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>UPLOADED</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#f8fafc" }}>{uploadedCount}</div>
          </div>
        </div>
      </div>

      {/* Middle Row Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Card 1: Budget Utilization */}
        <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#f8fafc" }}>Budget Utilization</h3>
            <Icons.TrendingUp size={16} style={{ color: "#94a3b8" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {deptUtilization.map((d: any, idx: number) => (
              <div key={idx}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: "600", color: "#f8fafc" }}>{d.name}</span>
                  <span style={{ color: "#94a3b8" }}>₦ {d.spent.toLocaleString()} / ₦ {(d.budget / 1000000).toFixed(1)}M ({d.pct}%)</span>
                </div>
                <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: "3px" }}>
                  <div style={{ width: `${d.pct}%`, height: "100%", backgroundColor: d.pct > 90 ? "#ef4444" : "#2563eb", borderRadius: "3px" }} />
                </div>
              </div>
            ))}
            {deptUtilization.length === 0 && (
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>No department budget utilization recorded.</p>
            )}
          </div>
        </div>

        {/* Card 2: Request Status Breakdown */}
        <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#f8fafc", marginBottom: "1.25rem" }}>
            Request Status Breakdown
          </h3>

          {/* Donut Chart */}
          <div style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            border: "12px solid #2563eb",
            borderRightColor: "#93c5fd",
            borderBottomColor: "#64748b",
            borderLeftColor: "#ef4444",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem auto"
          }}>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#f8fafc" }}>91</div>
            <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600" }}>TOTAL</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.78rem" }}>
            <span style={{ color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#2563eb" }} /> Approved (34)
            </span>
            <span style={{ color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#93c5fd" }} /> Paid (29)
            </span>
            <span style={{ color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#64748b" }} /> Pending (12)
            </span>
            <span style={{ color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444" }} /> Rejected (8)
            </span>
          </div>
        </div>

        {/* Card 3: Budget Balance */}
        <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#f8fafc", marginBottom: "1.25rem" }}>
            Budget Balance
          </h3>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", textTransform: "uppercase" }}>
                <th style={{ textAlign: "left", paddingBottom: "0.5rem", fontSize: "0.7rem", color: "#94a3b8" }}>DEPT</th>
                <th style={{ textAlign: "right", paddingBottom: "0.5rem", fontSize: "0.7rem", color: "#94a3b8" }}>REMAINING (₦)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "0.75rem 0", color: "#f8fafc", fontWeight: "600" }}>Engineering</td>
                <td style={{ textAlign: "right", fontWeight: "700", color: "#f8fafc" }}>₦ 800,000</td>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "0.75rem 0", color: "#f8fafc", fontWeight: "600" }}>Marketing</td>
                <td style={{ textAlign: "right", fontWeight: "700", color: "#f8fafc" }}>₦ 1,200,000</td>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "0.75rem 0", color: "#f8fafc", fontWeight: "600" }}>Operations</td>
                <td style={{ textAlign: "right", fontWeight: "700", color: "#ef4444" }}>₦ 100,000</td>
              </tr>
              <tr>
                <td style={{ padding: "0.75rem 0", color: "#f8fafc", fontWeight: "600" }}>HR & Talent</td>
                <td style={{ textAlign: "right", fontWeight: "700", color: "#f8fafc" }}>₦ 650,000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Lower Middle Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Exceptional Approvals Granted */}
        <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#f8fafc" }}>Exceptional Approvals Granted</h3>
              <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.15rem" }}>Volume of out-of-policy requests approved by month</p>
            </div>
            <span style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#f87171", borderRadius: "0.375rem", padding: "0.3rem 0.6rem", fontSize: "0.7rem", fontWeight: "700" }}>
              High Variance Detected
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: "140px", paddingTop: "1rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, idx) => (
              <span key={idx} style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600" }}>{m}</span>
            ))}
          </div>
        </div>

        {/* Top Budget Item */}
        <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#f8fafc", marginBottom: "1.25rem" }}>
            Top Budget Item
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "0.5rem", backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icons.Plane size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.85rem" }}>Travel & Flights</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>24 Requests</div>
                </div>
              </div>
              <span style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.9rem" }}>₦ 1.2M</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "0.5rem", backgroundColor: "rgba(139, 92, 246, 0.15)", color: "#a78bfa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icons.Cloud size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.85rem" }}>SaaS Subscriptions</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>18 Requests</div>
                </div>
              </div>
              <span style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.9rem" }}>₦ 850k</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "0.5rem", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icons.Utensils size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.85rem" }}>Client Entertainment</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>12 Requests</div>
                </div>
              </div>
              <span style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.9rem" }}>₦ 420k</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "0.5rem", backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icons.Printer size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.85rem" }}>Office Supplies</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>32 Requests</div>
                </div>
              </div>
              <span style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.9rem" }}>₦ 180k</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Requesters (by Volume) */}
      <div className="glass-panel" style={{ padding: "1.5rem", backgroundColor: "#1e293b", borderRadius: "0.75rem" }}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#f8fafc", marginBottom: "1.25rem" }}>
          Top Requesters (by Volume)
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
          <div style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "0.5rem", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#ffffff", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>AT</div>
              <div>
                <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.85rem" }}>Adewale Tinubu</div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Engineering</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: "800", color: "#f8fafc", fontSize: "0.9rem" }}>₦640,400</div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>14 Requests</div>
            </div>
          </div>

          <div style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "0.5rem", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#6366f1", color: "#ffffff", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>CO</div>
              <div>
                <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.85rem" }}>Chioma Okeke</div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Marketing</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: "800", color: "#f8fafc", fontSize: "0.9rem" }}>₦320,000</div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>11 Requests</div>
            </div>
          </div>

          <div style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "0.5rem", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#10b981", color: "#ffffff", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>BO</div>
              <div>
                <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.85rem" }}>Blessing Okafor</div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Operations</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: "800", color: "#f8fafc", fontSize: "0.9rem" }}>₦890,000</div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>9 Requests</div>
            </div>
          </div>

          <div style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "0.5rem", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#f59e0b", color: "#ffffff", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>FM</div>
              <div>
                <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "0.85rem" }}>Fatima Musa</div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Sales</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: "800", color: "#f8fafc", fontSize: "0.9rem" }}>₦210,000</div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>8 Requests</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
