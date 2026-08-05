"use client";

import React from "react";
import * as Icons from "lucide-react";
import { WorkflowActionType } from "../../enums/workflowActions";
import { BANK_STAGE_STATUSES } from "../../enums/statuses";
import { AttachmentTarget } from "./AttachmentViewModal";
import { AttachmentList } from "../ui/AttachmentList";
import { ElectronicSignatureField } from "../ui/ElectronicSignatureField";
import { formatNaira, humanizeStatus, statusBadgeClass } from "../ui/format";

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
  /** Identity re-confirmation; the server rejects a decision without it. */
  decisionSignature: string;
  setDecisionSignature: (signature: string) => void;
  handleCancelRequest: (id: string) => Promise<void>;
  handleExceptionalBudgetAction: (id: string, action: WorkflowActionType) => Promise<void>;
  handleWorkflowAction: (id: string, action: WorkflowActionType) => Promise<void>;
  /** Opens the supporting document in the shared attachment viewer. */
  onViewAttachment: (attachment: AttachmentTarget) => void;
  onAddAttachments: (requestId: string, files: FileList | File[]) => void;
  onRemoveAttachment: (requestId: string, attachmentId: string) => void;
  attachmentsUploading?: boolean;
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
  decisionSignature,
  setDecisionSignature,
  handleCancelRequest,
  handleExceptionalBudgetAction,
  handleWorkflowAction,
  handleFinanceUpload,
  handlePaymentRelease,
  onViewAttachment,
  onAddAttachments,
  onRemoveAttachment,
  attachmentsUploading = false,
}) => {
  if (!selectedExpense) return null;

  // The initiator owns the document set only while the request is still theirs
  // to edit; the server enforces the same rule.
  const canEditDocuments =
    currentUser?.role === "INITIATOR" && ["DRAFT", "RETURNED"].includes(selectedExpense.status);

  // Every decision button in this modal commits a financial transition, so all
  // of them are gated on the signature the server will verify.
  const signed = decisionSignature.trim().length > 0;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem", overflowY: "auto" }}>
      {/* This dialog predates ModalShell and owns its own chrome, so it carries
          `wrap-anywhere` itself: every value below is user-entered, and one
          unbroken description used to widen the card past its own maxWidth. */}
      <div className="glass-panel wrap-anywhere" style={{ width: "100%", maxWidth: "750px", maxHeight: "88vh", overflowY: "auto", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontWeight: "bold", fontSize: "1.25rem" }}>Request Details: {selectedExpense.requestNumber}</h3>
            {/* Shared status→class map; a class built from the status string
                (`badge-pending-approval`, …) matches nothing in globals.css. */}
            <span className={`badge ${statusBadgeClass(selectedExpense.status)}`}>{humanizeStatus(selectedExpense.status)}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
            <Icons.X size={24} />
          </button>
        </div>

        {currentUser?.role === "INITIATOR" ? (
          <>
            {/* Stepper tracking progress */}
            <div className="glass-card" style={{ background: "rgb(var(--color-surface-secondary) / 0.2)", padding: "1.25rem", position: "relative", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {[
                  { name: "Initiation", active: ["DRAFT", "SUBMITTED", "BUDGET_CHECK", "INSUFFICIENT_BUDGET", "PENDING_EXCEPTIONAL", "PENDING_APPROVAL", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "AWAITING_RELEASE", "PAID", "CLOSED"].includes(selectedExpense.status), current: ["DRAFT", "SUBMITTED", "BUDGET_CHECK", "INSUFFICIENT_BUDGET"].includes(selectedExpense.status) },
                  { name: "Approval", active: ["PENDING_EXCEPTIONAL", "PENDING_APPROVAL", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "AWAITING_RELEASE", "PAID", "CLOSED"].includes(selectedExpense.status), current: ["PENDING_EXCEPTIONAL", "PENDING_APPROVAL"].includes(selectedExpense.status) },
                  { name: "Finance", active: ["APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "AWAITING_RELEASE", "PAID", "CLOSED"].includes(selectedExpense.status), current: ["APPROVED", "SENT_TO_FINANCE"].includes(selectedExpense.status) },
                  { name: "Bank", active: ["UPLOADED_TO_BANK", "AWAITING_RELEASE", "PAID", "CLOSED"].includes(selectedExpense.status), current: BANK_STAGE_STATUSES.includes(selectedExpense.status) },
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
                        background: isActive ? "rgba(99, 102, 241, 0.2)" : isCompleted ? "rgba(16, 185, 129, 0.2)" : "rgb(var(--color-card-border) / 0.15)",
                        border: isActive ? "2px solid rgb(var(--color-primary))" : isCompleted ? "2px solid rgb(var(--color-secondary))" : "2px solid rgb(var(--color-card-border) / 0.35)",
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

            {/* minmax(0, …) rather than a bare 1fr: a grid track's default floor
                is its min-content width, which long free text pushes past the
                card. Matches AuthorizeReleaseModal and CompletedReleaseModal. */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "1.5rem" }}>
              {/* Left Column: Request Information */}
              <div className="glass-card" style={{ background: "rgb(var(--color-surface-secondary) / 0.3)" }}>
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
              <div className="glass-card" style={{ background: "rgb(var(--color-surface-secondary) / 0.3)", display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Real document set with a working upload. The count was
                    hardcoded to (1) and the size to "1.2 MB • Oct 14, 2023". */}
                <AttachmentList
                  attachments={selectedExpense.attachments ?? []}
                  onView={(a) => onViewAttachment({ ...a, requestNumber: selectedExpense.requestNumber })}
                  onAdd={canEditDocuments ? (files) => onAddAttachments(selectedExpense._id, files) : undefined}
                  onRemove={
                    canEditDocuments
                      ? (a) => a._id && onRemoveAttachment(selectedExpense._id, a._id)
                      : undefined
                  }
                  uploading={attachmentsUploading}
                />
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
            {/* Same floor as the initiator grid above — Purpose and the payee
                fields are both free text. */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "1.5rem" }}>
              <div className="glass-card" style={{ background: "rgb(var(--color-surface-secondary) / 0.3)" }}>
                <p style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>Request Parameters</p>
                <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span>Department: <strong>{selectedExpense.departmentId?.name}</strong></span>
                  <span>Category: <strong>{selectedExpense.category}</strong></span>
                  <span>Amount: <strong style={{ color: "rgb(var(--color-primary))" }}>${selectedExpense.amount?.toLocaleString()}</strong></span>
                  <span>Required By: <strong>{selectedExpense.requiredPaymentDate ? new Date(selectedExpense.requiredPaymentDate).toLocaleDateString() : 'N/A'}</strong></span>
                  <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>Purpose: <em>"{selectedExpense.description}"</em></span>
                </div>
              </div>

              <div className="glass-card" style={{ background: "rgb(var(--color-surface-secondary) / 0.3)" }}>
                <p style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>Vendor Bank Target</p>
                <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span>Payee: <strong>{selectedExpense.vendorName}</strong></span>
                  <span>Bank: <strong>{selectedExpense.vendorBankDetails?.bankName}</strong></span>
                  <span>Account: <strong>{selectedExpense.vendorBankDetails?.accountNumber}</strong></span>
                  <span>Name: <strong>{selectedExpense.vendorBankDetails?.accountName}</strong></span>
                  <span>Invoice Document: <a href="#" onClick={(e) => { e.preventDefault(); onViewAttachment({ url: selectedExpense.supportingDocument, requestNumber: selectedExpense.requestNumber }); }} style={{ color: "rgb(var(--color-primary))", textDecoration: "underline", cursor: "pointer" }}>{selectedExpense.supportingDocument}</a></span>
                </div>
              </div>
            </div>

            {/* Stepper tracking */}
            <div className="glass-card" style={{ background: "rgb(var(--color-surface-secondary) / 0.2)" }}>
              <p style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))", marginBottom: "1rem" }}>Execution Route Progress</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
                {[
                  { name: "Initiation", active: ["DRAFT", "SUBMITTED", "BUDGET_CHECK", "INSUFFICIENT_BUDGET", "PENDING_EXCEPTIONAL", "PENDING_APPROVAL", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "AWAITING_RELEASE", "PAID", "CLOSED"].includes(selectedExpense.status) },
                  { name: "Budget Check", active: ["BUDGET_CHECK", "INSUFFICIENT_BUDGET", "PENDING_EXCEPTIONAL", "PENDING_APPROVAL", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "AWAITING_RELEASE", "PAID", "CLOSED"].includes(selectedExpense.status) },
                  { name: "Approvals", active: ["PENDING_APPROVAL", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "AWAITING_RELEASE", "PAID", "CLOSED"].includes(selectedExpense.status) && selectedExpense.currentStepIndex > 0 },
                  { name: "Finance Audit", active: ["SENT_TO_FINANCE", "UPLOADED_TO_BANK", "AWAITING_RELEASE", "PAID", "CLOSED"].includes(selectedExpense.status) },
                  { name: "Payment Release", active: ["UPLOADED_TO_BANK", "AWAITING_RELEASE", "PAID", "CLOSED"].includes(selectedExpense.status) },
                  { name: "Closed", active: ["CLOSED"].includes(selectedExpense.status) }
                ].map((step, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
                    <div
                      style={{
                        width: "1.5rem",
                        height: "1.5rem",
                        borderRadius: "50%",
                        background: step.active ? "rgb(var(--color-secondary))" : "rgb(var(--color-card-border) / 0.15)",
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
              <div className="glass-card" style={{ border: "1px solid rgb(var(--color-accent) / 0.3)" }}>
                <p style={{ fontWeight: "bold", color: "rgb(var(--color-accent))", marginBottom: "0.5rem" }}>Finance Head Action Required: Budget Overrun detected</p>
                <div className="form-group">
                  <label className="form-label">Adjust Approved Amount (Optional)</label>
                  <input
                    type="number"
                    placeholder={`Original amount: ${formatNaira(selectedExpense.amount)}`}
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

                <div style={{ marginBottom: "1rem" }}>
                  <ElectronicSignatureField
                    value={decisionSignature}
                    onChange={setDecisionSignature}
                    description="Confirm your identity with your account password to authorise this budget expansion."
                  />
                </div>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                  <button onClick={() => handleExceptionalBudgetAction(selectedExpense._id, WorkflowActionType.RETURN)} className="btn btn-secondary" disabled={!signed}>
                    Return to Initiator
                  </button>
                  <button onClick={() => handleExceptionalBudgetAction(selectedExpense._id, WorkflowActionType.REJECT)} className="btn btn-danger" disabled={!signed}>
                    Reject Request
                  </button>
                  <button onClick={() => handleExceptionalBudgetAction(selectedExpense._id, WorkflowActionType.APPROVE)} className="btn btn-primary" style={{ background: "rgb(var(--color-secondary))" }} disabled={!signed}>
                    Authorize Budget Expansion
                  </button>
                </div>
              </div>
            )}

            {selectedExpense.status === "PENDING_APPROVAL" && (
              <div className="glass-card" style={{ border: "1px solid rgb(var(--color-primary) / 0.3)" }}>
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

                <div style={{ marginBottom: "1rem" }}>
                  <ElectronicSignatureField
                    value={decisionSignature}
                    onChange={setDecisionSignature}
                    description="Confirm your identity with your account password to record this decision."
                  />
                </div>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                  <button onClick={() => handleWorkflowAction(selectedExpense._id, WorkflowActionType.RETURN)} className="btn btn-secondary" disabled={!signed}>
                    Return to Initiator
                  </button>
                  <button onClick={() => handleWorkflowAction(selectedExpense._id, WorkflowActionType.REJECT)} className="btn btn-danger" disabled={!signed}>
                    Reject
                  </button>
                  <button onClick={() => handleWorkflowAction(selectedExpense._id, WorkflowActionType.APPROVE)} className="btn btn-primary" disabled={!signed}>
                    Approve Step
                  </button>
                </div>
              </div>
            )}

            {currentUser?.role === "FINANCE_OFFICER" && selectedExpense.status === "SENT_TO_FINANCE" && (
              <div className="glass-card" style={{ border: "1px solid rgb(var(--color-primary) / 0.3)" }}>
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

            {currentUser?.role === "FINANCE_MANAGER" && BANK_STAGE_STATUSES.includes(selectedExpense.status) && (
              <div className="glass-card" style={{ border: "1px solid rgb(var(--color-secondary) / 0.3)" }}>
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

                <div style={{ marginBottom: "1rem" }}>
                  <ElectronicSignatureField
                    value={decisionSignature}
                    onChange={setDecisionSignature}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => handlePaymentRelease(selectedExpense._id)} className="btn btn-primary" style={{ background: "rgb(var(--color-secondary))" }} disabled={!signed}>
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
                  <div key={index} style={{ padding: "0.75rem", background: "rgb(var(--color-card-border) / 0.12)", borderRadius: "4px", fontSize: "0.85rem" }}>
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
