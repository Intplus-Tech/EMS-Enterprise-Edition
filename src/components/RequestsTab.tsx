import React from "react";
import * as Icons from "lucide-react";
import { StatCard } from "./ui/StatCard";
import { formatNaira, formatNairaPrecise, formatDate, humanizeStatus, statusBadgeClass } from "./ui/format";
import { datedFilename, downloadCsv } from "./ui/exportCsv";
import { ExpenseRequestDto } from "../types/api";

interface RequestsTabProps {
  currentUser: any;
  expenses: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  /** Controls in the filter row above the lists (design: Today / date / amount). */
  amountSearchQuery: string;
  setAmountSearchQuery: (q: string) => void;
  todayOnly: boolean;
  setTodayOnly: (v: boolean) => void;
  dateFilter: string;
  setDateFilter: (v: string) => void;
  setSelectedResubmitExpense: (expense: any) => void;
  setResubmitForm: (form: any) => void;
  setShowResubmitModal: (show: boolean) => void;
  setSelectedExpense: (expense: any) => void;
  setSelectedReceiptData: (data: any) => void;
  setShowReceiptModal: (show: boolean) => void;
  setShowCreateModal: (show: boolean) => void;
  
  requestsSubTab: "my-requests" | "dept-requests";
  setRequestsSubTab: (t: "my-requests" | "dept-requests") => void;
  deptFilterInitiator: string;
  setDeptFilterInitiator: (i: string) => void;
  deptFilterStatus: string;
  setDeptFilterStatus: (s: string) => void;
  deptPage: number;
  setDeptPage: (p: number) => void;
  deptRowsPerPage: number;
  setDeptRowsPerPage: (r: number) => void;
}

export const RequestsTab: React.FC<RequestsTabProps> = ({
  currentUser,
  expenses,
  searchQuery,
  setSearchQuery,
  amountSearchQuery,
  setAmountSearchQuery,
  todayOnly,
  setTodayOnly,
  dateFilter,
  setDateFilter,
  setSelectedResubmitExpense,
  setResubmitForm,
  setShowResubmitModal,
  setSelectedExpense,
  setSelectedReceiptData,
  setShowReceiptModal,
  setShowCreateModal,
  requestsSubTab,
  setRequestsSubTab,
  deptFilterInitiator,
  setDeptFilterInitiator,
  deptFilterStatus,
  setDeptFilterStatus,
  deptPage,
  setDeptPage,
  deptRowsPerPage,
  setDeptRowsPerPage
}) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  let totalSpent = 0;
  const totalRequests = expenses.length;
  let myDrafts = 0;

  expenses.forEach(e => {
    const expDate = new Date(e.createdAt);
    if ((e.status === "PAID" || e.status === "CLOSED") && expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
      totalSpent += e.amount;
    }
    if (e.status === "DRAFT") {
      myDrafts += 1;
    }
  });

  // Requests an approver sent back — they drive both the KPI tile and the banner.
  const returnedRequests = expenses.filter(e => e.status === "RETURNED");
  const awaitingUpdate = returnedRequests.length;

  // No demo fallbacks: an empty account is a real zero. These used to report
  // ₦4,850,200 / 9 / 14 — the design's sample figures — whenever the true value
  // came to zero, which is exactly when the reader most needs the truth.

  /**
   * Opens the resubmit flow for a returned request.
   *
   * The form reads `supportingDocuments` (a list). This wrote the singular
   * `supportingDocument` — plus a hardcoded filename — so the modal then threw
   * on `resubmitForm.supportingDocuments.length`. Starting empty keeps the
   * request's existing documents unless the initiator attaches replacements.
   */
  const openResubmit = (expense: any) => {
    setSelectedResubmitExpense(expense);
    setResubmitForm({ justification: "", supportingDocuments: [] });
    setShowResubmitModal(true);
  };

  // Requests matching the free-text search plus the amount and date controls.
  const matchesControls = (e: ExpenseRequestDto) => {
    const query = searchQuery.trim().toLowerCase();
    if (query && !(
      e.description.toLowerCase().includes(query) ||
      e.requestNumber.toLowerCase().includes(query)
    )) return false;

    const amountTerm = amountSearchQuery.trim();
    if (amountTerm) {
      const amount = Number(e.amount);
      if (!String(amount).includes(amountTerm) && !amount.toLocaleString().includes(amountTerm)) return false;
    }

    if (dateFilter) {
      if (new Date(e.createdAt).toDateString() !== new Date(dateFilter).toDateString()) return false;
    } else if (todayOnly) {
      if (new Date(e.createdAt).toDateString() !== new Date().toDateString()) return false;
    }

    return true;
  };

  /** Exports whatever the controls above currently show. */
  const handleExport = () => {
    const rows = expenses.filter(matchesControls);
    if (!downloadCsv(datedFilename("my-requests"), rows, [
      { header: "Request ID", value: (e: ExpenseRequestDto) => e.requestNumber },
      { header: "Title", value: (e: ExpenseRequestDto) => e.description },
      { header: "Category", value: (e: ExpenseRequestDto) => e.category },
      { header: "Amount", value: (e: ExpenseRequestDto) => e.amount },
      { header: "Date", value: (e: ExpenseRequestDto) => formatDate(e.createdAt) },
      { header: "Status", value: (e: ExpenseRequestDto) => e.status },
    ])) {
      // Nothing to export is not an error worth a banner; the button simply
      // does nothing when the filtered set is empty.
    }
  };

  return (
    <div>
      {/* Page heading. The design titles this screen "Inbox"; the implementation
          rendered no heading at all. */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 700 }}>
          {currentUser?.role === "INITIATOR" ? "Inbox" : "Requests"}
        </h2>
        <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.95rem", marginTop: "0.25rem" }}>
          Review and manage your pending financial actions.
        </p>
      </div>

      {/* Awaiting-response banner — only rendered when an approver returned a request */}
      {returnedRequests.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>
              <span style={{ color: "#EF4444" }}>!</span> Awaiting Your Response
            </h2>
            <span style={{ fontSize: "0.82rem", color: "rgb(var(--color-text-muted))" }}>
              {awaitingUpdate} action{awaitingUpdate === 1 ? "" : "s"} required
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {returnedRequests.map((req) => {
              // Latest approver comment is the question the initiator must answer.
              const approverQuestion = [...(req.history || [])]
                .reverse()
                .find((h: any) => h.comment && h.actorRole !== "INITIATOR")?.comment;

              return (
                <div
                  key={req._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1.5rem",
                    padding: "1.35rem 1.5rem",
                    borderRadius: "0.9rem",
                    background: "rgba(37, 99, 235, 0.12)",
                    border: "1px solid rgba(37, 99, 235, 0.22)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.6rem" }}>
                      <span className="badge badge-submitted">{req.requestNumber}</span>
                      <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>
                        Submitted {formatDate(req.createdAt)}
                      </span>
                    </div>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.75rem" }}>{req.description}</h3>

                    <div
                      style={{
                        maxWidth: "34rem",
                        padding: "0.85rem 1rem",
                        borderRadius: "0.6rem",
                        background: "rgb(var(--color-card))",
                        border: "1px solid rgb(var(--color-card-border))",
                      }}
                    >
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", color: "#2563EB", marginBottom: "0.35rem" }}>
                        APPROVER&apos;S QUESTION:
                      </div>
                      <p style={{ fontSize: "0.88rem", fontStyle: "italic", color: "rgb(var(--color-text))", margin: 0 }}>
                        &quot;{approverQuestion || "Please provide additional clarification for this request."}&quot;
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", color: "rgb(var(--color-text-muted))" }}>
                      TOTAL AMOUNT
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0.2rem 0 1rem" }}>
                      {formatNairaPrecise(req.amount)}
                    </div>
                    <button
                      onClick={() => openResubmit(req)}
                      className="btn btn-primary"
                      style={{ background: "#2563EB", border: "none", display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
                    >
                      <Icons.CornerUpLeft size={16} /> Reply
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metrics cards (Naira metrics!) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2.5rem" }}>
        <StatCard label="Total Spent" hint="this month" value={formatNaira(totalSpent)} icon={<Icons.CreditCard size={18} />} />
        <StatCard label="Total Request" hint="across all statuses" value={totalRequests} icon={<Icons.FileText size={18} />} />
        <StatCard label="My Draft" hint="not yet submitted" value={myDrafts} icon={<Icons.FolderOpen size={18} />} tone="neutral" />
        <StatCard label="Awaiting Update" hint="returned for clarification" value={awaitingUpdate} icon={<Icons.AlertCircle size={18} />} tone="danger" />
      </div>

      {/* Today / date / amount-search / export row from the design. All four
          controls were absent, while the state backing them sat unused in the
          dashboard provider. */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", borderRadius: "8px", overflow: "hidden", border: "1px solid rgb(var(--color-card-border))" }}>
          <button
            type="button"
            onClick={() => { setTodayOnly(!todayOnly); setDateFilter(""); }}
            style={{
              padding: "0.55rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: todayOnly ? "#2563EB" : "transparent",
              color: todayOnly ? "#FFFFFF" : "rgb(var(--color-text))",
            }}
          >
            Today
          </button>
          <input
            type="date"
            aria-label="Filter by date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setTodayOnly(false); }}
            className="form-input"
            style={{ border: "none", borderRadius: 0, fontSize: "0.85rem", padding: "0.55rem 0.75rem", height: "auto" }}
          />
        </div>

        <div style={{ position: "relative", minWidth: "220px" }}>
          <Icons.Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-dim))" }} />
          <input
            type="text"
            placeholder="Search amount..."
            value={amountSearchQuery}
            onChange={(e) => setAmountSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: "2.25rem", fontSize: "0.85rem", padding: "0.55rem 0.55rem 0.55rem 2.25rem", height: "auto", borderRadius: "8px" }}
          />
        </div>

        <button
          type="button"
          onClick={handleExport}
          aria-label="Export requests"
          className="btn btn-primary"
          style={{ marginLeft: "auto", background: "#2563EB", border: "none", padding: "0.55rem 0.85rem", borderRadius: "8px" }}
        >
          <Icons.FileDown size={18} />
        </button>
      </div>

      {currentUser?.role === "INITIATOR" ? (
        // INITIATOR TWO-COLUMN VIEW
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          {/* My Drafts Column */}
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem", color: "rgb(var(--color-text))" }}>My Drafts</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {(() => {
                const drafts = expenses.filter(e => ["DRAFT", "RETURNED"].includes(e.status) && matchesControls(e));

                return drafts.length > 0 ? drafts.map((draft) => (
                  <div key={draft._id} className="glass-card" style={{
                    background: "rgba(var(--color-surface-secondary), 0.45)",
                    border: draft.status === "RETURNED" ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgb(var(--color-card-border))",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))", fontWeight: "bold" }}>{draft.requestNumber}</span>
                        <span className={`badge ${statusBadgeClass(draft.status)}`}>{humanizeStatus(draft.status)}</span>
                      </div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: "600", color: "rgb(var(--color-text))", marginBottom: "0.2" }}>{draft.description}</h4>
                      <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>
                        <span>{formatNaira(draft.amount)}</span>
                        <span>• Last edited {formatDate(draft.updatedAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (draft.status === "RETURNED") {
                          openResubmit(draft);
                        } else {
                          setSelectedExpense(draft);
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ padding: "0.4rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Icons.Edit2 size={16} />
                    </button>
                  </div>
                )) : (
                  <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>No drafts or returned requests.</p>
                );
              })()}
            </div>
          </div>

          {/* Active Requests Column */}
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem", color: "rgb(var(--color-text))" }}>Active Requests</h3>
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>TITLE</th>
                      <th style={{ textAlign: "right" }}>AMOUNT</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: "right" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const activeReqs = expenses.filter(e =>
                        !["DRAFT", "RETURNED", "PAID", "CLOSED", "REJECTED", "CANCELLED"].includes(e.status) && matchesControls(e)
                      );

                      return activeReqs.length > 0 ? activeReqs.map((exp) => (
                        <tr key={exp._id} onClick={() => setSelectedExpense(exp)} style={{ cursor: "pointer" }}>
                          <td><strong>{exp.requestNumber}</strong></td>
                          <td>{exp.description}</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{formatNairaPrecise(exp.amount)}</td>
                          <td>
                            <span className={`badge ${statusBadgeClass(exp.status)}`}>{humanizeStatus(exp.status)}</span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {/* Stop propagation so the icon does not double-fire the row handler */}
                            <button
                              onClick={(ev) => { ev.stopPropagation(); setSelectedExpense(exp); }}
                              aria-label={`View ${exp.requestNumber}`}
                              style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))", cursor: "pointer", padding: "0.2rem" }}
                            >
                              <Icons.Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", color: "rgb(var(--color-text-dim))", padding: "1rem" }}>No active requests.</td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // MANAGING ROLES TABS VIEW (My Requests & Dept. Requests)
        <div>
          <div style={{ display: "flex", borderBottom: "1px solid rgb(var(--color-card-border))", marginBottom: "2rem" }}>
            <button 
              onClick={() => setRequestsSubTab("my-requests")} 
              style={{
                padding: "0.75rem 1.5rem",
                background: "none",
                border: "none",
                borderBottom: requestsSubTab === "my-requests" ? "2px solid rgb(var(--color-primary))" : "none",
                color: requestsSubTab === "my-requests" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              My Requests
            </button>
            <button 
              onClick={() => setRequestsSubTab("dept-requests")} 
              style={{
                padding: "0.75rem 1.5rem",
                background: "none",
                border: "none",
                borderBottom: requestsSubTab === "dept-requests" ? "2px solid rgb(var(--color-primary))" : "none",
                color: requestsSubTab === "dept-requests" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              Dept. Requests
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "2rem" }}>
            {/* Left Column: My Drafts */}
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem", color: "rgb(var(--color-text))" }}>My Drafts</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {(() => {
                  const drafts = expenses.filter(e =>
                    ["DRAFT", "RETURNED"].includes(e.status) && matchesControls(e) && e.initiatorId?._id === currentUser?._id
                  );

                  return drafts.length > 0 ? drafts.map((draft) => (
                    <div key={draft._id} className="glass-card" style={{
                      background: "rgba(var(--color-surface-secondary), 0.45)",
                      border: draft.status === "RETURNED" ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgb(var(--color-card-border))",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))", fontWeight: "bold" }}>{draft.requestNumber}</span>
                          <span className={`badge ${statusBadgeClass(draft.status)}`}>{humanizeStatus(draft.status)}</span>
                        </div>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: "600", color: "rgb(var(--color-text))", marginBottom: "0.2rem" }}>{draft.description}</h4>
                        <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>
                          <span>{formatNaira(draft.amount)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (draft.status === "RETURNED") {
                            openResubmit(draft);
                          } else {
                            setSelectedExpense(draft);
                          }
                        }}
                        className="btn btn-secondary"
                        style={{ padding: "0.4rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Icons.Edit2 size={16} />
                      </button>
                    </div>
                  )) : (
                    <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>No drafts found.</p>
                  );
                })()}
              </div>
            </div>

            {/* Right Column: Table based on Sub Tab */}
            <div>
              {requestsSubTab === "my-requests" ? (
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem", color: "rgb(var(--color-text))" }}>My Active Requests</h3>
                  <div className="glass-panel" style={{ padding: "1.25rem" }}>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const myActive = expenses.filter(e =>
                              e.initiatorId?._id === currentUser?._id &&
                              !["DRAFT", "RETURNED", "PAID", "CLOSED", "REJECTED", "CANCELLED"].includes(e.status) &&
                              matchesControls(e)
                            );

                            return myActive.length > 0 ? myActive.map((exp) => (
                              <tr key={exp._id} onClick={() => setSelectedExpense(exp)} style={{ cursor: "pointer" }}>
                                <td><strong>{exp.requestNumber}</strong></td>
                                <td>{exp.description}</td>
                                <td>{formatNaira(exp.amount)}</td>
                                <td>
                                  <span className={`badge ${statusBadgeClass(exp.status)}`}>{humanizeStatus(exp.status)}</span>
                                </td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={4} style={{ textAlign: "center", color: "rgb(var(--color-text-dim))", padding: "1rem" }}>No active personal requests.</td>
                              </tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                // Dept. Requests Table with dropdown filters, rows select and pagination
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "rgb(var(--color-text))" }}>Department Requests</h3>
                    
                    {/* Filters */}
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      {/* Initiator filter */}
                      <select
                        value={deptFilterInitiator}
                        onChange={(e) => { setDeptFilterInitiator(e.target.value); setDeptPage(1); }}
                        className="form-select"
                        style={{ width: "140px", fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
                      >
                        <option value="ALL">All Staff</option>
                        {Array.from(new Set(expenses.map(e => e.initiatorId?.name).filter(Boolean))).map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>

                      {/* Status filter */}
                      <select
                        value={deptFilterStatus}
                        onChange={(e) => { setDeptFilterStatus(e.target.value); setDeptPage(1); }}
                        className="form-select"
                        style={{ width: "140px", fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
                      >
                        <option value="ALL">All Status</option>
                        <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
                        <option value="SENT_TO_FINANCE">AWAITING FINANCE</option>
                        <option value="PENDING_EXCEPTIONAL">SLA ALERT</option>
                        <option value="UPLOADED_TO_BANK">PROCESSING</option>
                        <option value="APPROVED">APPROVED</option>
                      </select>
                    </div>
                  </div>

                  {/* Dept Requests Table */}
                  <div className="glass-panel" style={{ padding: "1.25rem" }}>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Initiator</th>
                            <th>Request ID</th>
                            <th>Category</th>
                            <th>Amount (₦)</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const filtered = expenses.filter(e => {
                              // Gated to department of the current user
                              const inDept = currentUser?.role === "ADMIN" || e.departmentId === currentUser?.departmentId || e.initiatorId?.departmentId === currentUser?.departmentId || (e.departmentId as any)?.name === currentUser?.departmentName;
                              if (!inDept) return false;

                              if (!matchesControls(e)) return false;

                              // Filter by Initiator
                              if (deptFilterInitiator !== "ALL" && e.initiatorId?.name !== deptFilterInitiator) return false;

                              // Filter by status dropdown
                              if (deptFilterStatus !== "ALL" && e.status !== deptFilterStatus) return false;

                              // Exclude drafts that are not submitted
                              if (e.status === "DRAFT") return false;

                              return true;
                            });

                            // Pagination
                            const totalCount = filtered.length;
                            const totalPages = Math.ceil(totalCount / deptRowsPerPage) || 1;
                            const startIndex = (deptPage - 1) * deptRowsPerPage;
                            const paginated = filtered.slice(startIndex, startIndex + deptRowsPerPage);

                            return (
                              <>
                                {paginated.length > 0 ? paginated.map((exp) => (
                                  <tr key={exp._id} onClick={() => setSelectedExpense(exp)} style={{ cursor: "pointer" }}>
                                    <td style={{ fontWeight: "600" }}>{exp.initiatorId?.name || "System"}</td>
                                    <td><strong>{exp.requestNumber}</strong></td>
                                    <td>{exp.category}</td>
                                    <td>{formatNaira(exp.amount)}</td>
                                    <td>{formatDate(exp.createdAt)}</td>
                                    <td>
                                      {(() => {
                                        let label = exp.status;
                                        let badgeClass = "badge-pending";
                                        if (exp.status === "PENDING_APPROVAL") { label = "PENDING"; badgeClass = "badge-pending"; }
                                        else if (exp.status === "SENT_TO_FINANCE") { label = "AWAITING FINANCE"; badgeClass = "badge-budget-check"; }
                                        else if (exp.status === "PENDING_EXCEPTIONAL") { label = "SLA ALERT"; badgeClass = "badge-exceptional"; }
                                        else if (exp.status === "UPLOADED_TO_BANK") { label = "PROCESSING"; badgeClass = "badge-pending"; }
                                        else if (exp.status === "APPROVED") { label = "APPROVED"; badgeClass = "badge-approved"; }
                                        else if (exp.status === "PAID") { label = "PAID"; badgeClass = "badge-approved"; }
                                        return <span className={`badge ${badgeClass}`}>{label}</span>;
                                      })()}
                                    </td>
                                    <td>
                                      <Icons.ChevronRight size={16} style={{ color: "rgb(var(--color-text-dim))" }} />
                                    </td>
                                  </tr>
                                )) : (
                                  <tr>
                                    <td colSpan={7} style={{ textAlign: "center", color: "rgb(var(--color-text-dim))", padding: "2rem" }}>No department submissions match your criteria.</td>
                                  </tr>
                                )}
                                
                                {totalCount > 0 && (
                                  <tr style={{ background: "none" }}>
                                    <td colSpan={7} style={{ border: "none", padding: "1rem 0 0" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                                        <span style={{ color: "rgb(var(--color-text-dim))" }}>Showing {startIndex + 1}-{Math.min(startIndex + deptRowsPerPage, totalCount)} of {totalCount} requests</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                            <span style={{ color: "rgb(var(--color-text-dim))" }}>Rows per page:</span>
                                            <select
                                              value={deptRowsPerPage}
                                              onChange={(e) => { setDeptRowsPerPage(Number(e.target.value)); setDeptPage(1); }}
                                              className="form-select"
                                              style={{ width: "65px", padding: "0.25rem", fontSize: "0.8rem" }}
                                            >
                                              <option value={5}>5</option>
                                              <option value={10}>10</option>
                                              <option value={20}>20</option>
                                            </select>
                                          </div>
                                          <div style={{ display: "flex", gap: "0.25rem" }}>
                                            <button onClick={() => setDeptPage(Math.max(1, deptPage - 1))} disabled={deptPage === 1} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem" }}>&lt;</button>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                                              <button key={pg} onClick={() => setDeptPage(pg)} className={`btn ${pg === deptPage ? "btn-primary" : "btn-secondary"}`} style={{ padding: "0.25rem 0.5rem" }}>{pg}</button>
                                            ))}
                                            <button onClick={() => setDeptPage(Math.min(totalPages, deptPage + 1))} disabled={deptPage === totalPages} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem" }}>&gt;</button>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
