"use client";

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
  fileInputRef,
  handleFileUpload,
  isUploadingDoc,
  uploadDocError,
  removeDraftAttachment,
  handleCreateRequest,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem", overflowY: "auto" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "600px", maxHeight: "88vh", overflowY: "auto", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontWeight: "bold" }}>Initiate Expense Request</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
            <Icons.X size={24} />
          </button>
        </div>

        {formError && (
          <div className="glass-card" style={{ borderLeft: "4px solid rgb(var(--color-danger))", padding: "0.75rem", background: "rgba(239,68,68,0.05)" }}>
            <p style={{ color: "rgb(var(--color-danger))", fontSize: "0.85rem" }}>{formError}</p>
          </div>
        )}

        <form onSubmit={(e) => handleCreateRequest(e, true)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 0.8fr", gap: "0.75rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Expense Category</label>
              <select
                value={newRequest.category}
                onChange={(e) => setNewRequest({ ...newRequest, category: e.target.value })}
                className="form-select"
              >
                <option value="Travel">Travel & Lodging</option>
                <option value="Equipment">Office Equipment</option>
                <option value="Software">Software & Services</option>
                <option value="Marketing">Marketing Expense</option>
                <option value="Other">Other Expenses</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Requested Amount</label>
              <input
                type="number"
                required
                value={newRequest.amount}
                onChange={(e) => setNewRequest({ ...newRequest, amount: e.target.value })}
                placeholder="e.g. 3200"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Currency</label>
              <select
                value={newRequest.currency}
                onChange={(e) => setNewRequest({ ...newRequest, currency: e.target.value })}
                className="form-select"
              >
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Description / Purpose</label>
            <textarea
              required
              rows={2}
              value={newRequest.description}
              onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
              placeholder="Justify context for departmental budget validation"
              className="form-textarea"
            />
          </div>

          {/* Hidden File Input for Initiate Request */}
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

          {/* Supporting Attachments Manager */}
          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <label className="form-label" style={{ margin: 0 }}>
                Supporting Documents ({newRequest.supportingDocuments.length}/{MAX_ATTACHMENTS_PER_REQUEST}) <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ background: "none", border: "none", color: "rgb(var(--color-primary))", fontSize: "0.75rem", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
              >
                <Icons.Upload size={13} />
                + Add File
              </button>
            </div>

            {/* Dropzone File Upload Input Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFileUpload(e.dataTransfer.files, false);
                }
              }}
              style={{
                border: "2px dashed rgba(99, 102, 241, 0.35)",
                borderRadius: "8px",
                padding: "1rem",
                textAlign: "center",
                cursor: "pointer",
                background: "rgba(99, 102, 241, 0.03)",
                marginBottom: "0.5rem",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <Icons.UploadCloud size={22} style={{ color: "rgb(var(--color-primary))" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "rgb(var(--color-text))" }}>
                  {isUploadingDoc ? "Uploading file in background..." : "Click or drag & drop files here to attach"}
                </span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))" }}>
                Supports PDF, PNG, JPG, DOCX, XLSX
              </span>
            </div>

            {uploadDocError && (
              <p style={{ color: "#EF4444", fontSize: "0.75rem", margin: "0 0 0.5rem 0" }}>{uploadDocError}</p>
            )}

            {/* Attached files. Each carries its real size and can be removed
                before the request is created. */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              {newRequest.supportingDocuments.map((doc: AttachmentInput) => (
                <div
                  key={doc.url}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.3rem 0.6rem",
                    borderRadius: "6px",
                    background: "rgba(99, 102, 241, 0.1)",
                    border: "1px solid rgba(99, 102, 241, 0.25)",
                    fontSize: "0.75rem",
                    color: "rgb(var(--color-text))"
                  }}
                >
                  <Icons.Paperclip size={12} style={{ color: "rgb(var(--color-primary))" }} />
                  <span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.name}
                  </span>
                  {doc.size ? (
                    <span style={{ color: "rgb(var(--color-text-dim))" }}>{formatFileSize(doc.size)}</span>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Remove ${doc.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDraftAttachment(doc.url, false);
                    }}
                    style={{ background: "none", border: "none", padding: 0, marginLeft: "0.2rem", cursor: "pointer", color: "#EF4444", lineHeight: 0 }}
                  >
                    <Icons.X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Required Payment Date</label>
            <input
              type="date"
              required
              value={newRequest.requiredPaymentDate}
              onChange={(e) => setNewRequest({ ...newRequest, requiredPaymentDate: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="glass-card" style={{ background: "rgba(15,23,42,0.3)" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.5rem", color: "rgb(var(--color-primary))" }}>Payee Bank Details</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <input
                type="text"
                required
                placeholder="Vendor / Payee Name"
                value={newRequest.vendorName}
                onChange={(e) => setNewRequest({ ...newRequest, vendorName: e.target.value })}
                className="form-input"
                style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
              />
              <input
                type="text"
                required
                placeholder="Bank Account Name"
                value={newRequest.accountName}
                onChange={(e) => setNewRequest({ ...newRequest, accountName: e.target.value })}
                className="form-input"
                style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <input
                type="text"
                required
                placeholder="Account Number"
                value={newRequest.accountNumber}
                onChange={(e) => setNewRequest({ ...newRequest, accountNumber: e.target.value })}
                className="form-input"
                style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
              />
              <input
                type="text"
                required
                placeholder="Bank Name"
                value={newRequest.bankName}
                onChange={(e) => setNewRequest({ ...newRequest, bankName: e.target.value })}
                className="form-input"
                style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={(e) => handleCreateRequest(e, false)} className="btn btn-secondary" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              Save Draft
            </button>
            <button type="submit" className="btn btn-primary">
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
