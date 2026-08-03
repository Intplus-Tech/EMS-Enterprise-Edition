/**
 * CompletedReleaseModal
 * Read-only receipt view for a disbursed request: payment facts, payee bank details,
 * supporting documents and the justification trail. Opened from PaymentHistoryTab.
 * Design source: designs/finance-manager/Payment History (Completed Payments) (1).png
 */
import React from "react";
import * as Icons from "lucide-react";
import { ModalShell } from "../ui/ModalShell";
import { formatNairaPrecise, formatDateTime } from "../ui/format";

interface CompletedReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: any;
  onViewThread?: (expense: any) => void;
}

// Roles whose comments make up the justification summary, in narrative order.
const JUSTIFICATION_ROLES: Record<string, string> = {
  APPROVER: "Approver's Justification (Dept. Head)",
  FINANCE_HEAD: "Finance Head's Justification",
  FINANCE_OFFICER: "Finance Officer's Justification",
  FINANCE_MANAGER: "Finance Manager's Justification",
};

export const CompletedReleaseModal: React.FC<CompletedReleaseModalProps> = ({
  isOpen,
  onClose,
  expense,
  onViewThread,
}) => {
  if (!isOpen || !expense) return null;

  const bank = expense.vendorBankDetails || {};
  const justifications = (expense.history || []).filter(
    (h: any) => h.comment && JUSTIFICATION_ROLES[h.actorRole]
  );

  const attachments: any[] = expense.attachments?.length
    ? expense.attachments
    : expense.supportingDocument
      ? [{ name: expense.supportingDocument, meta: "Supporting document" }]
      : [];

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Completed Release"
      subtitle={`ID:${(expense._id || "").toString().slice(-7) || expense.requestNumber}`}
      maxWidth="1080px"
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "1.5rem" }}>
        {/* Left column — the payment record itself */}
        <div style={{ border: "1px solid rgb(var(--color-card-border))", borderRadius: "0.75rem", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em", color: "rgb(var(--color-text-muted))" }}>
                REQUEST REFERENCE
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "0.3rem" }}>
                {expense.requestNumber} - {expense.description}
              </div>
            </div>
            <span className="badge badge-paid" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
              <Icons.CheckCircle2 size={13} /> PAID
            </span>
          </div>

          <div style={{ padding: "0 1.25rem 1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>Amount Disbursed</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#2563EB", marginTop: "0.2rem" }}>
                {formatNairaPrecise(expense.amount)}
              </div>
            </div>

            <DetailRow
              icon={<Icons.Receipt size={16} />}
              label="Reference Number"
              value={expense.paymentReference || "—"}
            />

            <DetailRow
              icon={<Icons.Landmark size={16} />}
              label="Payment Method"
              value={expense.paymentMethod || "Bank Transfer (CBN NIP)"}
            />

            <DetailRow
              icon={<Icons.Calendar size={16} />}
              label="Transaction Date"
              value={expense.paymentDate ? formatDateTime(expense.paymentDate) : "—"}
            />
          </div>

          {/* Generated receipt strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              padding: "0.9rem 1.25rem",
              borderTop: "1px solid rgb(var(--color-card-border))",
              background: "rgb(var(--color-surface-secondary) / 0.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
              <Icons.FileText size={18} style={{ color: "#EF4444", flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {expense.paymentReceipt || `payment_receipt_${expense.requestNumber}.pdf`}
                </div>
                <div style={{ fontSize: "0.72rem", color: "rgb(var(--color-text-muted))" }}>Generated System Receipt</div>
              </div>
            </div>
            <a
              href={expense.paymentReceipt || "#"}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#2563EB", fontSize: "0.85rem", fontWeight: 600, flexShrink: 0 }}
            >
              <Icons.Download size={15} /> Download
            </a>
          </div>
        </div>

        {/* Right column — payee + documentation */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em", color: "rgb(var(--color-text-muted))", marginBottom: "0.5rem" }}>
              INITIATOR ACCOUNT DETAILS
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "1rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "rgb(var(--color-surface-secondary) / 0.45)",
                border: "1px solid rgb(var(--color-card-border))",
              }}
            >
              <Field label="Payee Name" value={bank.accountName || expense.vendorName || "—"} />
              <Field label="Bank" value={bank.bankName || "—"} />
              <Field label="Account Number" value={bank.accountNumber || "—"} />
            </div>
          </div>

          <div style={{ padding: "1.1rem", borderRadius: "0.75rem", border: "1px solid rgb(var(--color-card-border))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
              <Icons.Paperclip size={17} style={{ color: "#2563EB" }} />
              <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Documentation</h4>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {attachments.map((doc: any, i: number) => (
                <div
                  key={`${doc.name}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.65rem",
                    padding: "0.7rem 0.9rem",
                    borderRadius: "0.6rem",
                    border: "1px solid rgb(var(--color-card-border))",
                    background: "rgb(var(--color-card))",
                  }}
                >
                  <Icons.File size={17} style={{ color: "#2563EB", flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.name}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "rgb(var(--color-text-muted))" }}>{doc.meta || "Attachment"}</div>
                  </div>
                </div>
              ))}
              {attachments.length === 0 && (
                <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-dim))", margin: 0 }}>No documents attached.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Justification summary — the decision trail behind the disbursement */}
      <div style={{ marginTop: "1.75rem" }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em", color: "rgb(var(--color-text-muted))", marginBottom: "0.75rem" }}>
          JUSTIFICATION SUMMARY
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {justifications.map((entry: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "rgba(37, 99, 235, 0.12)",
                  color: "#2563EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icons.ShieldCheck size={16} />
              </div>
              <div
                style={{
                  flex: 1,
                  padding: "0.85rem 1rem",
                  borderRadius: "0.6rem",
                  background: "rgb(var(--color-surface-secondary) / 0.45)",
                  border: "1px solid rgb(var(--color-card-border))",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.35rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{JUSTIFICATION_ROLES[entry.actorRole]}</span>
                  <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", flexShrink: 0 }}>
                    {formatDateTime(entry.timestamp)}
                  </span>
                </div>
                <p style={{ fontSize: "0.88rem", fontStyle: "italic", margin: 0 }}>&apos;{entry.comment}&apos;</p>
              </div>
            </div>
          ))}
          {justifications.length === 0 && (
            <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-dim))", margin: 0 }}>No justifications recorded.</p>
          )}
        </div>

        {onViewThread && (
          <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
            <button
              type="button"
              onClick={() => onViewThread(expense)}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", background: "none", border: "none", color: "#2563EB", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" }}
            >
              <Icons.MessagesSquare size={16} /> View Full Communication Thread <Icons.ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

/** Icon + label + value trio used across the payment facts grid. */
const DetailRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
    <div
      style={{
        width: "34px",
        height: "34px",
        borderRadius: "0.5rem",
        background: "rgb(var(--color-surface-secondary) / 0.6)",
        color: "rgb(var(--color-text-muted))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>{label}</div>
      <div style={{ fontSize: "0.88rem", fontWeight: 600, marginTop: "0.1rem" }}>{value}</div>
    </div>
  </div>
);

/** Compact label/value pair used in the payee details strip. */
const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ fontSize: "0.72rem", color: "rgb(var(--color-text-muted))" }}>{label}</div>
    <div style={{ fontSize: "0.9rem", fontWeight: 700, marginTop: "0.15rem", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
  </div>
);
