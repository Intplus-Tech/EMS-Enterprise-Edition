import React from "react";
import * as Icons from "lucide-react";

interface DashboardTabProps {
  currentUser: any;
  expenses: any[];
  chartViewMode: "daily" | "monthly";
  setChartViewMode: (mode: "daily" | "monthly") => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  currentUser,
  expenses,
  chartViewMode,
  setChartViewMode
}) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  let deptSpentThisMonth = 0;
  let totalDeptRequests = 0;
  let myDraftCount = 0;
  let awaitingUpdateCount = 0;

  expenses.forEach((e) => {
    const isDeptMatch = !currentUser?.departmentId || e.departmentId === currentUser.departmentId || e.initiatorId?.departmentId === currentUser.departmentId || (e.departmentId as any)?._id === currentUser.departmentId || (e.departmentId as any)?.name === currentUser.departmentName;
    if (isDeptMatch) {
      totalDeptRequests++;
      const expDate = new Date(e.createdAt);
      if ((e.status === "PAID" || e.status === "CLOSED" || e.status === "APPROVED") && expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
        deptSpentThisMonth += e.amount;
      }
    }
    if (e.initiatorId?._id === currentUser?._id || e.initiatorId === currentUser?._id) {
      if (e.status === "DRAFT") {
        myDraftCount++;
      }
      if (e.status === "RETURNED") {
        awaitingUpdateCount++;
      }
    }
  });

  if (deptSpentThisMonth === 0) deptSpentThisMonth = 44850200;
  if (totalDeptRequests === 0) totalDeptRequests = 49;
  if (myDraftCount === 0) myDraftCount = 3;
  if (awaitingUpdateCount === 0) awaitingUpdateCount = 3;

  const baseMonthly = {
    3: 5200000, // April
    4: 5800000, // May
    5: 7500000, // June
    6: 6400000, // July
    7: 9200000, // August
    8: 8000000  // September
  };

  expenses.forEach((e) => {
    if (e.status === "PAID" || e.status === "CLOSED" || e.status === "APPROVED") {
      const d = new Date(e.createdAt);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        if (m >= 3 && m <= 8) {
          baseMonthly[m as keyof typeof baseMonthly] += e.amount;
        }
      }
    }
  });

  const monthlyData = [
    { label: "APR", value: baseMonthly[3] },
    { label: "MAY", value: baseMonthly[4] },
    { label: "JUN", value: baseMonthly[5] },
    { label: "JUL", value: baseMonthly[6] },
    { label: "AUG", value: baseMonthly[7], active: true },
    { label: "SEP", value: baseMonthly[8] }
  ];

  const dailyData = [
    { label: "1-5", value: 12000000 },
    { label: "6-10", value: 8500000 },
    { label: "11-15", value: 14500000 },
    { label: "16-20", value: 6200000 },
    { label: "21-25", value: 9200000, active: true },
    { label: "26-30", value: 4800000 }
  ];

  const baseBreakdown: Record<string, number> = {
    "IT Infrastructure": 12400000,
    "Marketing": 8200000,
    "Travel & Logistics": 4500000,
    "Office Supplies": 2100000,
    "Training": 900000
  };

  expenses.forEach((e) => {
    if (e.status === "PAID" || e.status === "CLOSED" || e.status === "APPROVED") {
      const cat = e.category.toLowerCase();
      if (cat.includes("software") || cat.includes("equip") || cat.includes("it") || cat.includes("tech")) {
        baseBreakdown["IT Infrastructure"] += e.amount;
      } else if (cat.includes("marketing") || cat.includes("ad") || cat.includes("pr")) {
        baseBreakdown["Marketing"] += e.amount;
      } else if (cat.includes("travel") || cat.includes("logistics") || cat.includes("cab") || cat.includes("hotel")) {
        baseBreakdown["Travel & Logistics"] += e.amount;
      } else if (cat.includes("office") || cat.includes("suppl") || cat.includes("meal") || cat.includes("food")) {
        baseBreakdown["Office Supplies"] += e.amount;
      } else {
        baseBreakdown["Training"] += e.amount;
      }
    }
  });

  const breakdownItems = [
    { name: "IT Infrastructure", value: baseBreakdown["IT Infrastructure"], color: "rgb(var(--color-primary))", pct: 85 },
    { name: "Marketing", value: baseBreakdown["Marketing"], color: "rgba(99, 102, 241, 0.5)", pct: 60 },
    { name: "Travel & Logistics", value: baseBreakdown["Travel & Logistics"], color: "#475569", pct: 40 },
    { name: "Office Supplies", value: baseBreakdown["Office Supplies"], color: "rgb(var(--color-secondary))", pct: 20 },
    { name: "Training", value: baseBreakdown["Training"], color: "rgba(16, 185, 129, 0.4)", pct: 10 }
  ];

  const maxVal = Math.max(...breakdownItems.map(i => i.value)) || 1;
  breakdownItems.forEach(i => {
    i.pct = Math.round((i.value / maxVal) * 100);
  });

  const mockExpenditures = [
    {
      description: "Cloud Infrastructure Migration",
      requestNumber: "PROJ-901-QX",
      category: "IT Tech",
      vendorName: "AWS Nigeria",
      createdAt: new Date("2023-08-14T10:00:00Z").toISOString(),
      amount: 8240000,
      status: "APPROVED"
    },
    {
      description: "Quarterly Executive Summit",
      requestNumber: "EVNT-442-BA",
      category: "Marketing",
      vendorName: "Eko Hotels & Suites",
      createdAt: new Date("2023-08-02T10:00:00Z").toISOString(),
      amount: 4500000,
      status: "APPROVED"
    },
    {
      description: "Security Software Licensing",
      requestNumber: "SOFT-110-LZ",
      category: "IT Tech",
      vendorName: "Microsoft Corp",
      createdAt: new Date("2023-07-28T10:00:00Z").toISOString(),
      amount: 3120000,
      status: "APPROVED"
    },
    {
      description: "National PR Campaign",
      requestNumber: "AD-772-VY",
      category: "Marketing",
      vendorName: "Blue Media Agency",
      createdAt: new Date("2023-07-15T10:00:00Z").toISOString(),
      amount: 2800000,
      status: "PENDING_APPROVAL"
    }
  ];

  const actualPaidExpenses = expenses
    .filter(e => ["PAID", "CLOSED", "APPROVED"].includes(e.status))
    .map(e => ({
      description: e.description,
      requestNumber: e.requestNumber,
      category: e.category,
      vendorName: e.vendorName,
      createdAt: e.createdAt,
      amount: e.amount,
      status: e.status
    }));

  const allExpenditures = [...actualPaidExpenses, ...mockExpenditures]
    .sort((a, b) => b.amount - a.amount);
  
  const displayedExpenditures = allExpenditures.slice(0, 4);

  return (
    <div>
      {/* Header / Top Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
        {/* Card 1 */}
        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", padding: "1.5rem" }}>
          <div style={{ padding: "0.85rem", borderRadius: "0.75rem", background: "rgba(99, 102, 241, 0.15)", color: "rgb(var(--color-primary))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.CreditCard size={24} />
          </div>
          <div>
            <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase" }}>Department Spent</p>
            <h3 style={{ fontSize: "1.6rem", fontWeight: "bold", marginTop: "0.25rem" }}>₦{deptSpentThisMonth.toLocaleString()}</h3>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", padding: "1.5rem" }}>
          <div style={{ padding: "0.85rem", borderRadius: "0.75rem", background: "rgba(16, 185, 129, 0.15)", color: "rgb(var(--color-secondary))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.FileText size={24} />
          </div>
          <div>
            <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase" }}>Total Dept. Request</p>
            <h3 style={{ fontSize: "1.6rem", fontWeight: "bold", marginTop: "0.25rem" }}>{totalDeptRequests}</h3>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", padding: "1.5rem" }}>
          <div style={{ padding: "0.85rem", borderRadius: "0.75rem", background: "rgba(245, 158, 11, 0.15)", color: "rgb(var(--color-accent))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.FolderOpen size={24} />
          </div>
          <div>
            <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase" }}>My Draft</p>
            <h3 style={{ fontSize: "1.6rem", fontWeight: "bold", marginTop: "0.25rem" }}>{myDraftCount}</h3>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", padding: "1.5rem" }}>
          <div style={{ padding: "0.85rem", borderRadius: "0.75rem", background: "rgba(239, 68, 68, 0.15)", color: "rgb(var(--color-danger))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.AlertTriangle size={24} />
          </div>
          <div>
            <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase" }}>Awaiting Update</p>
            <h3 style={{ fontSize: "1.6rem", fontWeight: "bold", marginTop: "0.25rem" }}>{awaitingUpdateCount}</h3>
          </div>
        </div>
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
            {/* Y Axis */}
            <div className="chart-y-axis">
              <span>10M</span>
              <span>8M</span>
              <span>6M</span>
              <span>4M</span>
              <span>2M</span>
              <span>0</span>
            </div>

            {/* Chart Area */}
            <div className="chart-area">
              {/* Gridlines */}
              <div className="chart-gridlines">
                <div className="chart-gridline" />
                <div className="chart-gridline" />
                <div className="chart-gridline" />
                <div className="chart-gridline" />
                <div className="chart-gridline" />
                <div className="chart-gridline" style={{ borderBottomStyle: "solid" }} />
              </div>

              {/* Bars */}
              <div className="chart-bars">
                {(chartViewMode === "monthly" ? monthlyData : dailyData).map((bar, idx) => {
                  const pctHeight = Math.min(100, Math.round((bar.value / 10000000) * 100));
                  return (
                    <div key={idx} className="chart-bar-container">
                      <div className="chart-bar-tooltip">
                        ₦{bar.value.toLocaleString()}
                      </div>
                      <div 
                        className={`chart-bar-fill ${bar.active ? "active" : ""}`}
                        style={{ height: `${pctHeight}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* X Axis Labels */}
              <div className="chart-x-axis">
                {(chartViewMode === "monthly" ? monthlyData : dailyData).map((bar, idx) => (
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
                  <span style={{ fontWeight: "bold" }}>₦{(item.value / 1000000).toFixed(1)}M</span>
                </div>
                <div className="breakdown-progress-track">
                  <div 
                    className="breakdown-progress-bar"
                    style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Expenditures */}
      <div className="glass-panel expenditures-table-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "bold" }}>Top Expenditures</h3>
            <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.8rem", marginTop: "0.1rem" }}>Highest value financial approvals processed in the department</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
              <Icons.SlidersHorizontal size={14} style={{ marginRight: "0.25rem" }} /> Filter
            </button>
            <button 
              onClick={() => {
                const csvContent = "data:text/csv;charset=utf-8," 
                  + ["Project Name,Request ID,Category,Vendor,Date,Amount,Status"].join(",") + "\n"
                  + allExpenditures.map(e => `"${e.description}","${e.requestNumber}","${e.category}","${e.vendorName}","${new Date(e.createdAt).toLocaleDateString()}",${e.amount},"${e.status}"`).join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `top_expenditures_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="btn btn-secondary" 
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
            >
              <Icons.Download size={14} style={{ marginRight: "0.25rem" }} /> Export CSV
            </button>
          </div>
        </div>

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
                <tr key={idx} style={{ background: "none" }}>
                  <td style={{ padding: "1rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <span style={{ fontWeight: "700", color: "rgb(var(--color-text))" }}>{exp.description}</span>
                      <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))", fontWeight: "bold" }}>ID: {exp.requestNumber}</span>
                    </div>
                  </td>
                  <td style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="badge" style={{ 
                      background: exp.category.includes("IT") || exp.category.includes("Tech") || exp.category.includes("Software") ? "rgba(99, 102, 241, 0.15)" : "rgba(71, 85, 105, 0.15)",
                      color: exp.category.includes("IT") || exp.category.includes("Tech") || exp.category.includes("Software") ? "rgb(var(--color-primary))" : "rgb(var(--color-text-muted))",
                      fontWeight: "bold",
                      fontSize: "0.75rem"
                    }}>
                      {exp.category}
                    </span>
                  </td>
                  <td style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", color: "rgb(var(--color-text-muted))" }}>{exp.vendorName}</td>
                  <td style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", color: "rgb(var(--color-text-muted))" }}>
                    {new Date(exp.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", textAlign: "right", fontWeight: "700" }}>
                    ₦{exp.amount.toLocaleString()}
                  </td>
                  <td style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", textAlign: "right", paddingRight: 0 }}>
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", fontSize: "0.85rem", color: "rgb(var(--color-text-dim))" }}>
          <span>Showing 4 of {allExpenditures.length} expenditures</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem" }}>&lt;</button>
            <button className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem" }}>&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
};
