import React, { useState, useEffect } from "react";
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
  selectedExpense?: any;
  loadDashboardData?: (user: any) => Promise<void>;
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
  setSelectedExpense,
  selectedExpense,
  loadDashboardData
}) => {
  // Finance sub-tabs: 'new', 'processing', 'completed'
  const [activeSubTab, setActiveSubTab] = useState<"new" | "processing" | "completed">("processing");
  const [showClarificationForm, setShowClarificationForm] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState("");
  const [directedTo, setDirectedTo] = useState("Initiator");
  const [markAsUrgent, setMarkAsUrgent] = useState(false);
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);
  const [timelineMessages, setTimelineMessages] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Initialize mockup conversation timeline or load from history when selectedExpense changes
  useEffect(() => {
    if (selectedExpense) {
      const dbHistory = selectedExpense.history || [];
      if (dbHistory.length > 0) {
        const mapped = dbHistory.map((h: any) => ({
          sender: h.actorRole === "INITIATOR" ? "Initiator" : "Dept Head",
          senderName: h.actorName,
          time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          message: h.comment || h.action
        }));
        setTimelineMessages(mapped);
      } else {
        // Fallback placeholder conversation matching mockup
        setTimelineMessages([
          {
            sender: "Initiator",
            senderName: selectedExpense.initiatorId?.name || "James Okafor",
            time: "09:12 AM",
            message: "Please find the invoice for the Q3 Server maintenance attached."
          },
          {
            sender: "Dept Head",
            senderName: "Sarah Williams",
            time: "11:45 AM",
            message: "The amount is slightly above the usual maintenance fee. Please provide further justification for the 15% increase."
          },
          {
            sender: "Initiator",
            senderName: selectedExpense.initiatorId?.name || "James Okafor",
            time: "02:30 PM",
            message: "The increase is due to the emergency replacement of the cooling fans which were not in the initial quote. Justification document uploaded."
          },
          {
            sender: "Dept Head",
            senderName: "Sarah Williams",
            time: "04:15 PM",
            message: "“Justification accepted. Urgent maintenance confirmed. Approved for Finance processing.” — Dept Head"
          }
        ]);
      }
    }
  }, [selectedExpense]);

  // Handler for custom actions (Approve, Insufficient Budget)
  const handleWorkflowClick = async (actionType: "APPROVE" | "INSUFFICIENT" | "CLARIFY") => {
    if (!selectedExpense || submittingAction) return;
    setSubmittingAction(true);

    try {
      if (actionType === "APPROVE") {
        if (currentUser?.role === "FINANCE_OFFICER") {
          // Verify & Upload to Bank Platform
          const res = await fetch(`/api/expenses/${selectedExpense._id}/upload`, { method: "POST" });
          const data = await res.json();
          if (data.success) {
            alert("Expense verified and instruction uploaded to Bank Platform successfully.");
            setSelectedExpense(null);
            if (loadDashboardData) await loadDashboardData(currentUser);
          } else {
            alert(data.error || "Action failed.");
          }
        } else if (currentUser?.role === "FINANCE_HEAD") {
          // Authorize budget expansion
          const res = await fetch(`/api/expenses/${selectedExpense._id}/exceptional`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "APPROVE", comment: "Approved exceptional budget" })
          });
          const data = await res.json();
          if (data.success) {
            alert("Exceptional budget expansion approved successfully.");
            setSelectedExpense(null);
            if (loadDashboardData) await loadDashboardData(currentUser);
          } else {
            alert(data.error || "Action failed.");
          }
        } else if (currentUser?.role === "FINANCE_MANAGER") {
          // Release payment
          const ref = "TXN-" + Math.floor(Math.random() * 90000000 + 10000000) + "-RELEASE";
          const res = await fetch(`/api/expenses/${selectedExpense._id}/release`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference: ref })
          });
          const data = await res.json();
          if (data.success) {
            alert(`Payment released successfully. Reference: ${ref}`);
            setSelectedExpense(null);
            if (loadDashboardData) await loadDashboardData(currentUser);
          } else {
            alert(data.error || "Action failed.");
          }
        }
      } else if (actionType === "INSUFFICIENT") {
        // Return request with insufficient budget status
        const comment = "Returned due to insufficient departmental budget.";
        let endpoint = `/api/expenses/${selectedExpense._id}/workflow`;
        let payload: any = { action: "RETURN", comment };

        if (currentUser?.role === "FINANCE_HEAD") {
          endpoint = `/api/expenses/${selectedExpense._id}/exceptional`;
          payload = { action: "RETURN", comment };
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          alert("Request returned to initiator due to insufficient budget.");
          setSelectedExpense(null);
          if (loadDashboardData) await loadDashboardData(currentUser);
        } else {
          alert(data.error || "Action failed.");
        }
      } else if (actionType === "CLARIFY") {
        if (!clarificationQuestion.trim()) {
          alert("Please input your question/clarification text.");
          setSubmittingAction(false);
          return;
        }

        const comment = `[Clarification Required - Directed to ${directedTo}${markAsUrgent ? ' - URGENT' : ''}]: ${clarificationQuestion}`;
        let endpoint = `/api/expenses/${selectedExpense._id}/workflow`;
        let payload: any = { action: "RETURN", comment };

        if (currentUser?.role === "FINANCE_HEAD") {
          endpoint = `/api/expenses/${selectedExpense._id}/exceptional`;
          payload = { action: "RETURN", comment };
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          alert("Clarification request sent to the requester successfully.");
          setShowClarificationForm(false);
          setClarificationQuestion("");
          setSelectedExpense(null);
          if (loadDashboardData) await loadDashboardData(currentUser);
        } else {
          alert(data.error || "Action failed.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred. Please try again.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Timeline comment sender
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedExpense) return;

    try {
      const mappedMsg = {
        sender: currentUser.role === "INITIATOR" ? "Initiator" : "Dept Head",
        senderName: currentUser.name,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        message: newComment
      };
      setTimelineMessages(prev => [...prev, mappedMsg]);
      setNewComment("");
    } catch (err) {
      console.error(err);
    }
  };

  // Grouping expense items based on Finance views
  const newRequests = expenses.filter(e => e.status === "SENT_TO_FINANCE" || e.status === "APPROVED");
  
  const processingRequests = expenses.filter(e => [
    "UPLOADED_TO_BANK", "PENDING_EXCEPTIONAL", "INSUFFICIENT_BUDGET", "RETURNED", "BUDGET_CHECK", "PENDING_APPROVAL"
  ].includes(e.status));

  const completedRequests = expenses.filter(e => [
    "PAID", "CLOSED", "REJECTED", "CANCELLED"
  ].includes(e.status));

  // Determine active list & count labels
  let currentList = processingRequests;
  if (activeSubTab === "new") currentList = newRequests;
  if (activeSubTab === "completed") currentList = completedRequests;

  // Apply filters/search to the current sub-tab list
  const filteredList = currentList.filter(exp => {
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

  // Department spend calculation helper
  const deptExpenses = expenses.filter(e => {
    const dId = selectedExpense?.departmentId?._id || selectedExpense?.departmentId;
    return e.departmentId?._id === dId || e.departmentId === dId;
  });
  
  const totalDeptSpend = deptExpenses
    .filter(e => ["PAID", "CLOSED", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK"].includes(e.status))
    .reduce((sum, e) => sum + e.amount, 0) || 545000;

  // RENDER DETAILED REQUEST PROFILE PAGE
  if (selectedExpense) {
    return (
      <div style={{ padding: "0.25rem 0" }}>
        {/* Back Link and Action Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <button 
              onClick={() => { setSelectedExpense(null); setShowClarificationForm(false); }} 
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1.25rem", fontWeight: "700", padding: 0 }}
            >
              <Icons.ArrowLeft size={20} />
              Request Profile #{selectedExpense.requestNumber}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
              <span className={`badge badge-${selectedExpense.status?.toLowerCase().replace(/_/g, '-')}`} style={{ fontWeight: "700" }}>
                {selectedExpense.status === "SENT_TO_FINANCE" ? "APPROVED BY DEPT HEAD" : selectedExpense.status?.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>
                Submitted on {new Date(selectedExpense.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button 
              onClick={() => handleWorkflowClick("INSUFFICIENT")}
              className="btn" 
              style={{ borderColor: "#EF4444", color: "#EF4444", background: "transparent", borderWidth: "1.5px" }}
              disabled={submittingAction}
            >
              Insufficient Budget
            </button>
            <button 
              onClick={() => setShowClarificationForm(true)}
              className="btn" 
              style={{ borderColor: "#3B82F6", color: "#3B82F6", background: "transparent", borderWidth: "1.5px" }}
              disabled={submittingAction}
            >
              Request Clarification
            </button>
            <button 
              onClick={() => handleWorkflowClick("APPROVE")}
              className="btn btn-primary"
              style={{ background: "#2563EB", border: "none" }}
              disabled={submittingAction}
            >
              {submittingAction ? "Processing..." : "Approve"}
            </button>
          </div>
        </div>

        {/* 2-Column Details Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "7fr 3fr", gap: "1.5rem" }}>
          
          {/* Left Column (70%) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Request Summary Card */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem", color: "#2563EB" }}>
                <Icons.Info size={20} />
                <h3 style={{ fontSize: "1.05rem", fontWeight: "700", margin: 0 }}>Request Summary</h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", fontSize: "0.9rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <span style={{ color: "rgb(var(--color-text-muted))", display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>Department</span>
                    <strong style={{ fontSize: "0.95rem" }}>{selectedExpense.departmentId?.name || selectedExpense.departmentName || "Technology"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "rgb(var(--color-text-muted))", display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>Initiator</span>
                    <strong style={{ fontSize: "0.95rem" }}>{selectedExpense.initiatorId?.name || "James Okafor"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "rgb(var(--color-text-muted))", display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>Submission Date</span>
                    <strong style={{ fontSize: "0.95rem" }}>{new Date(selectedExpense.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <span style={{ color: "rgb(var(--color-text-muted))", display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>Requested Amount</span>
                    <strong style={{ fontSize: "1.1rem", color: "#2563EB" }}>₦{selectedExpense.amount.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: "rgb(var(--color-text-muted))", display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>Priority</span>
                    <span className="badge" style={{ background: "rgba(99, 102, 241, 0.15)", color: "rgb(var(--color-primary))", fontWeight: "700", padding: "0.25rem 0.6rem", borderRadius: "4px" }}>
                      NORMAL
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Justification Card */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "#2563EB" }}>
                <Icons.FileText size={20} />
                <h3 style={{ fontSize: "1.05rem", fontWeight: "700", margin: 0 }}>Detailed Justification</h3>
              </div>
              <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: "1.6", color: "rgb(var(--color-text-muted))" }}>
                {selectedExpense.description || "The server maintenance fee reflects emergency cooling upgrades inside core transaction platforms. Required to prevent service interrupts ahead of high capacity periods."}
              </p>
            </div>

            {/* Collapsible Message History Card */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#2563EB" }}>
                  <Icons.MessageSquare size={20} />
                  <h3 style={{ fontSize: "1.05rem", fontWeight: "700", margin: 0 }}>Message History</h3>
                  <span style={{ fontSize: "0.8rem", background: "rgba(255,255,255,0.08)", padding: "0.15rem 0.5rem", borderRadius: "999px", color: "rgb(var(--color-text-muted))" }}>
                    {timelineMessages.length} Total Messages
                  </span>
                </div>
                <button 
                  onClick={() => setTimelineCollapsed(!timelineCollapsed)}
                  style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", padding: 0 }}
                >
                  {timelineCollapsed ? "Expand" : "Collapse"}
                </button>
              </div>

              {!timelineCollapsed && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  
                  {/* Message Items Timeline */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {timelineMessages.map((msg, index) => {
                      const isDept = msg.sender === "Dept Head";
                      return (
                        <div key={index} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                          <div style={{
                            width: "2.25rem",
                            height: "2.25rem",
                            borderRadius: "50%",
                            background: isDept ? "rgba(59, 130, 246, 0.15)" : "rgba(99, 102, 241, 0.15)",
                            color: isDept ? "#3B82F6" : "rgb(var(--color-primary))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}>
                            {isDept ? <Icons.ShieldCheck size={18} /> : <Icons.User size={18} />}
                          </div>

                          <div style={{ flexGrow: 1, background: "rgba(255,255,255,0.03)", padding: "0.85rem 1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: "700" }}>{msg.senderName} ({msg.sender})</span>
                              <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>{msg.time}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", lineHeight: "1.4" }}>{msg.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Comment Box */}
                  <form onSubmit={handleSendComment} style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                    <input
                      type="text"
                      placeholder="Add an internal comment to this audit trail..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="form-input"
                      style={{ flexGrow: 1, padding: "0.6rem 0.75rem", fontSize: "0.85rem" }}
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: "0.6rem 1.2rem", background: "#2563EB", border: "none" }}>
                      Send
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (30%) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Show Request Clarification Form or Details Cards */}
            {showClarificationForm ? (
              <div className="glass-panel" style={{ padding: "1.5rem", background: "rgba(37, 99, 235, 0.05)", border: "1px solid rgba(37, 99, 235, 0.15)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", color: "#2563EB" }}>
                  <Icons.HelpCircle size={20} />
                  <h3 style={{ fontSize: "1.05rem", fontWeight: "700", margin: 0 }}>Request Clarification</h3>
                </div>
                <p style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", marginBottom: "1rem" }}>Send a question to the requester</p>

                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>Directed to</label>
                  <select 
                    value={directedTo} 
                    onChange={(e) => setDirectedTo(e.target.value)}
                    className="form-input"
                    style={{ padding: "0.45rem", fontSize: "0.85rem" }}
                  >
                    <option value="Initiator">Initiator</option>
                    <option value="Dept Head">Department Head</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>Your Question</label>
                  {/* Editor Toolbar Mock */}
                  <div style={{ display: "flex", gap: "0.5rem", background: "rgba(255,255,255,0.03)", padding: "0.25rem 0.5rem", border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none", borderTopLeftRadius: "6px", borderTopRightRadius: "6px" }}>
                    <button type="button" style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0.1rem 0.25rem" }}><Icons.Bold size={12} /></button>
                    <button type="button" style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0.1rem 0.25rem" }}><Icons.Italic size={12} /></button>
                    <button type="button" style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0.1rem 0.25rem" }}><Icons.List size={12} /></button>
                    <button type="button" style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0.1rem 0.25rem" }}><Icons.Link size={12} /></button>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Specify what information is missing or needs clarification..."
                    value={clarificationQuestion}
                    onChange={(e) => setClarificationQuestion(e.target.value)}
                    className="form-textarea"
                    style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: "0.5rem", fontSize: "0.85rem" }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
                  <input 
                    type="checkbox" 
                    id="urgent" 
                    checked={markAsUrgent} 
                    onChange={(e) => setMarkAsUrgent(e.target.checked)}
                    style={{ width: "1rem", height: "1rem" }}
                  />
                  <label htmlFor="urgent" style={{ fontSize: "0.8rem", cursor: "pointer" }}>Mark as Urgent (Notify immediately)</label>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button 
                    onClick={() => { setShowClarificationForm(false); setClarificationQuestion(""); }}
                    className="btn btn-secondary" 
                    style={{ padding: "0.45rem 1rem", fontSize: "0.8rem" }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleWorkflowClick("CLARIFY")}
                    className="btn btn-primary"
                    style={{ padding: "0.45rem 1.2rem", fontSize: "0.8rem", background: "#2563EB", border: "none" }}
                  >
                    Submit
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Requester Profile Card */}
                <div className="glass-panel" style={{ padding: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div style={{
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      color: "#3B82F6"
                    }}>
                      {selectedExpense.initiatorId?.name?.charAt(0) || "J"}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700" }}>{selectedExpense.initiatorId?.name || "James Okafor"}</h4>
                      <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>ID: {selectedExpense.initiatorId?.employeeId || "VND 2023 994"}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "rgb(var(--color-text-muted))" }}>Account Number</span>
                      <strong>{selectedExpense.vendorBankDetails?.accountNumber || "0019283746"}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "rgb(var(--color-text-muted))" }}>Bank Name</span>
                      <strong>{selectedExpense.vendorBankDetails?.bankName || "Access Bank PLC"}</strong>
                    </div>
                  </div>
                </div>

                {/* Dept Budget Card */}
                <div className="glass-panel" style={{ padding: "1.25rem" }}>
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "rgb(var(--color-text-muted))", display: "block", marginBottom: "0.25rem" }}>DEPT BUDGET (Q3)</span>
                  <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>Department Spend</span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "0.2" }}>
                    <strong style={{ fontSize: "1.25rem" }}>₦{totalDeptSpend.toLocaleString()}</strong>
                    <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981", fontWeight: "700", fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                      ₦{(12545000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Documentation Card */}
                <div className="glass-panel" style={{ padding: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", color: "#2563EB" }}>
                    <Icons.Paperclip size={16} />
                    <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: "700" }}>Documentation</h4>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {/* Invoice */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <Icons.FileText size={16} style={{ color: "#EF4444" }} />
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: "600", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {selectedExpense.supportingDocument || "Invoice_Q3.pdf"}
                        </p>
                        <span style={{ fontSize: "0.65rem", color: "rgb(var(--color-text-muted))" }}>1.2 MB • PDF Document</span>
                      </div>
                    </div>
                    {/* Justification Word Doc */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <Icons.FileText size={16} style={{ color: "#3B82F6" }} />
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: "600", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          Maintenance_Justification.docx
                        </p>
                        <span style={{ fontSize: "0.65rem", color: "rgb(var(--color-text-muted))" }}>846 KB • Word Doc</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => alert("File upload screen opened")}
                      className="btn" 
                      style={{ border: "1px dashed rgba(255,255,255,0.15)", background: "transparent", fontSize: "0.75rem", padding: "0.4rem", display: "flex", justifyContent: "center", gap: "0.25rem", color: "rgb(var(--color-text-muted))" }}
                    >
                      <Icons.Plus size={14} /> Upload Additional Files
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Approval Workflow Checklist Stepper (Always visible below) */}
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.85rem", fontWeight: "700" }}>Approval Workflow</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "relative" }}>
                {[
                  { label: "Request Initiated", desc: `by ${selectedExpense.initiatorId?.name || "John Doe"}`, date: new Date(selectedExpense.createdAt).toLocaleDateString(), active: true },
                  { label: "Department Approval", desc: "by Sarah Williams", date: new Date(selectedExpense.createdAt).toLocaleDateString(), active: ["SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status) },
                  { label: "Finance Verification", desc: selectedExpense.status === "SENT_TO_FINANCE" ? "Awaiting action..." : "Completed", date: ["UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status) ? new Date(selectedExpense.updatedAt).toLocaleDateString() : "", active: ["SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status), current: selectedExpense.status === "SENT_TO_FINANCE" },
                  { label: "Final Disbursement", desc: selectedExpense.status === "PAID" ? "Completed" : "Pending approval...", date: selectedExpense.status === "PAID" ? new Date(selectedExpense.updatedAt).toLocaleDateString() : "", active: ["PAID", "CLOSED"].includes(selectedExpense.status) }
                ].map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", position: "relative" }}>
                    {/* Circle */}
                    <div style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      borderRadius: "50%",
                      background: step.current ? "rgba(59, 130, 246, 0.15)" : step.active ? "#10B981" : "rgba(255,255,255,0.05)",
                      border: step.current ? "2px solid #3B82F6" : step.active ? "2px solid #10B981" : "2px solid rgba(255,255,255,0.1)",
                      zIndex: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {step.active && !step.current && <Icons.Check size={10} style={{ color: "#fff" }} />}
                    </div>
                    {/* Stepper text */}
                    <div>
                      <h5 style={{ margin: 0, fontSize: "0.8rem", fontWeight: "700", color: step.active ? "inherit" : "rgb(var(--color-text-muted))" }}>{step.label}</h5>
                      <p style={{ margin: 0, fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>{step.desc} {step.date && `• ${step.date}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // STANDARD WORKFLOW PIPELINE LIST VIEW
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "700" }}>Pipeline Overview</h2>
          <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.95rem", marginTop: "0.25rem" }}>Manage and process financial disbursement requests.</p>
        </div>

        {/* Action controls next to title */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Custom Date Filter button */}
          <button 
            onClick={() => setApprovalDateFilter(approvalDateFilter === "today" ? "all" : "today")}
            className={`btn ${approvalDateFilter === "today" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "0.55rem 1rem", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            <Icons.Calendar size={14} />
            {approvalDateFilter === "today" ? "Today Only" : "All Dates"}
          </button>

          {/* Export CSV button */}
          <button 
            onClick={() => {
              const csvContent = "data:text/csv;charset=utf-8," 
                + ["Request Number,Initiator,Category,Amount,Date,Status"].join(",") + "\n"
                + filteredList.map(e => `"${e.requestNumber}","${e.initiatorId?.name || "System"}","${e.category}",${e.amount},"${new Date(e.createdAt).toLocaleDateString()}","${e.status}"`).join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `pipeline_export_${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="btn btn-secondary" 
            style={{ padding: "0.55rem 1rem", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <Icons.Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Primary Pipeline tab list filters */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "1.5rem", gap: "1.5rem" }}>
        {[
          { key: "new", label: "New Requests", count: newRequests.length, color: "rgba(59,130,246,0.15)" },
          { key: "processing", label: "Processing", count: processingRequests.length, color: "#3B82F6" },
          { key: "completed", label: "Completed", count: completedRequests.length, color: "#10B981" }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key as any)}
            style={{
              padding: "0.75rem 0.5rem",
              background: "none",
              border: "none",
              borderBottom: activeSubTab === tab.key ? `2px solid ${tab.key === 'completed' ? '#10B981' : '#3B82F6'}` : "2px solid transparent",
              color: activeSubTab === tab.key ? "inherit" : "rgb(var(--color-text-muted))",
              fontWeight: "700",
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.15s ease"
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                fontSize: "0.75rem",
                background: activeSubTab === tab.key ? (tab.key === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)') : 'rgba(255,255,255,0.05)',
                color: activeSubTab === tab.key ? (tab.key === 'completed' ? '#10B981' : '#3B82F6') : 'rgb(var(--color-text-muted))',
                padding: "0.1rem 0.45rem",
                borderRadius: "999px",
                fontWeight: "bold"
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters Toolbar */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        
        {/* Datepicker Filter */}
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
              background: "rgba(255, 255, 255, 0.03)", 
              borderRadius: "8px",
              width: "155px",
              height: "auto",
              border: "1px solid rgba(255, 255, 255, 0.08)"
            }}
          />
        </div>

        {/* Text/ID search input */}
        <div style={{ position: "relative", flexGrow: 1, minWidth: "220px" }}>
          <Icons.Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-muted))" }} />
          <input
            type="text"
            placeholder="Search Request ID, Title, or Dept..."
            value={amountSearchQuery}
            onChange={(e) => setAmountSearchQuery(e.target.value)}
            className="form-input"
            style={{ 
              padding: "0.5rem 0.5rem 0.5rem 2.25rem", 
              fontSize: "0.85rem", 
              background: "rgba(255, 255, 255, 0.03)", 
              borderRadius: "8px", 
              height: "auto",
              border: "1px solid rgba(255, 255, 255, 0.08)"
            }}
          />
        </div>
      </div>

      {/* Main List Table */}
      <div className="glass-panel" style={{ overflow: "hidden", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "100px" }}>ID</th>
              <th style={{ padding: "0.85rem 1rem", fontWeight: "700" }}>REQUEST</th>
              <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "160px" }}>AMOUNT</th>
              <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "160px" }}>STATUS</th>
              <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "120px", textAlign: "center" }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((exp) => {
              const isOverBudget = exp.amount > 30000 || exp.status === "INSUFFICIENT_BUDGET" || exp.status === "PENDING_EXCEPTIONAL";
              return (
                <tr 
                  key={exp._id}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "all 0.15s ease", cursor: "pointer" }}
                  onClick={() => setSelectedExpense(exp)}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.01)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  {/* ID */}
                  <td style={{ padding: "1rem", fontWeight: "700" }}>
                    <span style={{ color: isOverBudget ? "#EF4444" : "inherit" }}>
                      {exp.requestNumber}
                    </span>
                  </td>

                  {/* REQUEST info */}
                  <td style={{ padding: "1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      <strong style={{ fontSize: "0.9rem", color: isOverBudget ? "#EF4444" : "inherit" }}>{exp.category} - {exp.vendorName}</strong>
                      <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                        {exp.departmentId?.name || "Technology"} &bull; Requested by {exp.initiatorId?.name || "James Okafor"} &bull; Approved by Dept Head
                      </span>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", maxWidth: "450px" }}>
                        {exp.description}
                      </p>
                      {isOverBudget && (
                        <span style={{ fontSize: "0.7rem", color: "#EF4444", fontWeight: "600", marginTop: "0.1rem" }}>
                          Exceeds departmental cap by ₦{(exp.amount - 25000 > 0 ? exp.amount - 25000 : 21000).toLocaleString()}. Risk of downtime without immediate replacement.
                        </span>
                      )}
                    </div>
                  </td>

                  {/* AMOUNT */}
                  <td style={{ padding: "1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <strong style={{ fontSize: "0.95rem", color: isOverBudget ? "#EF4444" : "inherit" }}>
                        ₦{exp.amount.toLocaleString()}
                      </strong>
                      {isOverBudget && (
                        <span style={{ fontSize: "0.65rem", color: "#EF4444", fontWeight: "bold", textTransform: "uppercase" }}>
                          OVER BUDGET
                        </span>
                      )}
                    </div>
                  </td>

                  {/* STATUS */}
                  <td style={{ padding: "1rem" }}>
                    {(() => {
                      let label = "Pending Approval";
                      let badgeColor = { background: "rgba(245, 158, 11, 0.12)", color: "#F59E0B" };

                      if (exp.status === "SENT_TO_FINANCE" || exp.status === "APPROVED") {
                        label = "Pending Approval";
                        badgeColor = { background: "rgba(245, 158, 11, 0.12)", color: "#F59E0B" };
                      } else if (exp.status === "RETURNED") {
                        label = "Awaiting Justification";
                        badgeColor = { background: "rgba(59, 130, 246, 0.12)", color: "#3B82F6" };
                      } else if (exp.status === "PENDING_EXCEPTIONAL") {
                        label = "Pending Exceptional Approval";
                        badgeColor = { background: "rgba(239, 68, 68, 0.12)", color: "#EF4444" };
                      } else if (exp.status === "BUDGET_CHECK") {
                        label = "Awaiting Budget Rectification";
                        badgeColor = { background: "rgba(100, 116, 139, 0.12)", color: "#64748B" };
                      } else if (exp.status === "INSUFFICIENT_BUDGET") {
                        label = "Insufficient Budget";
                        badgeColor = { background: "rgba(239, 68, 68, 0.12)", color: "#EF4444" };
                      } else if (exp.status === "UPLOADED_TO_BANK") {
                        label = "Processing";
                        badgeColor = { background: "rgba(59, 130, 246, 0.12)", color: "#3B82F6" };
                      } else if (["PAID", "CLOSED"].includes(exp.status)) {
                        label = "Completed";
                        badgeColor = { background: "rgba(16, 185, 129, 0.12)", color: "#10B981" };
                      }

                      return (
                        <span className="badge" style={{ ...badgeColor, fontWeight: "700", fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderRadius: "999px" }}>
                          {label}
                        </span>
                      );
                    })()}
                  </td>

                  {/* ACTION */}
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedExpense(exp); }}
                      className="btn btn-secondary"
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", fontWeight: "600", borderColor: "rgba(255,255,255,0.08)" }}
                    >
                      View Request
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredList.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "rgb(var(--color-text-muted))" }}>
                  <Icons.CheckCircle size={44} style={{ color: "#10B981", marginBottom: "0.75rem" }} />
                  <p style={{ fontSize: "0.95rem", fontWeight: "700", margin: 0 }}>All caught up!</p>
                  <p style={{ fontSize: "0.8rem", margin: "0.25rem 0 0 0" }}>No pending requests matching the current filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredList.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", fontSize: "0.8", color: "rgb(var(--color-text-muted))" }}>
          <span>Showing {filteredList.length} of {currentList.length} requests</span>
          <button className="btn btn-secondary" style={{ padding: "0.45rem 1rem", fontSize: "0.75rem", fontWeight: "600" }}>
            Load more
          </button>
        </div>
      )}
    </div>
  );
};
