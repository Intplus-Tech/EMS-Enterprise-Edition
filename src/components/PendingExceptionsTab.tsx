import React, { useState } from "react";
import * as Icons from "lucide-react";
import { RequestJustificationModal } from "./RequestJustificationModal";
import { ApproveExpansionModal } from "./ApproveExpansionModal";
import { RejectExpansionModal } from "./RejectExpansionModal";
import type { ExpenseActions } from "../app/(dashboard)/hooks/useExpenseActions";
import { AttachmentDto, BudgetContextDto } from "../types/api";
import { AttachmentTarget } from "./modals/AttachmentViewModal";
import { formatNaira, formatNairaPrecise } from "./ui/format";

interface PendingExceptionsTabProps {
  currentUser?: any;
  /**
   * The exception the Finance Head opened from the queue.
   *
   * This screen used to ignore the selection and re-derive its own target with
   * `expenses.find(first pending exceptional)`, so reviewing the third row in
   * the list approved the budget expansion on the first.
   */
  request: any;
  setSelectedExpense?: (expense: any) => void;
  /** Budget-expansion operations injected by the page; no I/O happens here. */
  actions: ExpenseActions;
  /** Real budget position for the selected request; null while loading. */
  budgetContext: BudgetContextDto | null;
  /** Opens a supporting document in the shared attachment viewer. */
  onViewAttachment: (attachment: AttachmentTarget) => void;
  onBackToDashboard?: () => void;
}

export const PendingExceptionsTab: React.FC<PendingExceptionsTabProps> = ({
  currentUser,
  request,
  setSelectedExpense,
  actions,
  budgetContext,
  onViewAttachment,
  onBackToDashboard
}) => {
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // The request under review is whatever the queue handed over — never a
  // re-derived "first pending exception".
  const targetExp = request;

  const requestDetails = targetExp ? {
    requestNumber: targetExp.requestNumber ? `#${targetExp.requestNumber.replace(/^REQ-/, '')}` : `#${targetExp._id?.slice(-4)}`,
    department: (targetExp.departmentId as any)?.name || targetExp.departmentName || "General",
    departmentFull: `${(targetExp.departmentId as any)?.name || targetExp.departmentName || "General"} Dept`,
    category: targetExp.category || "Operations",
    amount: targetExp.amount || 0,
    employee: (targetExp.initiatorId as any)?.name || "Staff Member",
    description: targetExp.description || "No description provided.",
    requiredDate: targetExp.requiredPaymentDate ? new Date(targetExp.requiredPaymentDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    createdDate: targetExp.createdAt ? new Date(targetExp.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    daysWaiting: Math.max(1, Math.floor((Date.now() - new Date(targetExp.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24))),
    // Real document set, back-filled from the legacy field for older records.
    supportingDocuments: (targetExp.attachments ?? []) as AttachmentDto[]
  } : {
    requestNumber: "#----",
    department: "N/A",
    departmentFull: "No Pending Exception Selected",
    category: "N/A",
    amount: 0,
    employee: "N/A",
    description: "No pending exceptional expenses in queue.",
    requiredDate: "-",
    createdDate: "-",
    daysWaiting: 0,
    supportingDocuments: [] as AttachmentDto[]
  };

  // Budget figures come from the server (see useBudgetContext). They were
  // previously derived from the request amount itself — a hardcoded ₦250,000
  // ceiling with `amount * 0.8` "utilised" — so the numbers a Finance Head read
  // while authorising an over-budget request were unrelated to the department.
  const hasBudget = Boolean(budgetContext?.hasBudget);

  const historyTimeline: any[] = targetExp?.history && targetExp.history.length > 0 ? targetExp.history.map((h: any, idx: number) => ({
    id: `hist-${idx}`,
    actor: `${h.actorName || "User"} (${h.actorRole || "Staff"})`,
    timestamp: h.timestamp ? new Date(h.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A",
    comment: h.comment ? `"${h.comment}"` : '"Status updated."',
    isOverbudget: Boolean(h.action?.includes("EXCEPTIONAL") || h.action?.includes("BUDGET"))
  })) : [
    {
      id: "hist-1",
      actor: `${requestDetails.employee} (Initiator)`,
      timestamp: requestDetails.createdDate,
      comment: `"${requestDetails.description}"`,
      isOverbudget: false
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", position: "relative", paddingBottom: "5rem" }}>
      {/* Sub-header navigation link */}
      <div>
        <button
          onClick={() => onBackToDashboard && onBackToDashboard()}
          style={{
            background: "none",
            border: "none",
            color: "#2563EB",
            fontWeight: "600",
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: 0,
            marginBottom: "0.6rem"
          }}
        >
          <Icons.ArrowLeft size={16} /> Back to Dashboard
        </button>

        {/* Main Title */}
        <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "rgb(var(--color-text))", letterSpacing: "-0.02em", margin: 0 }}>
          Exceptional Approval - Request {requestDetails.requestNumber} ({requestDetails.departmentFull})
        </h1>

        {/* Badges Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
          {/* Status Badge */}
          <span
            style={{
              padding: "0.35rem 0.85rem",
              borderRadius: "999px",
              background: "rgba(245, 158, 11, 0.15)",
              color: "#D97706",
              fontWeight: "700",
              fontSize: "0.75rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              border: "1px solid rgba(245, 158, 11, 0.3)"
            }}
          >
            <Icons.Lock size={13} /> PENDING EXCEPTIONAL APPROVAL
          </span>

          {/* Created Date Badge */}
          <span
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "8px",
              background: "rgba(var(--color-surface-secondary), 0.5)",
              border: "1px solid rgba(var(--color-card-border), 0.4)",
              color: "rgb(var(--color-text-muted))",
              fontWeight: "600",
              fontSize: "0.775rem",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            <Icons.Calendar size={13} /> Created: {requestDetails.createdDate}
          </span>

          {/* Days Waiting Badge */}
          <span
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "8px",
              background: "#DBEAFE",
              color: "#1E40AF",
              fontWeight: "700",
              fontSize: "0.725rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase"
            }}
          >
            DAYS WAITING: {requestDetails.daysWaiting}
          </span>
        </div>
      </div>

      {/* Main 2-Column Body Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "1.5rem" }}>
        {/* Left Column: Request Details & History */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Card 1: Request Details */}
          <div
            className="glass-card"
            style={{
              background: "rgb(var(--color-card))",
              border: "1px solid rgba(var(--color-card-border), 0.5)",
              borderRadius: "16px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              boxShadow: "var(--shadow-sm)"
            }}
          >
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "rgb(var(--color-text))", margin: 0, paddingBottom: "0.75rem", borderBottom: "1px solid rgba(var(--color-card-border), 0.4)" }}>
              Request Details
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem 2rem" }}>
              <div>
                <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
                  DEPARTMENT
                </span>
                <strong style={{ fontSize: "0.95rem", color: "rgb(var(--color-text))" }}>{requestDetails.department}</strong>
              </div>

              <div>
                <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
                  CATEGORY
                </span>
                <strong style={{ fontSize: "0.95rem", color: "rgb(var(--color-text))" }}>{requestDetails.category}</strong>
              </div>

              <div>
                <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
                  AMOUNT
                </span>
                <strong style={{ fontSize: "1.25rem", fontWeight: "800", color: "#2563EB" }}>
                  {formatNairaPrecise(requestDetails.amount)}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
                  EMPLOYEE
                </span>
                <strong style={{ fontSize: "0.95rem", color: "rgb(var(--color-text))" }}>{requestDetails.employee}</strong>
              </div>

              {/* The design shows the request's CATEGORY here. This was a
                  "GL account code" select whose value was never read or sent —
                  it looked like a posting decision the Finance Head could make
                  and was not one. */}
              <div>
                <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
                  CATEGORY
                </span>
                <strong style={{ fontSize: "0.95rem", color: "rgb(var(--color-text))" }}>{requestDetails.category}</strong>
              </div>
            </div>

            <div>
              <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.35rem" }}>
                DESCRIPTION
              </span>
              <p style={{ fontSize: "0.875rem", color: "rgb(var(--color-text-muted))", lineHeight: "1.55", margin: 0 }}>
                {requestDetails.description}
              </p>
            </div>

            <div>
              <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.35rem" }}>
                REQUIRED DATE
              </span>
              <strong style={{ fontSize: "0.9rem", color: "rgb(var(--color-text))" }}>{requestDetails.requiredDate}</strong>
            </div>

            <div>
              <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.6rem" }}>
                SUPPORTING DOCUMENTS
              </span>
              <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap" }}>
                {requestDetails.supportingDocuments.map((doc, idx) => (
                  <button
                    key={idx}
                    onClick={() => onViewAttachment({ ...doc, requestNumber: requestDetails.requestNumber })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      padding: "0.5rem 0.85rem",
                      borderRadius: "8px",
                      border: "1px solid rgba(var(--color-card-border), 0.5)",
                      background: "rgba(var(--color-surface-secondary), 0.5)",
                      color: "rgb(var(--color-text))",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    <Icons.FileText size={16} style={{ color: "#EF4444" }} />
                    <span>{doc.name}</span>
                    <Icons.Download size={14} style={{ color: "rgb(var(--color-text-dim))", marginLeft: "0.2rem" }} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: History & Communication */}
          <div
            className="glass-card"
            style={{
              background: "rgb(var(--color-card))",
              border: "1px solid rgba(var(--color-card-border), 0.5)",
              borderRadius: "16px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              boxShadow: "var(--shadow-sm)"
            }}
          >
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "rgb(var(--color-text))", margin: 0, paddingBottom: "0.75rem", borderBottom: "1px solid rgba(var(--color-card-border), 0.4)" }}>
              History & Communication
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "relative" }}>
              {historyTimeline.map((item, index) => {
                const isLast = index === historyTimeline.length - 1;
                return (
                  <div key={item.id} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", position: "relative" }}>
                    {!isLast && (
                      <div
                        style={{
                          position: "absolute",
                          left: "6px",
                          top: "22px",
                          bottom: "-18px",
                          width: "2px",
                          background: "rgba(var(--color-card-border), 0.4)"
                        }}
                      />
                    )}

                    {/* Timeline dot */}
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        backgroundColor: item.isOverbudget ? "#DC2626" : "#2563EB",
                        marginTop: "4px",
                        flexShrink: 0,
                        zIndex: 2
                      }}
                    />

                    {/* Message Box */}
                    <div
                      style={{
                        flexGrow: 1,
                        background: item.isOverbudget ? "rgba(254, 226, 226, 0.5)" : "rgba(239, 246, 255, 0.6)",
                        border: item.isOverbudget ? "1px solid #FCA5A5" : "1px solid #BFDBFE",
                        borderRadius: "10px",
                        padding: "0.9rem 1.15rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.4rem"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.825rem", fontWeight: "700", color: item.isOverbudget ? "#B91C1C" : "#1E293B" }}>
                          {item.actor}
                        </span>
                        <span style={{ fontSize: "0.725rem", color: "rgb(var(--color-text-dim))" }}>
                          {item.timestamp}
                        </span>
                      </div>

                      <p style={{ fontSize: "0.875rem", fontStyle: "italic", color: item.isOverbudget ? "#991B1B" : "rgb(var(--color-card-border))", margin: 0, lineHeight: 1.5, fontWeight: item.isOverbudget ? "600" : "normal" }}>
                        {item.comment}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Budget Context */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div
            className="glass-card"
            style={{
              background: "rgb(var(--color-card))",
              border: "1px solid rgba(var(--color-card-border), 0.5)",
              borderRadius: "16px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              boxShadow: "var(--shadow-sm)"
            }}
          >
            {/* Header & Dept Badge */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(var(--color-card-border), 0.4)", paddingBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "800", color: "rgb(var(--color-text))", margin: 0, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                BUDGET CONTEXT
              </h3>
              <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", padding: "0.2rem 0.6rem", borderRadius: "4px", background: "rgba(var(--color-surface-secondary), 0.6)" }}>
                {budgetContext?.periodLabel || requestDetails.departmentFull}
              </span>
            </div>

            {/* Total Annual Budget */}
            <div style={{ background: "rgba(239, 246, 255, 0.8)", border: "1px solid #BFDBFE", borderRadius: "10px", padding: "1rem 1.15rem" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.2rem" }}>
                TOTAL ANNUAL BUDGET
              </span>
              <span style={{ fontSize: "1.45rem", fontWeight: "800", color: "#0F172A" }}>
                {hasBudget ? formatNairaPrecise(budgetContext?.totalBudget) : "Not configured"}
              </span>
            </div>

            {/* 2-Column Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ background: "rgba(239, 246, 255, 0.8)", border: "1px solid #BFDBFE", borderRadius: "10px", padding: "0.85rem 1rem" }}>
                <span style={{ fontSize: "0.675rem", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.2rem" }}>
                  UTILIZED YTD
                </span>
                <span style={{ fontSize: "1.05rem", fontWeight: "800", color: "#0F172A" }}>
                  {formatNairaPrecise(budgetContext?.utilisedYTD)}
                </span>
              </div>

              <div style={{ background: "rgba(239, 246, 255, 0.8)", border: "1px solid #BFDBFE", borderRadius: "10px", padding: "0.85rem 1rem" }}>
                <span style={{ fontSize: "0.675rem", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.2rem" }}>
                  REMAINING
                </span>
                <span style={{ fontSize: "1.05rem", fontWeight: "800", color: "#2563EB" }}>
                  {formatNairaPrecise(budgetContext?.remaining)}
                </span>
              </div>
            </div>

            {/* Critical Budget Gap Red Box */}
            <div
              style={{
                background: "rgba(254, 226, 226, 0.6)",
                border: "1px solid #FCA5A5",
                borderRadius: "12px",
                padding: "1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <span style={{ fontSize: "0.7rem", fontWeight: "800", color: "#B91C1C", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.2rem" }}>
                  CRITICAL BUDGET GAP
                </span>
                <span style={{ fontSize: "1.75rem", fontWeight: "800", color: "#DC2626", letterSpacing: "-0.02em" }}>
                  {`-${formatNairaPrecise(budgetContext?.criticalGap)}`}
                </span>
              </div>

              <Icons.AlertTriangle size={36} style={{ color: "#DC2626", opacity: 0.8 }} />
            </div>

            {/* Budget Item Table */}
            <div>
              <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "rgb(var(--color-text))", display: "block", marginBottom: "0.6rem" }}>
                Budget Item
              </span>

              <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(var(--color-card-border), 0.4)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: "rgba(239, 246, 255, 0.9)", borderBottom: "1px solid #BFDBFE" }}>
                      <th style={{ padding: "0.55rem 0.75rem", textAlign: "left", fontSize: "0.675rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>CATEGORY</th>
                      <th style={{ padding: "0.55rem 0.75rem", textAlign: "right", fontSize: "0.675rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>ALLOCATED</th>
                      <th style={{ padding: "0.55rem 0.75rem", textAlign: "right", fontSize: "0.675rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>REM.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(budgetContext?.lineItems ?? []).map((item, idx, all) => (
                      <tr key={item.category} style={{ borderBottom: idx < all.length - 1 ? "1px solid rgba(var(--color-card-border), 0.3)" : "none" }}>
                        <td style={{ padding: "0.6rem 0.75rem", fontWeight: "600", color: item.isRequestCategory ? "#2563EB" : "rgb(var(--color-text))" }}>{item.category}</td>
                        <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "rgb(var(--color-text-muted))" }}>{formatNaira(item.allocated)}</td>
                        <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: "700", color: item.remaining <= 0 ? "#DC2626" : "#2563EB" }}>
                          {formatNaira(item.remaining)}
                        </td>
                      </tr>
                    ))}
                    {/* No allocation lines configured for this period. */}
                    {(budgetContext?.lineItems ?? []).length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ padding: "0.85rem 0.75rem", textAlign: "center", color: "rgb(var(--color-text-dim))" }}>
                          No budget line items configured for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          left: "260px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid #E2E8F0",
          padding: "1rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.05)",
          zIndex: 90
        }}
      >
        <div>
          <span style={{ fontSize: "0.8rem", fontWeight: "800", color: "#1E293B", display: "block" }}>
            Action Required
          </span>
          <span style={{ fontSize: "0.8rem", color: "#64748B" }}>
            Exceptional Approval for ₦{requestDetails.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({requestDetails.departmentFull})
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.85rem", alignItems: "center" }}>
          {/* Request Justification button */}
          <button
            onClick={() => setShowJustificationModal(true)}
            className="btn btn-secondary"
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: "600",
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "rgb(var(--color-card-border))",
              cursor: "pointer"
            }}
          >
            Request Justification
          </button>

          {/* Reject button */}
          <button
            onClick={() => setShowRejectModal(true)}
            className="btn btn-secondary"
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: "600",
              border: "1px solid #FCA5A5",
              background: "#FEF2F2",
              color: "#B91C1C",
              cursor: "pointer"
            }}
          >
            Reject
          </button>

          {/* Approve One-Time Expansion button */}
          <button
            onClick={() => setShowApproveModal(true)}
            className="btn btn-primary"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: "700",
              background: "#2563EB",
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)"
            }}
          >
            <Icons.CheckCircle size={16} /> Approve One-Time Expansion
          </button>
        </div>
      </div>

      {/* Modals */}
      <RequestJustificationModal
        isOpen={showJustificationModal}
        onClose={() => setShowJustificationModal(false)}
        requestNumber={requestDetails.requestNumber}
        requestTitle={requestDetails.description}
      />

      <ApproveExpansionModal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        requestNumber={requestDetails.requestNumber}
        requestAmount={requestDetails.amount}
        remainingBudget={budgetContext?.remaining ?? 0}
        deficitAmount={budgetContext?.criticalGap ?? 0}
        onConfirm={async (notes, signature) => {
          if (!targetExp?._id) return;
          // Only close on a confirmed save — the previous version reported
          // success even when the request had failed.
          if (await actions.approveExpansion(targetExp._id, notes, signature)) {
            setShowApproveModal(false);
          }
        }}
      />

      <RejectExpansionModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        requestNumber={requestDetails.requestNumber}
        requestAmount={requestDetails.amount}
        remainingBudget={budgetContext?.remaining ?? 0}
        deficitAmount={budgetContext?.criticalGap ?? 0}
        onConfirm={async (reason, signature) => {
          if (!targetExp?._id) return;
          if (await actions.rejectExpansion(targetExp._id, reason, signature)) {
            setShowRejectModal(false);
          }
        }}
      />
    </div>
  );
};
