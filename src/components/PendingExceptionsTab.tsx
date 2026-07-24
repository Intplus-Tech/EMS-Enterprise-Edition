import React, { useState } from "react";
import * as Icons from "lucide-react";
import { RequestJustificationModal } from "./RequestJustificationModal";
import { ApproveExpansionModal } from "./ApproveExpansionModal";
import { RejectExpansionModal } from "./RejectExpansionModal";

interface PendingExceptionsTabProps {
  currentUser?: any;
  expenses?: any[];
  setSelectedExpense?: (expense: any) => void;
  loadDashboardData?: (user: any) => Promise<void>;
  onBackToDashboard?: () => void;
}

export const PendingExceptionsTab: React.FC<PendingExceptionsTabProps> = ({
  currentUser,
  expenses = [],
  setSelectedExpense,
  loadDashboardData,
  onBackToDashboard
}) => {
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Exceptional request details matching exact screenshot
  const requestDetails = {
    requestNumber: "#0044",
    department: "IT",
    departmentFull: "IT Dept",
    category: "Infrastructure",
    amount: 47200,
    employee: "Blessing Okafor",
    description: "Emergency Data Centre Cooling Unit. Replacement needed to prevent server downtime and potential hardware failure across the primary enterprise cluster.",
    requiredDate: "2026-07-20",
    createdDate: "2026-07-11",
    daysWaiting: 3,
    supportingDocuments: [
      { name: "Invoice.pdf", size: "1.2 MB" },
      { name: "Quote.pdf", size: "850 KB" }
    ]
  };

  // Budget context numbers matching exact screenshot
  const budgetContext = {
    deptCode: "IT Dept - FY 2026",
    totalAnnualBudget: 250000,
    utilizedYTD: 223800,
    remaining: 26200,
    criticalGap: 21000,
    budgetItems: [
      { category: "Hardware", allocated: 80000, rem: 5000, isZero: false, isNegative: false },
      { category: "Software", allocated: 70000, rem: 1200, isZero: false, isNegative: false },
      { category: "Maintenance", allocated: 50000, rem: 0, isZero: true, isNegative: false },
      { category: "Infrastructure", allocated: 50000, rem: 20000, isZero: false, isNegative: true }
    ]
  };

  // History timeline records matching screenshot
  const historyTimeline = [
    {
      id: "hist-1",
      actor: "J. Okafor (Initiator)",
      timestamp: "2026-07-11 09:15",
      comment: '"Data centre cooling unit failed. Emergency replacement needed to prevent server downtime."',
      isOverbudget: false
    },
    {
      id: "hist-2",
      actor: "K. Adeyemi (Dept Approver)",
      timestamp: "2026-07-11 14:30",
      comment: '"Approved. This is critical infrastructure. Sending to Finance Officer for processing."',
      isOverbudget: false
    },
    {
      id: "hist-3",
      actor: "D. Park (Finance Officer)",
      timestamp: "2026-07-12 08:00",
      comment: '"Over-budget by ₦21,000. Forwarding to Finance Head for exceptional approval."',
      isOverbudget: true
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
                  ₦{requestDetails.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: "0.725rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
                  EMPLOYEE
                </span>
                <strong style={{ fontSize: "0.95rem", color: "rgb(var(--color-text))" }}>{requestDetails.employee}</strong>
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
                    onClick={() => alert(`Simulated preview/download for ${doc.name}`)}
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

                      <p style={{ fontSize: "0.875rem", fontStyle: "italic", color: item.isOverbudget ? "#991B1B" : "#334155", margin: 0, lineHeight: 1.5, fontWeight: item.isOverbudget ? "600" : "normal" }}>
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
                {budgetContext.deptCode}
              </span>
            </div>

            {/* Total Annual Budget */}
            <div style={{ background: "rgba(239, 246, 255, 0.8)", border: "1px solid #BFDBFE", borderRadius: "10px", padding: "1rem 1.15rem" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.2rem" }}>
                TOTAL ANNUAL BUDGET
              </span>
              <span style={{ fontSize: "1.45rem", fontWeight: "800", color: "#0F172A" }}>
                ₦{budgetContext.totalAnnualBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* 2-Column Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ background: "rgba(239, 246, 255, 0.8)", border: "1px solid #BFDBFE", borderRadius: "10px", padding: "0.85rem 1rem" }}>
                <span style={{ fontSize: "0.675rem", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.2rem" }}>
                  UTILIZED YTD
                </span>
                <span style={{ fontSize: "1.05rem", fontWeight: "800", color: "#0F172A" }}>
                  ₦{budgetContext.utilizedYTD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ background: "rgba(239, 246, 255, 0.8)", border: "1px solid #BFDBFE", borderRadius: "10px", padding: "0.85rem 1rem" }}>
                <span style={{ fontSize: "0.675rem", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.2rem" }}>
                  REMAINING
                </span>
                <span style={{ fontSize: "1.05rem", fontWeight: "800", color: "#2563EB" }}>
                  ₦{budgetContext.remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  -₦{budgetContext.criticalGap.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    {budgetContext.budgetItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < budgetContext.budgetItems.length - 1 ? "1px solid rgba(var(--color-card-border), 0.3)" : "none" }}>
                        <td style={{ padding: "0.6rem 0.75rem", fontWeight: "600", color: item.isNegative ? "#2563EB" : "rgb(var(--color-text))" }}>{item.category}</td>
                        <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "rgb(var(--color-text-muted))" }}>₦{item.allocated.toLocaleString()}</td>
                        <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: "700", color: item.isZero ? "#DC2626" : item.isNegative ? "#DC2626" : "#2563EB" }}>
                          {item.isZero ? "₦0" : `₦${item.rem.toLocaleString()}`}
                        </td>
                      </tr>
                    ))}
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
              color: "#334155",
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
        remainingBudget={budgetContext.remaining}
        deficitAmount={budgetContext.criticalGap}
        onConfirm={async (notes) => {
          alert("One-Time Budget Expansion Authorized successfully!");
          setShowApproveModal(false);
          if (loadDashboardData && currentUser) await loadDashboardData(currentUser);
        }}
      />

      <RejectExpansionModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        requestNumber={requestDetails.requestNumber}
        requestAmount={requestDetails.amount}
        remainingBudget={budgetContext.remaining}
        deficitAmount={budgetContext.criticalGap}
        onConfirm={async (reason) => {
          alert("Budget Expansion Request Rejected successfully.");
          setShowRejectModal(false);
          if (loadDashboardData && currentUser) await loadDashboardData(currentUser);
        }}
      />
    </div>
  );
};
