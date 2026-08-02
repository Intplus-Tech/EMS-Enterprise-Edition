"use client";

/**
 * InitiateExpenseRequestModal — "Expense Request Details" from
 * `designs/initiator/New Request.png`.
 *
 * Field order follows the design: department (read-only), payee and bank
 * details, business purpose, amount and required date, then the document
 * dropzone. Neither the category select nor the currency select the earlier
 * versions carried appears in the design — currency because every amount in
 * the system is Naira, category because an initiator does not classify their
 * own spend. The server now applies the default category (see
 * ExpenseService.initiateRequest), so reporting still groups these requests.
 */

import React, { RefObject } from "react";
import * as Icons from "lucide-react";
import { AttachmentInput } from "../../types/api";
import { formatFileSize, MAX_ATTACHMENTS_PER_REQUEST } from "../../domains/attachments/attachment.rules";

interface InitiateExpenseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  formError: string;
  newRequest: any;
  setNewRequest: React.Dispatch<React.SetStateAction<any>>;
  /** Read-only department shown at the top of the form, per the design. */
  departmentName?: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileUpload: (files: FileList | File[] | null, isResubmit?: boolean) => Promise<void>;
  isUploadingDoc: boolean;
  uploadDocError: string;
  /** Drops a not-yet-submitted upload from the form. */
  removeDraftAttachment: (url: string, isResubmit?: boolean) => void;
  handleCreateRequest: (e: React.FormEvent, shouldSubmit?: boolean) => Promise<void>;
}

export const InitiateExpenseRequestModal: React.FC<InitiateExpenseRequestModalProps> = ({
  isOpen,
  onClose,
  formError,
  newRequest,
  setNewRequest,
  departmentName,
  fileInputRef,
  handleFileUpload,
  isUploadingDoc,
  uploadDocError,
  removeDraftAttachment,
  handleCreateRequest,
}) => {
  if (!isOpen) return null;

  const set = (patch: Record<string, unknown>) => setNewRequest({ ...newRequest, ...patch });

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem", overflowY: "auto" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "640px", maxHeight: "88vh", overflowY: "auto", padding: 0, margin: "auto", display: "flex", flexDirection: "column" }}>

        {/* Header band, matching the tinted header in the design */}
        <div style={{ padding: "1.75rem 2rem 1.25rem", background: "rgba(37, 99, 235, 0.06)", borderBottom: "1px solid rgba(var(--color-card-border), 0.5)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "1.25rem", margin: 0 }}>Expense Request Details</h3>
            <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
              Submit your financial request for departmental approval and budget verification.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))", cursor: "pointer", flexShrink: 0 }}>
            <Icons.X size={22} />
          </button>
        </div>

        <form
          onSubmit={(e) => handleCreateRequest(e, true)}
          style={{ display: "flex", flexDirection: "column", gap: "1.15rem", padding: "1.75rem 2rem" }}
        >
          {formError && (
            <div className="glass-card" style={{ borderLeft: "4px solid rgb(var(--color-danger))", padding: "0.75rem", background: "rgba(239,68,68,0.05)" }}>
              <p style={{ color: "rgb(var(--color-danger))", fontSize: "0.85rem", margin: 0 }}>{formError}</p>
            </div>
          )}

          {/* Department — derived from the session, not chosen. The server
              re-derives it too, so this is display only. */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Department</label>
            <input
              type="text"
              value={departmentName || "Not assigned"}
              readOnly
              disabled
              className="form-input"
              style={{ background: "rgba(37, 99, 235, 0.06)", cursor: "not-allowed" }}
            />
          </div>

          {/* Vendor / payee */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Vendor/Payee Details</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Corp Int, AWS, Staples"
              value={newRequest.vendorName}
              onChange={(e) => set({ vendorName: e.target.value })}
              className="form-input"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Bank Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Zenith Bank"
                value={newRequest.bankName}
                onChange={(e) => set({ bankName: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Account Number</label>
              <input
                type="text"
                required
                inputMode="numeric"
                placeholder="10-digit number"
                value={newRequest.accountNumber}
                onChange={(e) => set({ accountNumber: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Account Name</label>
              <input
                type="text"
                required
                placeholder="Full name on account"
                value={newRequest.accountName}
                onChange={(e) => set({ accountName: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Description / Business Purpose</label>
            <textarea
              required
              rows={4}
              value={newRequest.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Please provide a detailed explanation for this expense request..."
              className="form-textarea"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Amount Requested</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-dim))", fontWeight: 600 }}>
                  ₦
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={newRequest.amount}
                  onChange={(e) => set({ amount: e.target.value })}
                  placeholder="0.00"
                  className="form-input"
                  style={{ paddingLeft: "2rem" }}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Required Payment Date</label>
              <input
                type="date"
                required
                value={newRequest.requiredPaymentDate}
                onChange={(e) => set({ requiredPaymentDate: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          {/* Hidden input backing the dropzone */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            multiple
            accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.txt"
            onChange={(e) => {
              handleFileUpload(e.target.files, false);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: "0.4rem" }}>
              Supporting Documents ({newRequest.supportingDocuments.length}/{MAX_ATTACHMENTS_PER_REQUEST}){" "}
              <span style={{ color: "#EF4444" }}>*</span>
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files?.length) handleFileUpload(e.dataTransfer.files, false);
              }}
              style={{
                border: "2px dashed rgba(37, 99, 235, 0.35)",
                borderRadius: "10px",
                padding: "2rem 1rem",
                textAlign: "center",
                cursor: "pointer",
                background: "rgba(37, 99, 235, 0.04)",
              }}
            >
              <Icons.FileUp size={26} style={{ color: "#2563EB", marginBottom: "0.5rem" }} />
              <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "rgb(var(--color-text))" }}>
                {isUploadingDoc ? "Uploading…" : "Click to upload or drag and drop"}
              </div>
              <span style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-dim))" }}>
                PDF, PNG, JPG or DOCX (max. 5MB)
              </span>
            </div>

            {uploadDocError && (
              <p style={{ color: "#EF4444", fontSize: "0.75rem", margin: "0.5rem 0 0" }}>{uploadDocError}</p>
            )}

            {/* Attached files carry their real size and can be removed before
                the request is created. */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
              {newRequest.supportingDocuments.map((doc: AttachmentInput) => (
                <div
                  key={doc.url}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.3rem 0.6rem",
                    borderRadius: "6px",
                    background: "rgba(37, 99, 235, 0.1)",
                    border: "1px solid rgba(37, 99, 235, 0.25)",
                    fontSize: "0.75rem",
                    color: "rgb(var(--color-text))",
                  }}
                >
                  <Icons.Paperclip size={12} style={{ color: "#2563EB" }} />
                  <span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.name}
                  </span>
                  {doc.size ? <span style={{ color: "rgb(var(--color-text-dim))" }}>{formatFileSize(doc.size)}</span> : null}
                  <button
                    type="button"
                    aria-label={`Remove ${doc.name}`}
                    onClick={(e) => { e.stopPropagation(); removeDraftAttachment(doc.url, false); }}
                    style={{ background: "none", border: "none", padding: 0, marginLeft: "0.2rem", cursor: "pointer", color: "#EF4444", lineHeight: 0 }}
                  >
                    <Icons.X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer band — Save Draft and Submit Request, as in the design */}
        <div style={{ padding: "1.25rem 2rem", background: "rgba(37, 99, 235, 0.05)", borderTop: "1px solid rgba(var(--color-card-border), 0.5)", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          <button type="button" onClick={(e) => handleCreateRequest(e, false)} className="btn btn-secondary">
            Save Draft
          </button>
          <button type="button" onClick={(e) => handleCreateRequest(e, true)} className="btn btn-primary" style={{ background: "#2563EB", border: "none" }}>
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
};
