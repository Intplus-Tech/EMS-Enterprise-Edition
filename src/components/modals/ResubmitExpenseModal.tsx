"use client";

import React, { RefObject } from "react";
import * as Icons from "lucide-react";
import { AttachmentList } from "../ui/AttachmentList";
import { AttachmentDto, AttachmentInput } from "../../types/api";

interface ResubmitExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedResubmitExpense: any;
  formError: string;
  resubmitForm: any;
  setResubmitForm: React.Dispatch<React.SetStateAction<any>>;
  resubmitFileInputRef: RefObject<HTMLInputElement | null>;
  handleFileUpload: (files: FileList | File[] | null, isResubmit?: boolean) => Promise<void>;
  /** Drops a not-yet-submitted upload. */
  removeDraftAttachment: (url: string, isResubmit?: boolean) => void;
  onViewAttachment: (attachment: AttachmentDto) => void;
  isUploadingDoc: boolean;
  handleResubmitRequest: (e: React.FormEvent) => Promise<void>;
}

export const ResubmitExpenseModal: React.FC<ResubmitExpenseModalProps> = ({
  isOpen,
  onClose,
  selectedResubmitExpense,
  formError,
  resubmitForm,
  setResubmitForm,
  resubmitFileInputRef,
  handleFileUpload,
  removeDraftAttachment,
  onViewAttachment,
  isUploadingDoc,
  handleResubmitRequest,
}) => {
  if (!isOpen || !selectedResubmitExpense) return null;

  // The request's current documents, shown so the initiator knows what is
  // already attached before deciding whether to replace anything.
  const existingAttachments: AttachmentDto[] = selectedResubmitExpense.attachments ?? [];

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 105, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontWeight: "bold" }}>Update & Resubmit: {selectedResubmitExpense.requestNumber || "REQ-0519"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
            <Icons.X size={24} />
          </button>
        </div>

        {formError && (
          <div className="glass-card" style={{ borderLeft: "4px solid rgb(var(--color-danger))", padding: "0.75rem", background: "rgba(239,68,68,0.05)", marginBottom: "0.5rem" }}>
            <p style={{ color: "rgb(var(--color-danger))", fontSize: "0.85rem" }}>{formError}</p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "2rem" }}>
          {/* Left Column: Comment & Context */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Pink auditor comments alert */}
            <div style={{
              padding: "1.25rem",
              background: "rgba(244, 63, 94, 0.08)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              borderRadius: "12px",
              color: "#FCA5A5",
              fontSize: "0.9rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <Icons.AlertTriangle size={18} style={{ color: "#FB7185" }} />
                <strong style={{ color: "#FFF" }}>{selectedResubmitExpense.auditor || "Sarah Okafor"} ({selectedResubmitExpense.auditorRole || "Approver"})</strong>
              </div>
              <p style={{ margin: 0, lineHeight: "1.4", fontSize: "0.85rem", fontStyle: "italic" }}>
                "{selectedResubmitExpense.comment || "Missing original hotel receipt. The current attachment only shows the booking confirmation, not the final payment receipt from the merchant."}"
              </p>
            </div>

            {/* Request details context */}
            <div className="glass-card" style={{ background: "rgba(15,23,42,0.3)", padding: "1rem" }}>
              <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-dim))", display: "block", marginBottom: "0.5rem" }}>Original Details</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
                <span>Date: <strong>Feb 02, 2022</strong></span>
                <span>Category: <strong>{selectedResubmitExpense.category}</strong></span>
                <span>Amount: <strong>₦{(selectedResubmitExpense.amount || 0).toLocaleString()}</strong></span>
                <span>Justification: <em>"{selectedResubmitExpense.description || selectedResubmitExpense.justification}"</em></span>
              </div>
            </div>

            {/* Travel policy alert info */}
            <div className="glass-card" style={{ background: "rgba(15,23,42,0.2)", padding: "1rem" }}>
              <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-dim))", display: "block", marginBottom: "0.25rem" }}>Travel Policy Tip</span>
              <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.8rem", lineHeight: "1.4", margin: 0 }}>
                Please note that travel per diem caps have been adjusted for Q3. Ensure hotel merchant receipts are matching the total requested daily lodging sum.
              </p>
            </div>
          </div>

          {/* Right Column: Update & Resubmit form */}
          <form onSubmit={handleResubmitRequest} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Expense Category</label>
              <select disabled className="form-select" style={{ background: "rgba(255,255,255,0.03)", color: "rgb(var(--color-text-dim))" }}>
                <option>{selectedResubmitExpense.category}</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Total Amount (₦)</label>
              <input
                type="text"
                disabled
                value={selectedResubmitExpense.amount}
                className="form-input"
                style={{ background: "rgba(255,255,255,0.03)", color: "rgb(var(--color-text-dim))" }}
              />
            </div>

            {/* Hidden File Input for Resubmit Modal */}
            <input
              type="file"
              ref={resubmitFileInputRef}
              style={{ display: "none" }}
              accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.txt"
              onChange={(e) => {
                handleFileUpload(e.target.files, true);
                if (resubmitFileInputRef.current) resubmitFileInputRef.current.value = "";
              }}
            />

            {/* Dropzone drop attachment area */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Updated Receipt File Attachment</label>
              <div
                onClick={() => resubmitFileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFileUpload(e.dataTransfer.files, true);
                  }
                }}
                style={{
                  border: "2px dashed rgba(99, 102, 241, 0.4)",
                  borderRadius: "8px",
                  padding: "1.5rem",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "rgba(99, 102, 241, 0.02)"
                }}
              >
                <Icons.UploadCloud size={30} style={{ color: "rgb(var(--color-primary))", marginBottom: "0.5rem" }} />
                <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: "600", color: "rgb(var(--color-text))" }}>
                  {isUploadingDoc
                    ? "Uploading…"
                    : "Click or drag & drop to upload replacement documents"}
                </p>
                <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))" }}>Supports PDF, PNG, JPG, DOCX up to 5MB</span>
              </div>

              {/* Newly attached files replace the request's existing set on
                  resubmission; leaving this empty keeps the originals. */}
              {resubmitForm.supportingDocuments.length > 0 ? (
                <div style={{ marginTop: "0.75rem" }}>
                  <AttachmentList
                    label="Replacement Documents"
                    compact
                    attachments={resubmitForm.supportingDocuments.map((d: AttachmentInput) => ({ ...d }))}
                    onView={onViewAttachment}
                    onRemove={(a) => removeDraftAttachment(a.url, true)}
                  />
                </div>
              ) : (
                existingAttachments.length > 0 && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <AttachmentList
                      label="Current Documents (kept unless replaced)"
                      compact
                      attachments={existingAttachments}
                      onView={onViewAttachment}
                    />
                  </div>
                )
              )}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Justification / Correction Explanation</label>
              <textarea
                required
                rows={3}
                value={resubmitForm.justification}
                onChange={(e) => setResubmitForm({ ...resubmitForm, justification: e.target.value })}
                placeholder="Describe how the audit feedback was resolved (e.g., uploaded final receipt)..."
                className="form-textarea"
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
              <input
                type="checkbox"
                id="notifyAuditor"
                checked={resubmitForm.notifyAuditor}
                onChange={(e) => setResubmitForm({ ...resubmitForm, notifyAuditor: e.target.checked })}
                style={{ cursor: "pointer", width: "16px", height: "16px" }}
              />
              <label htmlFor="notifyAuditor" style={{ fontSize: "0.85rem", cursor: "pointer", color: "rgb(var(--color-text-muted))" }}>
                Notify auditor on Slack directly
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Discard Changes
              </button>
              <button type="submit" className="btn btn-primary" style={{ background: "rgb(var(--color-primary))" }}>
                Resubmit Request
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
