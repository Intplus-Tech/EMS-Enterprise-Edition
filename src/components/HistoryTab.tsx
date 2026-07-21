import React from "react";
import * as Icons from "lucide-react";

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
  const historical = expenses.filter(e => {
    // Gather history statuses
    const isHistory = ["PAID", "CLOSED", "REJECTED", "CANCELLED", "APPROVED"].includes(e.status);
    if (!isHistory) return false;

    // Gated to user role or department if Approver
    const inDept = currentUser?.role === "INITIATOR"
      ? e.initiatorId?._id === currentUser?._id
      : (currentUser?.role === "ADMIN" || e.departmentId === currentUser?.departmentId || e.initiatorId?.departmentId === currentUser?.departmentId || (e.departmentId as any)?.name === currentUser?.departmentName);
    if (!inDept) return false;

    // Filter by category
    if (historyFilterCategory !== "ALL" && e.category !== historyFilterCategory) return false;

    // Filter by status dropdown
    if (historyFilterStatus !== "ALL" && e.status !== historyFilterStatus) return false;

    // Filter by search query
    const matchesSearch = e.description.toLowerCase().includes(historySearchQuery.toLowerCase()) || e.requestNumber.toLowerCase().includes(historySearchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Filter by sub-tab (all vs approved/paid vs rejected/cancelled)
    if (historySubTab === "approved") {
      return ["PAID", "CLOSED", "APPROVED"].includes(e.status);
    }
    if (historySubTab === "rejected") {
      return ["REJECTED", "CANCELLED"].includes(e.status);
    }

    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2>Request History</h2>
          <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.95rem" }}>View finalized or archived expense requests.</p>
        </div>

        {/* Top Filters Bar */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Category Filter */}
          <select
            value={historyFilterCategory}
            onChange={(e) => setHistoryFilterCategory(e.target.value)}
            className="form-select"
            style={{ width: "150px", background: "rgba(30, 41, 59, 0.45)", borderRadius: "8px", fontSize: "0.85rem", padding: "0.5rem" }}
          >
            <option value="ALL">All Categories</option>
            <option value="Travel">Travel</option>
            <option value="Software">Software</option>
            <option value="Marketing">Marketing</option>
            <option value="Office Equipment">Office Equipment</option>
            <option value="Meals">Meals</option>
          </select>

          {/* Status Filter */}
          <select
            value={historyFilterStatus}
            onChange={(e) => setHistoryFilterStatus(e.target.value)}
            className="form-select"
            style={{ width: "150px", background: "rgba(30, 41, 59, 0.45)", borderRadius: "8px", fontSize: "0.85rem", padding: "0.5rem" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="CLOSED">Closed</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Search query */}
          <div style={{ position: "relative", minWidth: "200px" }}>
            <Icons.Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-dim))" }} />
            <input
              type="text"
              placeholder="Search history..."
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "2.25rem", fontSize: "0.85rem", padding: "0.5rem 0.5rem 0.5rem 2.25rem", background: "rgba(30, 41, 59, 0.45)", borderRadius: "8px", height: "auto" }}
            />
          </div>
        </div>
      </div>

      {/* Sub-Tabs for History (All Requests, Approved, Rejected) */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "1.5rem" }}>
        {[
          { id: "all", label: "All Requests" },
          { id: "approved", label: "Approved" },
          { id: "rejected", label: "Rejected" }
        ].map(subTab => (
          <button
            key={subTab.id}
            onClick={() => setHistorySubTab(subTab.id as any)}
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
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {historical.length > 0 ? historical.map((exp) => (
                <tr key={exp._id}>
                  <td><strong>{exp.requestNumber}</strong></td>
                  <td>{exp.category}</td>
                  <td>{exp.description}</td>
                  <td>₦{exp.amount.toLocaleString()}</td>
                  <td>{new Date(exp.createdAt).toLocaleDateString()}</td>
                  <td>
                    {(() => {
                      let badgeClass = "badge-pending";
                      if (["PAID", "APPROVED", "CLOSED"].includes(exp.status)) badgeClass = "badge-approved";
                      else if (["REJECTED", "CANCELLED"].includes(exp.status)) badgeClass = "badge-danger";
                      return <span className={`badge ${badgeClass}`}>{exp.status}</span>;
                    })()}
                  </td>
                  <td>
                    <button onClick={() => setSelectedExpense(exp)} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                      View Details
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "rgb(var(--color-text-dim))", padding: "2rem" }}>
                    No completed requests found in history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
