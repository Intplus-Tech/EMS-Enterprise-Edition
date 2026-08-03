"use client";

/**
 * ResubmitExpenseModal — "Reply to Clarification Request" from
 * `designs/initiator/Clarification Reply View.png`.
 *
 * Everything shown comes off the returned request itself. The previous version
 * carried mock defaults for the approver's name, their question and the request
 * date, so an initiator answering a real clarification read invented text.
 */

import React, { RefObject } from "react";
import * as Icons from "lucide-react";
import { AttachmentList } from "../ui/AttachmentList";
import { AttachmentDto, AttachmentInput } from "../../types/api";
import { formatNaira, formatDateTime, humanizeStatus } from "../ui/format";

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
  /** Withdraws the request instead of replying (design: "Withdraw Request"). */
  onWithdraw: (id: string) => void;
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
  onWithdraw,
}) => {
  if (!isOpen || !selectedResubmitExpense) return null;

  const existingAttachments: AttachmentDto[] = selectedResubmitExpense.attachments ?? [];
  const newDocuments: AttachmentInput[] = resubmitForm.supportingDocuments ?? [];

  // The approver's question is the last non-initiator comment on the request.
  const question = [...(selectedResubmitExpense.history ?? [])]
    .reverse()
    .find((h: any) => h.comment && h.actorRole !== "INITIATOR");

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 105, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem", overflowY: "auto" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "900px", maxHeight: "90vh", overflowY: "auto", padding: 0, margin: "auto", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid rgb(var(--color-card-border) / 0.5)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "1.25rem", margin: 0 }}>Reply to Clarification Request</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.5rem" }}>
              <span className="badge badge-submitted">{selectedResubmitExpense.requestNumber}</span>
              <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>
                &bull; {selectedResubmitExpense.description}
              </span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))", cursor: "pointer", flexShrink: 0 }}>
            <Icons.X size={22} />
          </button>
        </div>

        <form onSubmit={handleResubmitRequest} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "1.75rem 2rem" }}>
          {formError && (
            <div className="glass-card" style={{ borderLeft: "4px solid rgb(var(--color-danger))", padding: "0.75rem", background: "rgba(239,68,68,0.05)" }}>
              <p style={{ color: "rgb(var(--color-danger))", fontSize: "0.85rem", margin: 0 }}>{formError}</p>
            </div>
          )}

          {/* The approver's actual question, with their name and timestamp. */}
          <div style={{ borderLeft: "3px solid #2563EB", background: "rgba(37, 99, 235, 0.07)", borderRadius: "0 8px 8px 0", padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
              <strong style={{ fontSize: "0.95rem" }}>
                {question?.actorName || "Approver"}{" "}
                <span style={{ fontWeight: 500, color: "rgb(var(--color-text-muted))" }}>
                  ({humanizeStatus(question?.actorRole) || "Approver"})
                </span>
              </strong>
              {question?.timestamp && (
                <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>
                  {formatDateTime(question.timestamp)}
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5, fontStyle: "italic" }}>
              &quot;{question?.comment || "Please provide additional clarification for this request."}&quot;
            </p>
          </div>

          {/* Amount and current status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="glass-card" style={{ padding: "1.1rem", textAlign: "center" }}>
              <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", color: "rgb(var(--color-text-muted))" }}>
                CLARIFIED AMOUNT
              </span>
              <strong style={{ fontSize: "1.6rem", fontWeight: 800, display: "block", marginTop: "0.35rem" }}>
                {formatNaira(selectedResubmitExpense.amount)}
              </strong>
            </div>
            <div className="glass-card" style={{ padding: "1.1rem", textAlign: "center" }}>
              <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", color: "rgb(var(--color-text-muted))" }}>
                STATUS
              </span>
              <span className="badge badge-rejected" style={{ marginTop: "0.6rem", display: "inline-block" }}>
                Pending Reply
              </span>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Your Response / Justification</label>
            <textarea
              required
              rows={5}
              value={resubmitForm.justification}
              onChange={(e) => setResubmitForm({ ...resubmitForm, justification: e.target.value })}
              placeholder="Provide a detailed explanation addressing the approver's question..."
              className="form-textarea"
            />
            <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))" }}>
              Describe how the approver&apos;s feedback has been resolved.
            </span>
          </div>

          {/* Documents: dropzone on the left, already-attached list on the right */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Supporting Documents</label>

            <input
              type="file"
              ref={resubmitFileInputRef}
              style={{ display: "none" }}
              multiple
              accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.txt"
              onChange={(e) => {
                handleFileUpload(e.target.files, true);
                if (resubmitFileInputRef.current) resubmitFileInputRef.current.value = "";
              }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div
                onClick={() => resubmitFileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files?.length) handleFileUpload(e.dataTransfer.files, true);
                }}
                style={{
                  border: "2px dashed rgb(var(--color-card-border) / 0.9)",
                  borderRadius: "10px",
                  padding: "2rem 1rem",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "rgb(var(--color-surface-secondary) / 0.35)",
                }}
              >
                <Icons.UploadCloud size={28} style={{ color: "rgb(var(--color-text-muted))", marginBottom: "0.5rem" }} />
                <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                  {isUploadingDoc ? "Uploading…" : "Click or drag files to upload"}
                </div>
                <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))" }}>PDF, PNG, JPG (Max 5MB)</span>
              </div>

              <div style={{ background: "rgb(var(--color-surface-secondary) / 0.35)", borderRadius: "10px", padding: "1rem" }}>
                {newDocuments.length > 0 ? (
                  <AttachmentList
                    label="NEW ATTACHMENTS"
                    compact
                    attachments={newDocuments.map((d) => ({ ...d }))}
                    onView={onViewAttachment}
                    onRemove={(a) => removeDraftAttachment(a.url, true)}
                  />
                ) : existingAttachments.length > 0 ? (
                  <AttachmentList
                    label="ALREADY ATTACHED"
                    compact
                    attachments={existingAttachments}
                    onView={onViewAttachment}
                  />
                ) : (
                  <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>
                    No documents attached to this request.
                  </span>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Footer — Withdraw on the left, Submit / Cancel on the right */}
        <div style={{ padding: "1.25rem 2rem", background: "rgba(37, 99, 235, 0.05)", borderTop: "1px solid rgb(var(--color-card-border) / 0.5)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {/* The design offers withdrawal from this dialog; it was absent, so a
              returned request could only ever be replied to. */}
          <button
            type="button"
            onClick={() => onWithdraw(selectedResubmitExpense._id)}
            className="btn"
            style={{ background: "rgba(239, 68, 68, 0.1)", color: "#EF4444", border: "1px solid rgba(239, 68, 68, 0.25)" }}
          >
            Withdraw Request
          </button>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={handleResubmitRequest as unknown as React.MouseEventHandler}
              disabled={!resubmitForm.justification?.trim()}
              className="btn btn-primary"
              style={{
                background: "#2563EB",
                border: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                opacity: resubmitForm.justification?.trim() ? 1 : 0.55,
              }}
            >
              <Icons.Send size={16} /> Submit Reply
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
