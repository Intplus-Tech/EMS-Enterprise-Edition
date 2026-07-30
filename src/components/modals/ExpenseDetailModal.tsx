"use client";

import React from "react";
import * as Icons from "lucide-react";
import { WorkflowActionType } from "../../enums/workflowActions";

interface ExpenseDetailModalProps {
  selectedExpense: any;
  currentUser: any;
  onClose: () => void;
  actionComment: string;
  setActionComment: (comment: string) => void;
  adjustedAmount: number;
  setAdjustedAmount: (amount: number) => void;
  paymentRef: string;
  setPaymentRef: (ref: string) => void;
  handleCancelRequest: (id: string) => Promise<void>;
  handleExceptionalBudgetAction: (id: string, action: WorkflowActionType) => Promise<void>;
  handleWorkflowAction: (id: string, action: WorkflowActionType) => Promise<void>;
  handleFinanceUpload: (id: string) => Promise<void>;
  handlePaymentRelease: (id: string) => Promise<void>;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  selectedExpense,
  currentUser,
  onClose,
  actionComment,
  setActionComment,
  adjustedAmount,
  setAdjustedAmount,
  paymentRef,
  setPaymentRef,
  handleCancelRequest,
  handleExceptionalBudgetAction,
  handleWorkflowAction,
  handleFinanceUpload,
  handlePaymentRelease,
}) => {
  if (!selectedExpense) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem", overflowY: "auto" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "750px", maxHeight: "88vh", overflowY: "auto", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontWeight: "bold", fontSize: "1.25rem" }}>Request Details: {selectedExpense.requestNumber}</h3>
            <span className={`badge badge-${selectedExpense.status?.toLowerCase().replace(/_/g, '-')}`}>{selectedExpense.status}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
            <Icons.X size={24} />
          </button>
        </div>

        {currentUser?.role === "INITIATOR" ? (
          <>
            {/* Stepper tracking progress */}
            <div className="glass-card" style={{ background: "rgba(15,23,42,0.2)", padding: "1.25rem", position: "relative", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {[
                  { name: "Initiation", active: ["DRAFT", "SUBMITTED", "BUDGET_CHECK", "INSUFFICIENT_BUDGET", "PENDING_EXCEPTIONAL", "PENDING_APPROVAL", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status), current: ["DRAFT", "SUBMITTED", "BUDGET_CHECK", "INSUFFICIENT_BUDGET"].includes(selectedExpense.status) },
                  { name: "Approval", active: ["PENDING_EXCEPTIONAL", "PENDING_APPROVAL", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status), current: ["PENDING_EXCEPTIONAL", "PENDING_APPROVAL"].includes(selectedExpense.status) },
                  { name: "Finance", active: ["APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status), current: ["APPROVED", "SENT_TO_FINANCE"].includes(selectedExpense.status) },
                  { name: "Bank", active: ["UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status), current: ["UPLOADED_TO_BANK"].includes(selectedExpense.status) },
                  { name: "Paid", active: ["PAID", "CLOSED"].includes(selectedExpense.status), current: ["PAID"].includes(selectedExpense.status) },
                  { name: "Closed", active: ["CLOSED"].includes(selectedExpense.status), current: ["CLOSED"].includes(selectedExpense.status) }
                ].map((step, idx) => {
                  const isCompleted = step.active && !step.current;
                  const isActive = step.current;
                  return (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, textAlign: "center", zIndex: 2 }}>
                      <div style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "50%",
                        background: isActive ? "rgba(99, 102, 241, 0.2)" : isCompleted ? "rgba(16, 185, 129, 0.2)" : "rgba(var(--color-card-border), 0.15)",
                        border: isActive ? "2px solid rgb(var(--color-primary))" : isCompleted ? "2px solid rgb(var(--color-secondary))" : "2px solid rgba(var(--color-card-border), 0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: isActive ? "rgb(var(--color-primary))" : isCompleted ? "rgb(var(--color-secondary))" : "rgb(var(--color-text-dim))"
                      }}>
                        {isCompleted ? <Icons.Check size={16} /> : (idx + 1)}
                      </div>
                      <span style={{ fontSize: "0.7rem", marginTop: "0.25rem", color: step.active ? "rgb(var(--color-text))" : "rgb(var(--color-text-dim))", fontWeight: step.active ? "600" : "normal" }}>{step.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              {/* Left Column: Request Information */}
              <div className="glass-card" style={{ background: "rgba(15,23,42,0.3)" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: "bold", textTransform: "uppercase", color: "rgb(var(--color-text-dim))", marginBottom: "1rem" }}>Request Information</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.9rem" }}>
                  <div>
                    <span style={{ color: "rgb(var(--color-text-dim))", display: "block", fontSize: "0.75rem", marginBottom: "0.15rem" }}>Vendor Name</span>
                    <strong>{selectedExpense.vendorName || "Not Specified"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "rgb(var(--color-text-dim))", display: "block", fontSize: "0.75rem", marginBottom: "0.15rem" }}>Expense Category</span>
                    <strong>{selectedExpense.category}</strong>
                  </div>
                  <div>
                    <span style={{ color: "rgb(var(--color-text-dim))", display: "block", fontSize: "0.75rem", marginBottom: "0.15rem" }}>Payment Method</span>
                    <strong>Bank Transfer ({selectedExpense.vendorBankDetails?.bankName || "ACH"})</strong>
                  </div>
                  <div>
                    <span style={{ color: "rgb(var(--color-text-dim))", display: "block", fontSize: "0.75rem", marginBottom: "0.15rem" }}>Description / Business Purpose</span>
                    <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem", lineHeight: "1.4", margin: 0 }}>"{selectedExpense.description}"</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Attachments */}
              <div className="glass-card" style={{ background: "rgba(15,23,42,0.3)", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: "bold", textTransform: "uppercase", color: "rgb(var(--color-text-dim))" }}>Attachments (1)</h4>
                
                {/* Attachment Item */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "rgba(var(--color-card-border), 0.1)", borderRadius: "8px", border: "1px solid rgba(var(--color-card-border), 0.2)" }}>
                  <Icons.FileText size={28} style={{ color: "rgb(var(--color-primary))", flexShrink: 0 }} />
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text))", fontWeight: "600", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", margin: 0 }}>
                      {selectedExpense.supportingDocument || "invoice_receipt.pdf"}
                    </p>
                    <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-dim))" }}>1.2 MB • Oct 14, 2023</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button onClick={() => alert("Simulated view for: " + selectedExpense.supportingDocument)} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                      View
                    </button>
                    <button onClick={() => alert("Simulated download for: " + selectedExpense.supportingDocument)} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                      Download
                    </button>
                  </div>
                </div>

                {/* Dropzone */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px dashed rgba(var(--color-card-border), 0.35)",
                  borderRadius: "8px",
                  padding: "1.5rem",
                  textAlign: "center",
                  background: "rgba(var(--color-card-border), 0.05)"
                }}>
                  <Icons.Upload size={24} style={{ color: "rgb(var(--color-text-dim))", marginBottom: "0.5rem" }} />
                  <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text))", fontWeight: "600" }}>Drop more files to attach</span>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem" }}>
              <div>
                {!["PAID", "CLOSED", "REJECTED", "CANCELLED"].includes(selectedExpense.status) && (
                  <button
                    onClick={() => handleCancelRequest(selectedExpense._id)}
                    className="btn btn-danger"
                    style={{ background: "#B91C1C" }}
                  >
                    Withdraw Request
                  </button>
                )}
              </div>
              <button onClick={onClose} className="btn btn-secondary">
                Close Details
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div className="glass-card" style={{ background: "rgba(15,23,42,0.3)" }}>
                <p style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>Request Parameters</p>
                <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span>Department: <strong>{selectedExpense.departmentId?.name}</strong></span>
                  <span>Category: <strong>{selectedExpense.category}</strong></span>
                  <span>Amount: <strong style={{ color: "rgb(var(--color-primary))" }}>${selectedExpense.amount?.toLocaleString()}</strong></span>
                  <span>Required By: <strong>{selectedExpense.requiredPaymentDate ? new Date(selectedExpense.requiredPaymentDate).toLocaleDateString() : 'N/A'}</strong></span>
                  <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>Purpose: <em>"{selectedExpense.description}"</em></span>
                </div>
              </div>

              <div className="glass-card" style={{ background: "rgba(15,23,42,0.3)" }}>
                <p style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>Vendor Bank Target</p>
                <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span>Payee: <strong>{selectedExpense.vendorName}</strong></span>
                  <span>Bank: <strong>{selectedExpense.vendorBankDetails?.bankName}</strong></span>
                  <span>Account: <strong>{selectedExpense.vendorBankDetails?.accountNumber}</strong></span>
                  <span>Name: <strong>{selectedExpense.vendorBankDetails?.accountName}</strong></span>
                  <span>Invoice Document: <a href="#" onClick={(e) => { e.preventDefault(); alert("Mock attachment download: " + selectedExpense.supportingDocument); }} style={{ color: "rgb(var(--color-primary))", textDecoration: "underline" }}>{selectedExpense.supportingDocument}</a></span>
                </div>
              </div>
            </div>

            {/* Stepper tracking */}
            <div className="glass-card" style={{ background: "rgba(15,23,42,0.2)" }}>
              <p style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))", marginBottom: "1rem" }}>Execution Route Progress</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
                {[
                  { name: "Initiation", active: ["DRAFT", "SUBMITTED", "BUDGET_CHECK", "PENDING_APPROVAL", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status) },
                  { name: "Budget Check", active: ["BUDGET_CHECK", "PENDING_APPROVAL", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status) },
                  { name: "Approvals", active: ["PENDING_APPROVAL", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status) && selectedExpense.currentStepIndex > 0 },
                  { name: "Finance Audit", active: ["SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status) },
                  { name: "Payment Release", active: ["UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status) },
                  { name: "Closed", active: ["CLOSED"].includes(selectedExpense.status) }
                ].map((step, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
                    <div
                      style={{
                        width: "1.5rem",
                        height: "1.5rem",
                        borderRadius: "50%",
                        background: step.active ? "rgb(var(--color-secondary))" : "rgba(var(--color-card-border), 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        color: step.active ? "rgb(var(--color-background))" : "rgb(var(--color-text-dim))"
                      }}
                    >
                      {step.active ? "✓" : idx + 1}
                    </div>
                    <span style={{ fontSize: "0.7rem", marginTop: "0.25rem", color: step.active ? "rgb(var(--color-text))" : "rgb(var(--color-text-dim))" }}>{step.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Transition action controllers */}
            {currentUser?.role === "FINANCE_HEAD" && selectedExpense.status === "PENDING_EXCEPTIONAL" && (
              <div className="glass-card" style={{ border: "1px solid rgba(var(--color-accent), 0.3)" }}>
                <p style={{ fontWeight: "bold", color: "rgb(var(--color-accent))", marginBottom: "0.5rem" }}>Finance Head Action Required: Budget Overrun detected</p>
                <div className="form-group">
                  <label className="form-label">Adjust Approved Amount (Optional)</label>
                  <input
                    type="number"
                    placeholder={`Original amount: $${selectedExpense.amount}`}
                    value={adjustedAmount || ""}
                    onChange={(e) => setAdjustedAmount(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Audit justification comments</label>
                  <textarea
                    rows={2}
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="Enter reason for budget expansion authorization..."
                    className="form-textarea"
                  />
                </div>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                  <button onClick={() => handleExceptionalBudgetAction(selectedExpense._id, WorkflowActionType.RETURN)} className="btn btn-secondary">
                    Return to Initiator
                  </button>
                  <button onClick={() => handleExceptionalBudgetAction(selectedExpense._id, WorkflowActionType.REJECT)} className="btn btn-danger">
                    Reject Request
                  </button>
                  <button onClick={() => handleExceptionalBudgetAction(selectedExpense._id, WorkflowActionType.APPROVE)} className="btn btn-primary" style={{ background: "rgb(var(--color-secondary))" }}>
                    Authorize Budget Expansion
                  </button>
                </div>
              </div>
            )}

            {selectedExpense.status === "PENDING_APPROVAL" && (
              <div className="glass-card" style={{ border: "1px solid rgba(var(--color-primary), 0.3)" }}>
                <p style={{ fontWeight: "bold", color: "rgb(var(--color-primary))", marginBottom: "0.5rem" }}>Workflow Approval Step Required</p>
                <div className="form-group">
                  <label className="form-label">Approval comments / details</label>
                  <textarea
                    rows={2}
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="Provide explanation for approve/reject/return actions..."
                    className="form-textarea"
                  />
                </div>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                  <button onClick={() => handleWorkflowAction(selectedExpense._id, WorkflowActionType.RETURN)} className="btn btn-secondary">
                    Return to Initiator
                  </button>
                  <button onClick={() => handleWorkflowAction(selectedExpense._id, WorkflowActionType.REJECT)} className="btn btn-danger">
                    Reject
                  </button>
                  <button onClick={() => handleWorkflowAction(selectedExpense._id, WorkflowActionType.APPROVE)} className="btn btn-primary">
                    Approve Step
                  </button>
                </div>
              </div>
            )}

            {currentUser?.role === "FINANCE_OFFICER" && selectedExpense.status === "SENT_TO_FINANCE" && (
              <div className="glass-card" style={{ border: "1px solid rgba(var(--color-primary), 0.3)" }}>
                <p style={{ fontWeight: "bold", color: "rgb(var(--color-primary))", marginBottom: "0.5rem" }}>Finance Officer Action: Payee Audit & Instruction Upload</p>
                <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", marginBottom: "1rem" }}>
                  Please confirm that the payee invoice attachment matches the requested amount. Then click the button below to upload the payment file to the banking system.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => handleFinanceUpload(selectedExpense._id)} className="btn btn-primary">
                    Verify & Upload to Bank Platform
                  </button>
                </div>
              </div>
            )}

            {currentUser?.role === "FINANCE_MANAGER" && selectedExpense.status === "UPLOADED_TO_BANK" && (
              <div className="glass-card" style={{ border: "1px solid rgba(var(--color-secondary), 0.3)" }}>
                <p style={{ fontWeight: "bold", color: "rgb(var(--color-secondary))", marginBottom: "0.5rem" }}>Finance Manager Action: Authorize Cash Release</p>
                <div className="form-group">
                  <label className="form-label">Bank Transaction Reference (Mandatory for ledger closure)</label>
                  <input
                    type="text"
                    required
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. TXN-10928374-RELEASE"
                    className="form-input"
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => handlePaymentRelease(selectedExpense._id)} className="btn btn-primary" style={{ background: "rgb(var(--color-secondary))" }}>
                    Release Cash Payment
                  </button>
                </div>
              </div>
            )}

            {/* Workflow logs history list */}
            <div>
              <p style={{ fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.5rem", color: "rgb(var(--color-text-muted))" }}>Approval Workflow History</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {selectedExpense.history?.map((hist: any, index: number) => (
                  <div key={index} style={{ padding: "0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "4px", fontSize: "0.85rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span><strong>{hist.actorName}</strong> ({hist.actorRole})</span>
                      <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))" }}>{new Date(hist.timestamp).toLocaleString()}</span>
                    </div>
                    <div>Action: <span style={{ color: "rgb(var(--color-accent))", fontWeight: "600" }}>{hist.action}</span></div>
                    {hist.comment && <div style={{ color: "rgb(var(--color-text-muted))", fontStyle: "italic", marginTop: "0.25rem" }}>Comment: "{hist.comment}"</div>}
                  </div>
                ))}
                {(!selectedExpense.history || selectedExpense.history.length === 0) && (
                  <p style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-dim))", fontStyle: "italic" }}>No routing records yet. Request is in Draft state.</p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button onClick={onClose} className="btn btn-secondary">
                Close details
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
