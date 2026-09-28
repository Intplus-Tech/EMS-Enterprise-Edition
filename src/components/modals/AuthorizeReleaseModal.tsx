"use client";

/**
 * AuthorizeReleaseModal — the "Review & Authorize Release" dialog from
 * `designs/finance-manager/Finance Manager Release Review Modal.png`.
 *
 * Consumed by ApprovalsTab for the FINANCE_MANAGER release step. Two cards side
 * by side: what is being paid (left, read-only) and the confirmation the manager
 * signs (right). Presentational — storing the receipt is I/O, so the parent owns
 * the upload and passes the stored document down (engineering rule 1-D).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useRef, useState } from "react";
import * as Icons from "lucide-react";
import { ModalShell } from "../ui/ModalShell";
import { ElectronicSignatureField } from "../ui/ElectronicSignatureField";
import { AttachmentTarget } from "./AttachmentViewModal";
import { AttachmentDto, AttachmentInput } from "../../types/api";
import { formatFileSize } from "../../domains/attachments/attachment.rules";
import { formatDateTime, humanizeStatus, justificationLabel } from "../ui/format";

export interface PaymentReleasePayload {
  /** Bank transaction reference the release is reconciled against. */
  reference: string;
  signature: string;
}

interface AuthorizeReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The request being released; `null` renders nothing. */
  expense: any;
  /** Transfer evidence already stored by the parent, or `null` before upload. */
  receipt: AttachmentInput | null;
  receiptUploading?: boolean;
  onUploadReceipt: (files: FileList | File[] | null) => void;
  submitting?: boolean;
  onConfirm: (payload: PaymentReleasePayload) => void;
  onViewAttachment: (attachment: AttachmentTarget) => void;
  onViewThread: () => void;
}

/** PDFs read red and every other document blue, as in the design's file rows. */
function documentTone(name?: string): string {
  return /\.pdf$/i.test(name ?? "") ? "#EF4444" : "#2563EB";
}

export const AuthorizeReleaseModal: React.FC<AuthorizeReleaseModalProps> = ({
  isOpen,
  onClose,
  expense,
  receipt,
  receiptUploading = false,
  onUploadReceipt,
  submitting = false,
  onConfirm,
  onViewAttachment,
  onViewThread,
}) => {
  // Seeded from the request being released. The parent mounts this dialog only
  // while it is open, so nothing typed for one payment — least of all the
  // signature — can survive into the next release.
  const [reference, setReference] = useState<string>(expense?.paymentReference || "");
  const [confirmDebited, setConfirmDebited] = useState(false);
  const [signature, setSignature] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !expense) return null;

  const bank = expense.vendorBankDetails || {};
  const attachments: AttachmentDto[] = expense.attachments ?? [];

  // The decision trail this release rests on, off the request's own history —
  // every reviewer note except the initiator's own.
  const justifications: any[] = (expense.history ?? []).filter(
    (entry: any) => entry.comment?.trim() && entry.actorRole && entry.actorRole !== "INITIATOR"
  );

  // Each guard below is a control, not UI polish, so the button stays inert
  // until the release can actually be reconciled and attributed.
  const canRelease =
    reference.trim().length > 0 &&
    Boolean(receipt) &&
    confirmDebited &&
    signature.trim().length > 0 &&
    !submitting;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Review & Authorize Release"
      subtitle={expense.requestNumber}
      maxWidth="1060px"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* Left card — what is being paid, read-only */}
        <div
          style={{
            border: "1px solid rgb(var(--color-card-border))",
            borderRadius: "0.75rem",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          {/* Initiator account details — where the money is going */}
          <div>
            <div
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: "rgb(var(--color-text-muted))",
                marginBottom: "0.55rem",
              }}
            >
              INITIATOR ACCOUNT DETAILS
            </div>
            {/* There is no sensible placeholder for an account number, so a
                request missing bank details says so rather than showing a
                plausible-looking one. */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "1rem",
                padding: "0.9rem 1rem",
                borderRadius: "0.6rem",
                background: "rgb(var(--color-surface-secondary) / 0.45)",
                border: "1px solid rgb(var(--color-card-border))",
              }}
            >
              <Field label="Payee Name" value={bank.accountName || expense.vendorName || "—"} />
              <Field label="Bank" value={bank.bankName || "—"} />
              <Field label="Account Number" value={bank.accountNumber || "—"} />
            </div>
          </div>

          {/* Documentation — the request's own attachments, openable in the viewer */}
          <div
            style={{
              padding: "1.1rem",
              borderRadius: "0.7rem",
              border: "1px solid rgb(var(--color-card-border))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
              <Icons.Paperclip size={17} style={{ color: "#2563EB" }} />
              <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Documentation</h4>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {attachments.map((doc, index) => (
                <button
                  key={doc._id || `${doc.url}-${index}`}
                  type="button"
                  onClick={() => onViewAttachment({ ...doc, requestNumber: expense.requestNumber })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.65rem",
                    width: "100%",
                    textAlign: "left",
                    padding: "0.7rem 0.9rem",
                    borderRadius: "0.6rem",
                    border: "1px solid rgb(var(--color-card-border))",
                    background: "rgb(var(--color-card))",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <Icons.FileText size={17} style={{ color: documentTone(doc.name), flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {doc.name}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "rgb(var(--color-text-muted))" }}>
                      {[formatFileSize(doc.size), doc.uploadedByName].filter(Boolean).join(" • ") ||
                        "Supporting document"}
                    </div>
                  </div>
                </button>
              ))}
              {attachments.length === 0 && (
                <p style={{ fontSize: "0.82rem", color: "rgb(var(--color-text-dim))", margin: 0 }}>
                  No documents attached.
                </p>
              )}
            </div>
          </div>

          {/* Justification summary — the approvals this release rests on */}
          <div>
            <div
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: "rgb(var(--color-text-muted))",
                marginBottom: "0.7rem",
              }}
            >
              JUSTIFICATION SUMMARY
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              {justifications.map((entry: any, index: number) => (
                <div key={index} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: "rgba(37, 99, 235, 0.12)",
                      color: "#2563EB",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {/* The approver signs off the business case, finance signs
                        off the controls — the design distinguishes the two. */}
                    {entry.actorRole === "APPROVER" ? (
                      <Icons.UserRound size={15} />
                    ) : (
                      <Icons.ShieldCheck size={15} />
                    )}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "0.75rem 0.9rem",
                      borderRadius: "0.6rem",
                      background: "rgb(var(--color-surface-secondary) / 0.45)",
                      border: "1px solid rgb(var(--color-card-border))",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.3rem" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                        {/* Named roles read as the design's captions; anything
                            else still names its author rather than vanishing. */}
                        {justificationLabel(entry.actorRole) ||
                          `${entry.actorName} (${humanizeStatus(entry.actorRole)})`}
                      </span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "rgb(var(--color-text-muted))",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {formatDateTime(entry.timestamp)}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.82rem", fontStyle: "italic", margin: 0, color: "rgb(var(--color-text-muted))" }}>
                      &lsquo;{entry.comment}&rsquo;
                    </p>
                  </div>
                </div>
              ))}
              {justifications.length === 0 && (
                <p style={{ fontSize: "0.82rem", color: "rgb(var(--color-text-dim))", margin: 0 }}>
                  No approver justifications were recorded on this request.
                </p>
              )}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <button
              type="button"
              onClick={onViewThread}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                background: "none",
                border: "none",
                color: "#2563EB",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              <Icons.MessagesSquare size={16} /> View Full Communication Thread <Icons.ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Right card — the confirmation the manager signs */}
        <div
          style={{
            border: "1px solid rgb(var(--color-card-border))",
            borderRadius: "0.75rem",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Confirm Payment Release</h3>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Bank Reference Number <span style={{ color: "rgb(var(--color-danger))" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <Icons.Landmark
                  size={16}
                  style={{
                    position: "absolute",
                    left: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "rgb(var(--color-text-dim))",
                  }}
                />
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Enter transaction reference ID"
                  className="form-input"
                  style={{ paddingLeft: "2.25rem", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Payment Receipt / Evidence of Transfer <span style={{ color: "rgb(var(--color-danger))" }}>*</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*,.pdf"
                onChange={(e) => {
                  onUploadReceipt(e.target.files);
                  // Cleared so re-picking the same file still fires a change.
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onUploadReceipt(e.dataTransfer.files);
                }}
                style={{
                  border: "1.5px dashed rgb(var(--color-primary) / 0.35)",
                  borderRadius: "0.6rem",
                  padding: "1.5rem 1rem",
                  textAlign: "center",
                  background: "rgb(var(--color-primary) / 0.05)",
                  cursor: "pointer",
                }}
              >
                <Icons.UploadCloud size={30} style={{ color: "rgb(var(--color-text-muted))", margin: "0 auto 0.4rem" }} />
                <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                  {receiptUploading
                    ? "Uploading receipt…"
                    : receipt
                      ? `${receipt.name}${receipt.size ? ` • ${formatFileSize(receipt.size)}` : ""}`
                      : "Drop your file here or click to browse"}
                </div>
                <span style={{ fontSize: "0.72rem", color: "rgb(var(--color-text-muted))" }}>
                  Supports PDF, PNG, JPG (Max 5MB)
                </span>
              </div>
            </div>

            <label
              htmlFor="confirmDebited"
              style={{
                display: "flex",
                gap: "0.6rem",
                alignItems: "flex-start",
                padding: "0.8rem",
                borderRadius: "0.6rem",
                background: "rgb(var(--color-surface-secondary) / 0.5)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                id="confirmDebited"
                checked={confirmDebited}
                onChange={(e) => setConfirmDebited(e.target.checked)}
                style={{ width: "1.05rem", height: "1.05rem", marginTop: "0.1rem", cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-muted))", lineHeight: 1.45 }}>
                I confirm that the funds have been successfully debited from the corporate account and the
                transaction is complete.
              </span>
            </label>

            {/* Not in the design, but the release endpoint re-verifies the
                manager's identity before cash moves — the same gate every other
                financial decision in the app passes through. */}
            <ElectronicSignatureField value={signature} onChange={setSignature} />
          </div>

          {/* Footer strip inside the card, as the design places it */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem 1.25rem",
              borderTop: "1px solid rgb(var(--color-card-border))",
              background: "rgb(var(--color-surface-secondary) / 0.35)",
            }}
          >
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm({ reference: reference.trim(), signature })}
              disabled={!canRelease}
              className="btn btn-primary"
              style={{
                background: "#2563EB",
                border: "none",
                padding: "0.6rem 1.75rem",
                fontWeight: 700,
                opacity: canRelease ? 1 : 0.55,
              }}
            >
              {submitting ? "Processing..." : "Paid"}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

/** Compact label/value pair used in the payee details strip. */
const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ fontSize: "0.72rem", color: "rgb(var(--color-text-muted))" }}>{label}</div>
    <div style={{ fontSize: "0.88rem", fontWeight: 700, marginTop: "0.15rem", overflow: "hidden", textOverflow: "ellipsis" }}>
      {value}
    </div>
  </div>
);
