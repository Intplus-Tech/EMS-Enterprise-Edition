import React from "react";
import * as Icons from "lucide-react";

interface ApprovalsTabProps {
  currentUser: any;
  expenses: any[];
  approvalDateFilter: "all" | "today";
  setApprovalDateFilter: (filter: "all" | "today") => void;
  approvalDatePicker: string;
  setApprovalDatePicker: (date: string) => void;
  amountSearchQuery: string;
  setAmountSearchQuery: (query: string) => void;
  setSelectedExpense: (expense: any) => void;
}

export const ApprovalsTab: React.FC<ApprovalsTabProps> = ({
  currentUser,
  expenses,
  approvalDateFilter,
  setApprovalDateFilter,
  approvalDatePicker,
  setApprovalDatePicker,
  amountSearchQuery,
  setAmountSearchQuery,
  setSelectedExpense
}) => {
  const filteredPending = expenses.filter(exp => {
    let roleMatch = false;
    if (currentUser?.role === "FINANCE_HEAD" && exp.status === "PENDING_EXCEPTIONAL") roleMatch = true;
    if (currentUser?.role === "APPROVER" && exp.status === "PENDING_APPROVAL" && exp.currentStepIndex === 0) roleMatch = true;
    if (currentUser?.role === "FINANCE_OFFICER" && exp.status === "SENT_TO_FINANCE") roleMatch = true;
    if (currentUser?.role === "FINANCE_MANAGER" && exp.status === "UPLOADED_TO_BANK") roleMatch = true;
    if (!roleMatch) return false;

    if (amountSearchQuery) {
      const amtStr = exp.amount.toString();
      if (!amtStr.includes(amountSearchQuery) && !exp.amount.toLocaleString().includes(amountSearchQuery)) {
        return false;
      }
    }

    const expDate = new Date(exp.createdAt);
    if (approvalDateFilter === "today") {
      const today = new Date();
      if (expDate.toDateString() !== today.toDateString()) return false;
    }

    if (approvalDatePicker) {
      const pickerDate = new Date(approvalDatePicker);
      if (expDate.toDateString() !== pickerDate.toDateString()) return false;
    }

    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "700" }}>Pending Approval</h2>
          <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.95rem", marginTop: "0.25rem" }}>Review and manage your pending financial actions.</p>
        </div>

        {/* Filters toolbar matching Screenshot 1 */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <button 
            onClick={() => setApprovalDateFilter(approvalDateFilter === "today" ? "all" : "today")}
            className={`btn ${approvalDateFilter === "today" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "0.55rem 1rem", fontSize: "0.85rem", fontWeight: "600" }}
          >
            Today
          </button>

          <div style={{ position: "relative" }}>
            <input
              type="date"
              value={approvalDatePicker}
              onChange={(e) => setApprovalDatePicker(e.target.value)}
              className="form-input"
              style={{ 
                padding: "0.5rem 1rem", 
                fontSize: "0.85rem", 
                fontWeight: "600", 
                background: "rgba(30, 41, 59, 0.45)", 
                borderRadius: "8px",
                width: "150px",
                height: "auto",
                border: "1px solid rgba(255, 255, 255, 0.1)"
              }}
            />
          </div>

          <div style={{ position: "relative", minWidth: "200px" }}>
            <Icons.Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-dim))" }} />
            <input
              type="text"
              placeholder="Search amount..."
              value={amountSearchQuery}
              onChange={(e) => setAmountSearchQuery(e.target.value)}
              className="form-input"
              style={{ 
                padding: "0.5rem 0.5rem 0.5rem 2.25rem", 
                fontSize: "0.85rem", 
                background: "rgba(30, 41, 59, 0.45)", 
                borderRadius: "8px", 
                height: "auto",
                border: "1px solid rgba(255, 255, 255, 0.1)"
              }}
            />
          </div>

          <button 
            onClick={() => {
              const pendingList = expenses.filter(exp => {
                if (currentUser?.role === "FINANCE_HEAD" && exp.status === "PENDING_EXCEPTIONAL") return true;
                if (currentUser?.role === "APPROVER" && exp.status === "PENDING_APPROVAL" && exp.currentStepIndex === 0) return true;
                if (currentUser?.role === "FINANCE_OFFICER" && exp.status === "SENT_TO_FINANCE") return true;
                if (currentUser?.role === "FINANCE_MANAGER" && exp.status === "UPLOADED_TO_BANK") return true;
                return false;
              });
              const csvContent = "data:text/csv;charset=utf-8," 
                + ["Request Number,Initiator,Category,Amount,Date,Status"].join(",") + "\n"
                + pendingList.map(e => `"${e.requestNumber}","${e.initiatorId?.name || "System"}","${e.category}",${e.amount},"${new Date(e.createdAt).toLocaleDateString()}","${e.status}"`).join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `pending_approvals_${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="btn btn-secondary" 
            style={{ padding: "0.6rem", borderRadius: "8px", background: "rgba(30, 41, 59, 0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Icons.Download size={18} />
          </button>
        </div>
      </div>

      {/* List Row Cards instead of Table */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {filteredPending.map((exp) => (
          <div 
            key={exp._id} 
            onClick={() => setSelectedExpense(exp)}
            className="approval-card-row"
          >
            <div className="approval-card-id">
              {exp.requestNumber}
            </div>

            <div className="approval-card-details">
              <span className="approval-card-title">{exp.description}</span>
              <div className="approval-card-subline">
                <span style={{ fontWeight: "700" }}>{exp.category}</span>
                <span>•</span>
                <span>Requested by {exp.initiatorId?.name || "System"}</span>
                <span>•</span>
                <span>{new Date(exp.createdAt).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <p className="approval-card-justification">
                Business purpose: {exp.description} — vendor quote attached. Required date: {new Date(exp.requiredPaymentDate).toLocaleDateString()}.
              </p>
            </div>

            <div className="approval-card-amount">
              ₦{exp.amount.toLocaleString()}
            </div>

            <div className="approval-card-status">
              {(() => {
                let label = "Pending Approval";
                let badgeStyle = { background: "rgba(245, 158, 11, 0.15)", color: "rgb(var(--color-accent))" };
                if (exp.status === "SENT_TO_FINANCE") {
                  label = "Awaiting Finance";
                  badgeStyle = { background: "rgba(59, 130, 246, 0.15)", color: "rgb(var(--color-info))" };
                } else if (exp.status === "PENDING_EXCEPTIONAL") {
                  label = "SLA Alert";
                  badgeStyle = { background: "rgba(239, 68, 68, 0.15)", color: "rgb(var(--color-danger))" };
                } else if (exp.status === "UPLOADED_TO_BANK") {
                  label = "Processing";
                  badgeStyle = { background: "rgba(16, 185, 129, 0.15)", color: "rgb(var(--color-secondary))" };
                }
                return (
                  <span className="badge" style={{ ...badgeStyle, fontWeight: "bold", fontSize: "0.8rem", padding: "0.35rem 0.75rem", borderRadius: "999px" }}>
                    {label}
                  </span>
                );
              })()}
            </div>
          </div>
        ))}

        {filteredPending.length === 0 && (
          <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "rgb(var(--color-text-dim))" }}>
            <Icons.CheckSquare size={48} style={{ color: "rgb(var(--color-secondary))", marginBottom: "1rem" }} />
            <p style={{ fontSize: "1rem", fontWeight: "600" }}>All caught up!</p>
            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>No pending approvals matching the selected filters.</p>
          </div>
        )}

        {filteredPending.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "rgb(var(--color-text-dim))" }}>
            <span>Showing {filteredPending.length} of {filteredPending.length} requests</span>
            <button className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", fontWeight: "600" }}>
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
