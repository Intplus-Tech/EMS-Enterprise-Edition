import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { ApproveExpansionModal } from "./ApproveExpansionModal";
import { RejectExpansionModal } from "./RejectExpansionModal";

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

  // Escalation Modal state
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateJustification, setEscalateJustification] = useState("");
  const [officerAcknowledged, setOfficerAcknowledged] = useState(false);

  // Finance Manager Role Modals state
  const [showAuthorizeReleaseModal, setShowAuthorizeReleaseModal] = useState(false);
  const [showCompletedReleaseModal, setShowCompletedReleaseModal] = useState(false);
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [showApproveExpansionModal, setShowApproveExpansionModal] = useState(false);
  const [showRejectExpansionModal, setShowRejectExpansionModal] = useState(false);
  const [expansionModalTarget, setExpansionModalTarget] = useState<any>(null);
  const [activeReleaseItem, setActiveReleaseItem] = useState<any>(null);
  const [bankRefNumber, setBankRefNumber] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [confirmDebited, setConfirmDebited] = useState(false);
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState("30DAYS");

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
  const handleWorkflowClick = async (actionType: "APPROVE" | "INSUFFICIENT" | "CLARIFY" | "ESCALATE") => {
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
      } else if (actionType === "ESCALATE") {
        // Forward to Finance Head Exceptional Workflow Route
        const comment = `[Officer Escalation] Justification: ${escalateJustification}`;
        const res = await fetch(`/api/expenses/${selectedExpense._id}/workflow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "APPROVE", comment }) // Moving forward to next role level
        });
        const data = await res.json();
        if (data.success) {
          alert("Request forwarded to Finance Head review queue successfully.");
          setShowEscalateModal(false);
          setEscalateJustification("");
          setOfficerAcknowledged(false);
          setSelectedExpense(null);
          if (loadDashboardData) await loadDashboardData(currentUser);
        } else {
          alert(data.error || "Escalation failed.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred. Please try again.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Finance Manager Payment Release Action
  const handleReleasePayment = async (expToRelease: any) => {
    if (!expToRelease || submittingAction) return;
    if (!bankRefNumber.trim()) {
      alert("Please enter a Bank Reference Number.");
      return;
    }
    if (!confirmDebited) {
      alert("Please confirm that the funds have been successfully debited from the corporate account.");
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/expenses/${expToRelease._id}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: bankRefNumber,
          receipt: receiptFileName || "payment_receipt_2101.pdf"
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Payment released successfully! Reference: ${bankRefNumber}`);
        setShowAuthorizeReleaseModal(false);
        setActiveReleaseItem(null);
        setSelectedExpense(null);
        setBankRefNumber("");
        setReceiptFileName("");
        setConfirmDebited(false);
        if (loadDashboardData) await loadDashboardData(currentUser);
      } else {
        alert(data.error || "Payment release failed.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during release authorization.");
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

  const isSelectedCompleted = selectedExpense ? ["PAID", "CLOSED", "REJECTED", "CANCELLED"].includes(selectedExpense.status) : false;
  const isSelectedOverBudget = selectedExpense ? (selectedExpense.amount > 30000 || selectedExpense.status === "INSUFFICIENT_BUDGET" || selectedExpense.status === "PENDING_EXCEPTIONAL") : false;

  // RENDER DETAILED REQUEST PROFILE PAGE
  if (selectedExpense) {
    return (
      <div style={{ padding: "0.25rem 0" }}>
        
        {/* Back Link and Action Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            {isSelectedCompleted ? (
              // Square Style Back Button (Image 3)
              <button 
                onClick={() => { setSelectedExpense(null); setShowClarificationForm(false); }} 
                className="btn btn-secondary"
                style={{ 
                  border: "1.5px solid rgba(59, 130, 246, 0.3)", 
                  background: "rgba(59, 130, 246, 0.05)", 
                  padding: "0.5rem 1.25rem", 
                  borderRadius: "6px", 
                  cursor: "pointer", 
                  fontSize: "0.85rem", 
                  fontWeight: "700", 
                  color: "#3B82F6", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "0.35rem" 
                }}
              >
                Back
              </button>
            ) : (
              // Default Arrow Back Link
              <button 
                onClick={() => { setSelectedExpense(null); setShowClarificationForm(false); }} 
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1.25rem", fontWeight: "700", padding: 0 }}
              >
                <Icons.ArrowLeft size={20} />
                Request Profile #{selectedExpense.requestNumber}
              </button>
            )}
            
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
              <span className={`badge badge-${selectedExpense.status?.toLowerCase().replace(/_/g, '-')}`} style={{ fontWeight: "700" }}>
                {selectedExpense.status === "SENT_TO_FINANCE" ? "APPROVED BY DEPT HEAD" : selectedExpense.status?.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>
                Submitted on {new Date(selectedExpense.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          {!isSelectedCompleted && (
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {currentUser?.role === "FINANCE_HEAD" || selectedExpense.status === "PENDING_EXCEPTIONAL" ? (
                <>
                  <button 
                    onClick={() => {
                      setExpansionModalTarget(selectedExpense);
                      setShowRejectExpansionModal(true);
                    }}
                    className="btn btn-danger" 
                    style={{ background: "#B91C1C", color: "#FFFFFF", fontWeight: "700", border: "none" }}
                    disabled={submittingAction}
                  >
                    Reject Expansion
                  </button>

                  <button 
                    onClick={() => {
                      setExpansionModalTarget(selectedExpense);
                      setShowApproveExpansionModal(true);
                    }}
                    className="btn btn-primary" 
                    style={{ background: "#2563EB", color: "#FFFFFF", fontWeight: "700", border: "none" }}
                    disabled={submittingAction}
                  >
                    Authorize One-Time Expansion
                  </button>
                </>
              ) : (
                <>
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
                  
                  {isSelectedOverBudget && currentUser?.role === "FINANCE_OFFICER" ? (
                    <button 
                      onClick={() => setShowEscalateModal(true)}
                      className="btn btn-primary"
                      style={{ background: "#2563EB", border: "none" }}
                      disabled={submittingAction}
                    >
                      Forward to Fin Head
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleWorkflowClick("APPROVE")}
                      className="btn btn-primary"
                      style={{ background: "#2563EB", border: "none" }}
                      disabled={submittingAction}
                    >
                      {submittingAction ? "Processing..." : "Approve"}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "0.2rem" }}>
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

                    {/* Show Paid gtbank_receipt.pdf document (Image 3) */}
                    {isSelectedCompleted && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <Icons.FileText size={16} style={{ color: "#EF4444" }} />
                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: "600", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            gtbank_receipt.pdf
                          </p>
                          <span style={{ fontSize: "0.65rem", color: "rgb(var(--color-text-muted))" }}>845 KB • PDF Document</span>
                        </div>
                      </div>
                    )}

                    {/* Hide upload button for Completed paid requests */}
                    {!isSelectedCompleted && (
                      <button 
                        onClick={() => alert("File upload screen opened")}
                        className="btn" 
                        style={{ border: "1px dashed rgba(255,255,255,0.15)", background: "transparent", fontSize: "0.75rem", padding: "0.4rem", display: "flex", justifyContent: "center", gap: "0.25rem", color: "rgb(var(--color-text-muted))" }}
                      >
                        <Icons.Plus size={14} /> Upload Additional Files
                      </button>
                    )}
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
                  { label: "Department Approval", desc: "by Sarah Williams", date: new Date(selectedExpense.createdAt).toLocaleDateString(), active: isSelectedCompleted || ["SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status) },
                  { 
                    label: "Finance Verification", 
                    desc: isSelectedCompleted ? `by ${currentUser.name || "Jane Doe"}` : (selectedExpense.status === "SENT_TO_FINANCE" ? "Awaiting action..." : "Completed"), 
                    date: isSelectedCompleted ? new Date(selectedExpense.updatedAt).toLocaleDateString() : (["UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status) ? new Date(selectedExpense.updatedAt).toLocaleDateString() : ""), 
                    active: isSelectedCompleted || ["SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status), 
                    current: !isSelectedCompleted && selectedExpense.status === "SENT_TO_FINANCE" 
                  },
                  { 
                    label: "Final Disbursement", 
                    desc: isSelectedCompleted ? "by Jerry Doe" : (selectedExpense.status === "PAID" ? "Completed" : "Pending approval..."), 
                    date: isSelectedCompleted ? new Date(selectedExpense.updatedAt).toLocaleDateString() : (selectedExpense.status === "PAID" ? new Date(selectedExpense.updatedAt).toLocaleDateString() : ""), 
                    active: isSelectedCompleted || ["PAID", "CLOSED"].includes(selectedExpense.status) 
                  }
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

        {/* FORWARD TO FINANCE HEAD ESCALATION MODAL (Image 1) */}
        {showEscalateModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(15, 23, 42, 0.75)",
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)"
          }}>
            <div className="glass-panel" style={{
              width: "100%",
              maxWidth: "520px",
              maxHeight: "95vh",
              overflowY: "auto",
              padding: "1.75rem",
              background: "rgb(15, 23, 42)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              color: "#fff"
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "8px",
                    background: "rgba(239, 68, 68, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#EF4444"
                  }}>
                    <Icons.Forward size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: "700", margin: 0 }}>Forward to Fin Head</h3>
                    <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>Escalation for Request {selectedExpense.requestNumber}</span>
                  </div>
                </div>
                <button 
                  onClick={() => { setShowEscalateModal(false); setEscalateJustification(""); setOfficerAcknowledged(false); }}
                  style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))", cursor: "pointer", padding: 0 }}
                >
                  <Icons.X size={20} />
                </button>
              </div>

              {/* Insufficient Budget Exception Alert Banner */}
              <div style={{
                background: "rgba(239, 68, 68, 0.05)",
                border: "1px solid rgba(239, 68, 68, 0.15)",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-start"
              }}>
                <Icons.AlertTriangle size={18} style={{ color: "#EF4444", flexShrink: 0, marginTop: "0.1rem" }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: "700", color: "#EF4444" }}>Insufficient Budget Exception</h4>
                  <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                    The requested amount for {selectedExpense.requestNumber} exceeds the quarterly departmental cap.
                  </p>
                </div>
              </div>

              {/* Request Info Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "rgb(var(--color-text-muted))" }}>Request Information</span>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: "0.6rem 0.85rem", borderRadius: "6px" }}>
                    <span style={{ display: "block", fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>DEPARTMENT</span>
                    <strong style={{ fontSize: "0.85rem" }}>{selectedExpense.departmentId?.name || selectedExpense.departmentName || "Technology"}</strong>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: "0.6rem 0.85rem", borderRadius: "6px" }}>
                    <span style={{ display: "block", fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>BUDGET ITEM</span>
                    <strong style={{ fontSize: "0.85rem" }}>{selectedExpense.category || "Data Centre Operations"}</strong>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: "0.6rem 0.85rem", borderRadius: "6px" }}>
                    <span style={{ display: "block", fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>BUDGETED</span>
                    <strong style={{ fontSize: "0.9rem" }}>₦1,220,000</strong>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: "0.6rem 0.85rem", borderRadius: "6px" }}>
                    <span style={{ display: "block", fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>AMOUNT SPEND</span>
                    <strong style={{ fontSize: "0.9rem" }}>₦1,211,000</strong>
                  </div>
                </div>
              </div>

              {/* Request (Over Cap) Card */}
              <div style={{
                background: "rgba(239, 68, 68, 0.03)",
                border: "1px solid rgba(239, 68, 68, 0.15)",
                borderRadius: "8px",
                padding: "0.85rem 1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <strong style={{ fontSize: "0.9rem", color: "#EF4444" }}>Request (Over Cap)</strong>
                <strong style={{ fontSize: "1.1rem", color: "#EF4444" }}>₦{selectedExpense.amount.toLocaleString()}</strong>
              </div>

              {/* Justification Textarea */}
              <div className="form-group">
                <label className="form-label" style={{ display: "block", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                  Justification for Escalation <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={escalateJustification}
                  onChange={(e) => setEscalateJustification(e.target.value)}
                  placeholder="Enter detailed reasoning for why this request should be approved despite the budget variance..."
                  className="form-textarea"
                  style={{ padding: "0.6rem", fontSize: "0.85rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem", fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>
                  <span>Min. 50 characters required for Finance Head review.</span>
                  <span style={{ color: escalateJustification.length >= 50 ? "#10B981" : "#EF4444" }}>
                    {escalateJustification.length} / 50 characters
                  </span>
                </div>
              </div>

              {/* Acknowledgment Checkbox */}
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <input 
                  type="checkbox" 
                  id="acknowledge"
                  checked={officerAcknowledged}
                  onChange={(e) => setOfficerAcknowledged(e.target.checked)}
                  style={{ width: "1.1rem", height: "1.1rem", marginTop: "0.1rem", cursor: "pointer" }}
                />
                <label htmlFor="acknowledge" style={{ fontSize: "0.75rem", lineHeight: "1.4", color: "rgb(var(--color-text-muted))", cursor: "pointer" }}>
                  <strong>Officer Acknowledgment</strong>
                  <span style={{ display: "block", marginTop: "0.1rem" }}>
                    I have verified that this request is an urgent exception and requires Finance Head approval. I confirm all supporting documentation has been vetted.
                  </span>
                </label>
              </div>

              {/* Footer */}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button 
                  onClick={() => { setShowEscalateModal(false); setEscalateJustification(""); setOfficerAcknowledged(false); }}
                  className="btn btn-secondary" 
                  style={{ padding: "0.55rem 1.25rem", fontSize: "0.85rem", background: "transparent", borderColor: "rgba(255,255,255,0.12)" }}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleWorkflowClick("ESCALATE")}
                  className="btn btn-primary"
                  style={{ padding: "0.55rem 1.5rem", fontSize: "0.85rem", background: "#2563EB", border: "none" }}
                  disabled={escalateJustification.length < 50 || !officerAcknowledged || submittingAction}
                >
                  Forward to Finance Head
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  // Calculate total awaiting release for metric card
  const pendingReleaseTotal = expenses
    .filter(e => e.status === "UPLOADED_TO_BANK" || e.status === "SENT_TO_FINANCE")
    .reduce((sum, e) => sum + (e.amount || 0), 0) || 4850200;

  const isFinanceManager = currentUser?.role === "FINANCE_MANAGER";

  // STANDARD WORKFLOW PIPELINE LIST VIEW
  return (
    <div>
      {/* Title Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "700" }}>Pipeline Overview</h2>
          <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.95rem", marginTop: "0.25rem" }}>
            Manage and process financial disbursement requests.
          </p>
        </div>

        {/* Action controls next to title */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button 
            onClick={() => setApprovalDateFilter(approvalDateFilter === "today" ? "all" : "today")}
            className={`btn ${approvalDateFilter === "today" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "0.55rem 1rem", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            <Icons.Calendar size={14} />
            {approvalDateFilter === "today" ? "Today Only" : "All Dates"}
          </button>

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

      {/* Top Metric Cards for Finance Manager (Screenshot 5) */}
      {isFinanceManager && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#2563EB", display: "block", marginBottom: "0.25rem" }}>
                Total Value Awaiting Release
              </span>
              <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", display: "block", marginBottom: "0.75rem" }}>
                this month
              </span>
              <strong style={{ fontSize: "1.85rem", fontWeight: "800", color: "rgb(var(--color-text))" }}>
                ₦{pendingReleaseTotal.toLocaleString()}
              </strong>
            </div>
            <div style={{ padding: "0.85rem", borderRadius: "12px", background: "rgba(37, 99, 235, 0.1)", color: "#2563EB" }}>
              <Icons.Banknote size={32} />
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#2563EB", display: "block", marginBottom: "0.25rem" }}>
                Avg. Release Time
              </span>
              <span style={{ fontSize: "0.75rem", opacity: 0, display: "block", marginBottom: "0.75rem" }}>placeholder</span>
              <strong style={{ fontSize: "1.85rem", fontWeight: "800", color: "rgb(var(--color-text))" }}>
                1.4 Days
              </strong>
            </div>
            <div style={{ padding: "0.85rem", borderRadius: "12px", background: "rgba(37, 99, 235, 0.1)", color: "#2563EB" }}>
              <Icons.FileText size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Search, Date Filter, Method Filter, Filter & Export buttons (Screenshots 1 & 5) */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        
        {/* Search input */}
        <div style={{ position: "relative", flexGrow: 1, minWidth: "260px" }}>
          <Icons.Search size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-muted))" }} />
          <input
            type="text"
            placeholder="Search Request ID, Title, or Dept..."
            value={amountSearchQuery}
            onChange={(e) => setAmountSearchQuery(e.target.value)}
            className="form-input"
            style={{ 
              padding: "0.55rem 0.55rem 0.55rem 2.4rem", 
              fontSize: "0.85rem", 
              background: "rgba(255, 255, 255, 0.03)", 
              borderRadius: "8px", 
              height: "auto",
              border: "1px solid rgba(255, 255, 255, 0.08)"
            }}
          />
        </div>

        {/* Date Filter Dropdown */}
        <select
          value={dateRangeFilter}
          onChange={(e) => setDateRangeFilter(e.target.value)}
          className="form-input"
          style={{ width: "160px", padding: "0.55rem 0.75rem", fontSize: "0.85rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}
        >
          <option value="30DAYS">Last 30 Days</option>
          <option value="TODAY">Today</option>
          <option value="ALL">All Time</option>
        </select>

        {/* Payment Method Dropdown */}
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="form-input"
          style={{ width: "150px", padding: "0.55rem 0.75rem", fontSize: "0.85rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}
        >
          <option value="ALL">Method: All</option>
          <option value="Transfer">Transfer</option>
          <option value="Cash">Cash</option>
          <option value="Cheque">Cheque</option>
        </select>

        {/* Filter Toggle button (Screenshot 5) */}
        <button className="btn btn-secondary" style={{ padding: "0.55rem 1rem", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <Icons.SlidersHorizontal size={15} /> Filter
        </button>

        {/* Export button */}
        <button 
          onClick={() => alert("Exporting pipeline release report...")}
          className="btn btn-secondary" 
          style={{ padding: "0.55rem 1rem", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.35rem" }}
        >
          <Icons.Download size={15} /> Export
        </button>
      </div>

      {/* Sub-tab Pill: New Request 12 (Screenshot 5) */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "1.25rem", gap: "1.5rem" }}>
        <button
          onClick={() => setActiveSubTab("processing")}
          style={{
            padding: "0.75rem 0.5rem",
            background: "none",
            border: "none",
            borderBottom: activeSubTab !== "completed" ? "2px solid #2563EB" : "2px solid transparent",
            color: activeSubTab !== "completed" ? "inherit" : "rgb(var(--color-text-muted))",
            fontWeight: "700",
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          {isFinanceManager ? "New Request" : "Processing Requests"}
          <span style={{
            fontSize: "0.75rem",
            background: "#2563EB",
            color: "#FFFFFF",
            padding: "0.15rem 0.55rem",
            borderRadius: "999px",
            fontWeight: "bold"
          }}>
            {processingRequests.length || 12}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("completed")}
          style={{
            padding: "0.75rem 0.5rem",
            background: "none",
            border: "none",
            borderBottom: activeSubTab === "completed" ? "2px solid #10B981" : "2px solid transparent",
            color: activeSubTab === "completed" ? "inherit" : "rgb(var(--color-text-muted))",
            fontWeight: "700",
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          Completed Releases
          <span style={{
            fontSize: "0.75rem",
            background: "rgba(16, 185, 129, 0.15)",
            color: "#10B981",
            padding: "0.15rem 0.55rem",
            borderRadius: "999px",
            fontWeight: "bold"
          }}>
            {completedRequests.length}
          </span>
        </button>
      </div>

      {/* Data Table */}
      <div className="glass-panel" style={{ overflow: "hidden", padding: 0 }}>
        {activeSubTab !== "completed" ? (
          /* Pending Release Table View (Screenshot 5) */
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)", textTransform: "uppercase", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "90px" }}>ID</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700" }}>REQUEST</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "140px" }}>AMOUNT</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "180px" }}>BANK ACCOUNT</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "180px" }}>INITIATOR</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "140px", textAlign: "center" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((exp) => {
                const initiatorName = exp.vendorName || exp.initiatorId?.name || "Olamide Adenuga";
                const initials = initiatorName.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "OA";
                return (
                  <tr 
                    key={exp._id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "all 0.15s ease" }}
                  >
                    <td style={{ padding: "1rem", fontWeight: "700", color: "rgb(var(--color-text-muted))" }}>
                      {exp.requestNumber}
                    </td>

                    <td style={{ padding: "1rem" }}>
                      <strong style={{ fontSize: "0.9rem", display: "block", color: "rgb(var(--color-text))" }}>{exp.category}</strong>
                      <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                        Budget Item &bull; {exp.departmentId?.name || "IT Server Q3"}
                      </span>
                    </td>

                    <td style={{ padding: "1rem" }}>
                      <strong style={{ fontSize: "1rem", color: "rgb(var(--color-text))" }}>
                        ₦{exp.amount.toLocaleString()}
                      </strong>
                    </td>

                    <td style={{ padding: "1rem" }}>
                      <strong style={{ fontSize: "0.85rem", display: "block", color: "rgb(var(--color-text))" }}>
                        {exp.vendorBankDetails?.bankName || "Access Bank"}
                      </strong>
                      <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                        {exp.vendorBankDetails?.accountNumber || "0019283746"}
                      </span>
                    </td>

                    <td style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#DBEAFE", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "bold" }}>
                          {initials}
                        </div>
                        <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>{initiatorName}</span>
                      </div>
                    </td>

                    <td style={{ padding: "1rem", textAlign: "center" }}>
                      <button 
                        onClick={() => {
                          setActiveReleaseItem(exp);
                          setBankRefNumber(exp.paymentReference || "");
                          setShowAuthorizeReleaseModal(true);
                        }}
                        className="btn btn-primary"
                        style={{ padding: "0.45rem 1rem", fontSize: "0.8rem", fontWeight: "600", background: "#2563EB", border: "none" }}
                      >
                        View Request
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "rgb(var(--color-text-muted))" }}>
                    <Icons.CheckCircle size={44} style={{ color: "#10B981", marginBottom: "0.75rem" }} />
                    <p style={{ fontSize: "0.95rem", fontWeight: "700", margin: 0 }}>No pending releases</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          /* Completed Release / History Table View (Screenshot 1) */
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)", textTransform: "uppercase", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "90px" }}>ID</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700" }}>REQUEST</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "120px" }}>AMOUNT</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "120px" }}>DEPT.</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "110px" }}>METHOD.</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "150px" }}>REFERENCE</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "130px" }}>RELEASED DATE</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "90px", textAlign: "center" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((exp) => (
                <tr key={exp._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "1rem", fontWeight: "700", color: "rgb(var(--color-text-muted))" }}>
                    {exp.requestNumber}
                  </td>
                  <td style={{ padding: "1rem", fontWeight: "600" }}>
                    {exp.category}
                  </td>
                  <td style={{ padding: "1rem", fontWeight: "700" }}>
                    ₦{exp.amount.toLocaleString()}
                  </td>
                  <td style={{ padding: "1rem", color: "rgb(var(--color-text-muted))" }}>
                    {exp.departmentId?.name || "Technology"}
                  </td>
                  <td style={{ padding: "1rem", color: "rgb(var(--color-text-muted))" }}>
                    Transfer
                  </td>
                  <td style={{ padding: "1rem", color: "rgb(var(--color-text-muted))" }}>
                    {exp.paymentReference || "TXN-2026-0789"}
                  </td>
                  <td style={{ padding: "1rem", color: "rgb(var(--color-text-muted))" }}>
                    {exp.paymentDate ? new Date(exp.paymentDate).toLocaleDateString("en-GB") : "15-07-2026"}
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <button 
                      onClick={() => {
                        setActiveReleaseItem(exp);
                        setShowCompletedReleaseModal(true);
                      }}
                      style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))", cursor: "pointer", padding: "0.3rem" }}
                    >
                      <Icons.Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {filteredList.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>
          <span>Showing 1 to {filteredList.length} of {currentList.length} pending releases</span>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            <button className="btn btn-secondary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}>&lt;</button>
            <button className="btn btn-primary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem", background: "#2563EB" }}>1</button>
            <button className="btn btn-secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}>2</button>
            <button className="btn btn-secondary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}>&gt;</button>
          </div>
        </div>
      )}

      {/* MODAL 1: REVIEW & AUTHORIZE RELEASE MODAL (Screenshot 4) */}
      {showAuthorizeReleaseModal && activeReleaseItem && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(15, 23, 42, 0.65)", zIndex: 120,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(6px)"
        }}>
          <div style={{
            width: "95%", maxWidth: "980px", maxHeight: "90vh", overflowY: "auto",
            background: "#FFFFFF", color: "#0F172A", borderRadius: "16px",
            padding: "2rem", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.35rem", fontWeight: "700", margin: 0, color: "#1E293B" }}>Review & Authorize Release</h2>
                <span style={{ fontSize: "0.85rem", color: "#2563EB", fontWeight: "700" }}>{activeReleaseItem.requestNumber}</span>
              </div>
              <button onClick={() => setShowAuthorizeReleaseModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}>
                <Icons.X size={22} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1.75rem" }}>
              
              {/* Left Column (Review Details) */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748B", letterSpacing: "0.05em", display: "block", marginBottom: "0.6rem" }}>
                    INITIATOR ACCOUNT DETAILS
                  </span>
                  <div style={{ background: "#EDF2F7", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "0.85rem 1rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "#64748B", display: "block" }}>Payee Name</span>
                      <strong style={{ fontSize: "0.85rem", color: "#1E293B" }}>{activeReleaseItem.vendorName || "Blessing Okafor"}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "#64748B", display: "block" }}>Bank</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#2563EB", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: "bold" }}>A</div>
                        <strong style={{ fontSize: "0.85rem", color: "#1E293B" }}>{activeReleaseItem.vendorBankDetails?.bankName || "Access Bank"}</strong>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "#64748B", display: "block" }}>Account Number</span>
                      <strong style={{ fontSize: "0.85rem", color: "#1E293B" }}>{activeReleaseItem.vendorBankDetails?.accountNumber || "0012933746"}</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#2563EB", marginBottom: "0.6rem" }}>
                    <Icons.Paperclip size={16} />
                    <strong style={{ fontSize: "0.85rem" }}>Documentation</strong>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "0.65rem 0.85rem" }}>
                      <Icons.FileText size={18} style={{ color: "#EF4444" }} />
                      <div>
                        <div style={{ fontSize: "0.8rem", fontWeight: "600", color: "#1E293B" }}>Invoice_Q3.pdf</div>
                        <span style={{ fontSize: "0.7rem", color: "#64748B" }}>1.2 MB &bull; PDF Document</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "0.65rem 0.85rem" }}>
                      <Icons.FileText size={18} style={{ color: "#2563EB" }} />
                      <div>
                        <div style={{ fontSize: "0.8rem", fontWeight: "600", color: "#1E293B" }}>Maintenance_Justification.docx</div>
                        <span style={{ fontSize: "0.7rem", color: "#64748B" }}>845 KB &bull; Word Doc</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748B", letterSpacing: "0.05em", display: "block", marginBottom: "0.6rem" }}>
                    JUSTIFICATION SUMMARY
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "0.75rem 0.85rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                        <strong style={{ fontSize: "0.75rem", color: "#475569" }}>Approver's Justification (Dept. Head)</strong>
                        <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Oct 24, 09:12 AM</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748B", fontStyle: "italic" }}>
                        'Urgent replacement of failed server nodes in the Lagos data center to prevent downtime. Budget approved for Q3.'
                      </p>
                    </div>

                    <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "0.75rem 0.85rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                        <strong style={{ fontSize: "0.75rem", color: "#475569" }}>Finance Officer's Justification</strong>
                        <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Oct 24, 11:45 AM</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748B", fontStyle: "italic" }}>
                        'Documentation verified against vendor quote. Bank instruction file prepared and validated. No compliance issues detected.'
                      </p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowThreadModal(true)}
                  style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontSize: "0.8rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.35rem", padding: 0 }}
                >
                  <Icons.MessageSquare size={16} /> View Full Communication Thread &rarr;
                </button>
              </div>

              {/* Right Column (Confirm Payment Release Form) */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0, color: "#1E293B" }}>Confirm Payment Release</h3>

                <div className="form-group">
                  <label className="form-label" style={{ color: "#334155", fontSize: "0.8rem", fontWeight: "600", marginBottom: "0.35rem" }}>
                    Bank Reference Number <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <Icons.Building size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#64748B" }} />
                    <input
                      type="text"
                      placeholder="Enter transaction reference ID"
                      value={bankRefNumber}
                      onChange={(e) => setBankRefNumber(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: "2.25rem", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#0F172A", fontSize: "0.85rem" }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: "#334155", fontSize: "0.8rem", fontWeight: "600", marginBottom: "0.35rem" }}>
                    Payment Receipt / Evidence of Transfer <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div 
                    onClick={() => setReceiptFileName("payment_receipt_2101.pdf")}
                    style={{
                      border: "2px dashed #CBD5E1", borderRadius: "8px", padding: "1.5rem 1rem",
                      textAlign: "center", background: "#F8FAFC", cursor: "pointer", transition: "all 0.15s ease"
                    }}
                  >
                    <Icons.UploadCloud size={32} style={{ color: "#64748B", margin: "0 auto 0.5rem" }} />
                    <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1E293B" }}>
                      {receiptFileName ? receiptFileName : "Drop your file here or click to browse"}
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "#64748B" }}>Supports PDF, PNG, JPG (Max 5MB)</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", background: "#F0F7FF", border: "1px solid #BFDBFE", padding: "0.75rem", borderRadius: "8px" }}>
                  <input
                    type="checkbox"
                    id="confirmDebited"
                    checked={confirmDebited}
                    onChange={(e) => setConfirmDebited(e.target.checked)}
                    style={{ width: "1.1rem", height: "1.1rem", marginTop: "0.1rem", cursor: "pointer" }}
                  />
                  <label htmlFor="confirmDebited" style={{ fontSize: "0.75rem", color: "#334155", lineHeight: "1.4", cursor: "pointer" }}>
                    I confirm that the funds have been successfully debited from the corporate account and the transaction is complete.
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "auto" }}>
                  <button
                    onClick={() => setShowAuthorizeReleaseModal(false)}
                    className="btn btn-secondary"
                    style={{ border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#475569" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReleasePayment(activeReleaseItem)}
                    className="btn btn-primary"
                    style={{ background: "#2563EB", border: "none", padding: "0.6rem 1.75rem", fontWeight: "700" }}
                    disabled={!bankRefNumber || !confirmDebited || submittingAction}
                  >
                    {submittingAction ? "Processing..." : "Paid"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: COMPLETED RELEASE MODAL (Screenshot 2) */}
      {showCompletedReleaseModal && activeReleaseItem && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(15, 23, 42, 0.65)", zIndex: 120,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(6px)"
        }}>
          <div style={{
            width: "95%", maxWidth: "980px", maxHeight: "90vh", overflowY: "auto",
            background: "#FFFFFF", color: "#0F172A", borderRadius: "16px",
            padding: "2rem", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.35rem", fontWeight: "700", margin: 0, color: "#1E293B" }}>Completed Release</h2>
                <span style={{ fontSize: "0.85rem", color: "#2563EB", fontWeight: "700" }}>ID: {activeReleaseItem.requestNumber || "6682528"}</span>
              </div>
              <button onClick={() => setShowCompletedReleaseModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}>
                <Icons.X size={22} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1.5rem" }}>
              
              {/* Left Card */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: "0.75rem" }}>
                  <div>
                    <span style={{ fontSize: "0.7rem", fontWeight: "700", color: "#64748B" }}>REQUEST REFERENCE</span>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#1E293B" }}>#2101 - {activeReleaseItem.category}</h4>
                  </div>
                  <span className="badge" style={{ background: "#DBEAFE", color: "#2563EB", fontWeight: "700", fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "999px" }}>
                    PAID
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748B" }}>Amount Disbursed</span>
                  <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#2563EB" }}>
                    ₦{(activeReleaseItem.amount || 12450000).toLocaleString()}.00
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", background: "#F8FAFC", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <Icons.FileText size={20} style={{ color: "#64748B" }} />
                    <div>
                      <span style={{ fontSize: "0.65rem", color: "#64748B", display: "block" }}>Reference Number</span>
                      <strong style={{ fontSize: "0.8rem", color: "#1E293B" }}>{activeReleaseItem.paymentReference || "TXN-2026-0789-1234"}</strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", background: "#F8FAFC", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <Icons.Building size={20} style={{ color: "#64748B" }} />
                    <div>
                      <span style={{ fontSize: "0.65rem", color: "#64748B", display: "block" }}>Payment Method</span>
                      <strong style={{ fontSize: "0.8rem", color: "#1E293B" }}>Bank Transfer (CBN NIP)</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", background: "#F8FAFC", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                  <Icons.Calendar size={20} style={{ color: "#64748B" }} />
                  <div>
                    <span style={{ fontSize: "0.65rem", color: "#64748B", display: "block" }}>Transaction Date</span>
                    <strong style={{ fontSize: "0.8rem", color: "#1E293B" }}>July 15, 2026 &bull; 14:32 WAT</strong>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F0F7FF", border: "1px dashed #93C5FD", padding: "0.75rem 1rem", borderRadius: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <Icons.FileText size={20} style={{ color: "#2563EB" }} />
                    <div>
                      <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "#1E293B" }}>payment_receipt_2101.pdf</div>
                      <span style={{ fontSize: "0.65rem", color: "#64748B" }}>245 KB &bull; Generated System Receipt</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => alert("Downloading payment_receipt_2101.pdf...")}
                    style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontWeight: "700", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
                  >
                    <Icons.Download size={14} /> Download
                  </button>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748B", letterSpacing: "0.05em", display: "block", marginBottom: "0.5rem" }}>
                    INITIATOR ACCOUNT DETAILS
                  </span>
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "0.85rem 1rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "#64748B", display: "block" }}>Payee Name</span>
                      <strong style={{ fontSize: "0.85rem", color: "#1E293B" }}>{activeReleaseItem.vendorName || "Blessing Okafor"}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "#64748B", display: "block" }}>Bank</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#2563EB", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: "bold" }}>A</div>
                        <strong style={{ fontSize: "0.85rem", color: "#1E293B" }}>{activeReleaseItem.vendorBankDetails?.bankName || "Access Bank"}</strong>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "#64748B", display: "block" }}>Account Number</span>
                      <strong style={{ fontSize: "0.85rem", color: "#1E293B" }}>{activeReleaseItem.vendorBankDetails?.accountNumber || "0012933746"}</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#2563EB", marginBottom: "0.5rem" }}>
                    <Icons.Paperclip size={16} />
                    <strong style={{ fontSize: "0.85rem" }}>Documentation</strong>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "0.65rem 0.85rem" }}>
                      <Icons.FileText size={18} style={{ color: "#EF4444" }} />
                      <div>
                        <div style={{ fontSize: "0.8rem", fontWeight: "600", color: "#1E293B" }}>Invoice_Q3.pdf</div>
                        <span style={{ fontSize: "0.7rem", color: "#64748B" }}>1.2 MB &bull; PDF Document</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "0.65rem 0.85rem" }}>
                      <Icons.FileText size={18} style={{ color: "#2563EB" }} />
                      <div>
                        <div style={{ fontSize: "0.8rem", fontWeight: "600", color: "#1E293B" }}>Maintenance_Justification.docx</div>
                        <span style={{ fontSize: "0.7rem", color: "#64748B" }}>845 KB &bull; Word Doc</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748B", letterSpacing: "0.05em", display: "block", marginBottom: "0.5rem" }}>
                    JUSTIFICATION SUMMARY
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "0.65rem 0.85rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                        <strong style={{ fontSize: "0.75rem", color: "#475569" }}>Approver's Justification (Dept. Head)</strong>
                        <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Oct 24, 09:12 AM</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748B", fontStyle: "italic" }}>
                        'Urgent replacement of failed server nodes in the Lagos data center to prevent downtime. Budget approved for Q3.'
                      </p>
                    </div>

                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "0.65rem 0.85rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                        <strong style={{ fontSize: "0.75rem", color: "#475569" }}>Finance Officer's Justification</strong>
                        <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Oct 24, 11:45 AM</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748B", fontStyle: "italic" }}>
                        'Documentation verified against vendor quote. Bank instruction file prepared and validated. No compliance issues detected.'
                      </p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowThreadModal(true)}
                  style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontSize: "0.8rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.35rem", padding: 0 }}
                >
                  <Icons.MessageSquare size={16} /> View Full Communication Thread &rarr;
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: COMMUNICATION THREAD MODAL (Screenshot 3) */}
      {showThreadModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(15, 23, 42, 0.65)", zIndex: 130,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(6px)"
        }}>
          <div style={{
            width: "95%", maxWidth: "620px", maxHeight: "90vh", overflowY: "auto",
            background: "#FFFFFF", color: "#0F172A", borderRadius: "16px",
            padding: "2rem", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", borderBottom: "1px solid #E2E8F0", paddingBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0, color: "#1E293B" }}>
                  Communication Thread - {activeReleaseItem?.requestNumber || "REQ-0518"}
                </h2>
                <span style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: "600", textTransform: "uppercase" }}>
                  SERVER NODE REPLACEMENT &bull; TOTAL: ₦1,250,000.00
                </span>
              </div>
              <button onClick={() => setShowThreadModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}>
                <Icons.X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.5rem" }}>
              {/* Message 1 */}
              <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#2563EB", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.85rem", flexShrink: 0 }}>
                  <Icons.User size={18} />
                </div>
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "1rem", flexGrow: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <div>
                      <strong style={{ fontSize: "0.85rem", color: "#1E293B" }}>M. Chen</strong>
                      <span style={{ fontSize: "0.7rem", color: "#2563EB", fontWeight: "700", marginLeft: "0.5rem", textTransform: "uppercase" }}>INITIATOR &bull; IT INFRASTRUCTURE</span>
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Oct 23, 02:45 PM</span>
                  </div>
                  <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.8rem", color: "#475569", lineHeight: "1.5" }}>
                    Initial request for server node replacement. Vendor quote attached. Urgent requirement to maintain redundancy in Node Cluster 4.
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "0.5rem 0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Icons.FileText size={16} style={{ color: "#2563EB" }} />
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#1E293B" }}>server_quote_v2.pdf</div>
                        <span style={{ fontSize: "0.65rem", color: "#94A3B8" }}>420 KB &bull; PDF</span>
                      </div>
                    </div>
                    <Icons.Download size={16} style={{ color: "#64748B", cursor: "pointer" }} />
                  </div>
                </div>
              </div>

              {/* Message 2 */}
              <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.85rem", flexShrink: 0 }}>
                  <Icons.ShieldCheck size={18} />
                </div>
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "1rem", flexGrow: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <div>
                      <strong style={{ fontSize: "0.85rem", color: "#1E293B" }}>K. Adeyemi</strong>
                      <span style={{ fontSize: "0.7rem", color: "#64748B", fontWeight: "700", marginLeft: "0.5rem", textTransform: "uppercase" }}>APPROVER &bull; DEPT HEAD</span>
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Oct 24, 09:12 AM</span>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "#DBEAFE", color: "#2563EB", fontSize: "0.7rem", fontWeight: "700", padding: "0.2rem 0.5rem", borderRadius: "999px", marginBottom: "0.5rem" }}>
                    <Icons.CheckCircle size={12} /> Status Changed to Approved
                  </div>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#475569", lineHeight: "1.5" }}>
                    Approved. Budget verified for Q3 infrastructure spend. Priority 1 release requested.
                  </p>
                </div>
              </div>

              {/* Message 3 */}
              <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#F1F5F9", color: "#475569", border: "1px solid #CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.85rem", flexShrink: 0 }}>
                  <Icons.Briefcase size={18} />
                </div>
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "1rem", flexGrow: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <div>
                      <strong style={{ fontSize: "0.85rem", color: "#1E293B" }}>J. Doe</strong>
                      <span style={{ fontSize: "0.7rem", color: "#64748B", fontWeight: "700", marginLeft: "0.5rem", textTransform: "uppercase" }}>FINANCE OFFICER &bull; TREASURY</span>
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Oct 24, 11:45 AM</span>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "#F1F5F9", color: "#475569", fontSize: "0.7rem", fontWeight: "700", padding: "0.2rem 0.5rem", borderRadius: "999px", marginBottom: "0.5rem" }}>
                    <Icons.Archive size={12} /> Documentation Verified
                  </div>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#475569", lineHeight: "1.5" }}>
                    Documentation verified. Bank file prepared. Awaiting final release authority for batch settlement.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 0.85rem", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "0.75rem", color: "#64748B" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#94A3B8" }} />
                <span>Current Status: <strong>Pending Final Release</strong></span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "1rem" }}>
              <button 
                onClick={() => alert("Thread exported successfully.")}
                className="btn btn-secondary" 
                style={{ border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#475569", fontSize: "0.8rem" }}
              >
                Export Thread
              </button>
              <button 
                onClick={() => setShowThreadModal(false)}
                className="btn btn-primary"
                style={{ background: "#2563EB", border: "none", fontSize: "0.8rem", fontWeight: "700" }}
              >
                &larr; Back to Review
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Finance Head Approve One-Time Budget Expansion Modal */}
      <ApproveExpansionModal
        isOpen={showApproveExpansionModal}
        onClose={() => setShowApproveExpansionModal(false)}
        requestNumber={selectedExpense?.requestNumber ? `#${selectedExpense.requestNumber.replace(/^REQ-/, '')}` : "#0044"}
        requestAmount={selectedExpense?.amount || 47200}
        remainingBudget={26200}
        deficitAmount={selectedExpense?.amount ? (selectedExpense.amount > 26200 ? selectedExpense.amount - 26200 : 21000) : 21000}
        onConfirm={async (notes) => {
          if (!selectedExpense) return;
          try {
            const res = await fetch(`/api/expenses/${selectedExpense._id}/exceptional`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "APPROVE", comment: notes })
            });
            const data = await res.json();
            if (data.success) {
              alert("One-Time Budget Expansion Authorized successfully!");
              setShowApproveExpansionModal(false);
              setSelectedExpense(null);
              if (loadDashboardData) await loadDashboardData(currentUser);
            } else {
              alert(data.error || "Expansion authorization failed.");
            }
          } catch (err) {
            console.error(err);
            alert("An error occurred during budget expansion authorization.");
          }
        }}
      />

      {/* Finance Head Reject One-Time Budget Expansion Modal */}
      <RejectExpansionModal
        isOpen={showRejectExpansionModal}
        onClose={() => setShowRejectExpansionModal(false)}
        requestNumber={selectedExpense?.requestNumber ? `#${selectedExpense.requestNumber.replace(/^REQ-/, '')}` : "#0044"}
        requestAmount={selectedExpense?.amount || 47200}
        remainingBudget={26200}
        deficitAmount={selectedExpense?.amount ? (selectedExpense.amount > 26200 ? selectedExpense.amount - 26200 : 21000) : 21000}
        onConfirm={async (reason) => {
          if (!selectedExpense) return;
          try {
            const res = await fetch(`/api/expenses/${selectedExpense._id}/exceptional`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "REJECT", comment: reason })
            });
            const data = await res.json();
            if (data.success) {
              alert("Budget Expansion Request Rejected successfully.");
              setShowRejectExpansionModal(false);
              setSelectedExpense(null);
              if (loadDashboardData) await loadDashboardData(currentUser);
            } else {
              alert(data.error || "Rejection failed.");
            }
          } catch (err) {
            console.error(err);
            alert("An error occurred during budget expansion rejection.");
          }
        }}
      />

    </div>
  );
};
