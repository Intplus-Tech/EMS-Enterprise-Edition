"use client";

/**
 * CommunicationThreadModal — `designs/finance-manager/Full Communication Thread
 * Modal.png`.
 *
 * Renders the request's real thread: workflow transitions merged with free-text
 * comments, as served by `GET /api/expenses/[id]/comments`. The previous inline
 * copy of this dialog rendered three hardcoded messages — "M. Chen",
 * "K. Adeyemi", "J. Doe", a "server_quote_v2.pdf" attachment, fixed October
 * timestamps and a ₦1,250,000.00 total — for every request it was opened on, so
 * a Finance Manager reviewing a release read someone else's invented
 * conversation before authorising payment.
 *
 * Presentational: entries and the export action come from the caller.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import * as Icons from "lucide-react";
import { ModalShell } from "../ui/ModalShell";
import { EmptyState } from "../ui/EmptyState";
import { formatDateTime, formatNairaPrecise, humanizeStatus, statusBadgeClass } from "../ui/format";
import { ThreadEntryDto } from "../../types/api";

interface CommunicationThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The request the thread belongs to; supplies the header line. */
  expense: any;
  entries: ThreadEntryDto[];
  loading?: boolean;
  onExport: () => void;
}

/** Icon per author role, so a transition is distinguishable at a glance. */
function roleIcon(role: string) {
  if (role === "INITIATOR") return <Icons.User size={18} />;
  if (role === "APPROVER") return <Icons.ShieldCheck size={18} />;
  return <Icons.Briefcase size={18} />;
}

export const CommunicationThreadModal: React.FC<CommunicationThreadModalProps> = ({
  isOpen,
  onClose,
  expense,
  entries,
  loading = false,
  onExport,
}) => {
  if (!isOpen || !expense) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`Communication Thread — ${expense.requestNumber}`}
      maxWidth="620px"
      footer={
        <>
          <button type="button" onClick={onExport} className="btn btn-secondary">
            Export Thread
          </button>
          <button type="button" onClick={onClose} className="btn btn-primary">
            &larr; Back to Review
          </button>
        </>
      }
    >
      {/* Subject line — the request's own description and amount */}
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "rgb(var(--color-text-muted))",
          paddingBottom: "1rem",
          borderBottom: "1px solid rgb(var(--color-card-border))",
        }}
      >
        {expense.description} &bull; Total: {formatNairaPrecise(expense.amount)}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", margin: "1.25rem 0" }}>
        {loading ? (
          <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", textAlign: "center", padding: "1.5rem" }}>
            Loading the conversation…
          </p>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<Icons.MessageSquare size={20} />}
            title="No messages yet"
            description="Workflow decisions and comments on this request will appear here."
          />
        ) : (
          entries.map((entry) => (
            <div key={entry.id} style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgb(var(--color-primary) / 0.15)",
                  color: "rgb(var(--color-primary))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {roleIcon(String(entry.authorRole))}
              </div>

              <div
                style={{
                  background: "rgb(var(--color-surface-secondary) / 0.6)",
                  border: "1px solid rgb(var(--color-card-border))",
                  borderRadius: "12px",
                  padding: "1rem",
                  flexGrow: 1,
                  minWidth: 0,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.35rem" }}>
                  <div>
                    <strong style={{ fontSize: "0.85rem", color: "rgb(var(--color-text))" }}>{entry.authorName}</strong>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "rgb(var(--color-text-muted))",
                        fontWeight: 700,
                        marginLeft: "0.5rem",
                        textTransform: "uppercase",
                      }}
                    >
                      {humanizeStatus(String(entry.authorRole))}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-dim))", whiteSpace: "nowrap" }}>
                    {formatDateTime(entry.timestamp)}
                  </span>
                </div>

                {/* Transitions carry the step they completed; comments do not. */}
                {entry.action && (
                  <span className={`badge ${statusBadgeClass(entry.action)}`} style={{ marginBottom: "0.5rem" }}>
                    {humanizeStatus(entry.action)}
                  </span>
                )}

                <p style={{ margin: 0, fontSize: "0.8rem", color: "rgb(var(--color-text-muted))", lineHeight: 1.5 }}>
                  {entry.message}
                </p>

                {/* Internal notes are withheld from the initiator; say so, so the
                    author knows who can read what they wrote. */}
                {entry.isInternal && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", marginTop: "0.5rem", fontSize: "0.68rem", fontWeight: 700, color: "rgb(var(--color-warning))" }}>
                    <Icons.EyeOff size={11} /> INTERNAL NOTE
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Live status, read off the request rather than a fixed caption */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.6rem 0.85rem",
          background: "rgb(var(--color-surface-secondary) / 0.6)",
          border: "1px solid rgb(var(--color-card-border))",
          borderRadius: "8px",
          fontSize: "0.75rem",
          color: "rgb(var(--color-text-muted))",
        }}
      >
        <span>Current status:</span>
        <span className={`badge ${statusBadgeClass(expense.status)}`}>{humanizeStatus(expense.status)}</span>
      </div>
    </ModalShell>
  );
};
