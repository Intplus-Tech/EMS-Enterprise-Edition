/**
 * RequestJustificationModal - designs/finance-head/Request Justification Modal
 * (Finance Head).png.
 *
 * The Finance Head reads the conversation so far and puts a question back to the
 * departmental approver. Both halves used to be theatre: the message history was
 * four hardcoded messages ("Please find the invoice for the Q3 Server
 * maintenance attached.", ...) shown for every request, and "Send Request"
 * pushed the typed question into local state after a 400ms fake delay, so it
 * reached nobody and vanished on close. The thread and the send now come from
 * the page, which owns the I/O (engineering rule 1-D).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react";
import * as Icons from "lucide-react";
import { EmptyState } from "./ui/EmptyState";
import { formatDateTime, humanizeStatus } from "./ui/format";
import { ThreadEntryDto } from "../types/api";

interface RequestJustificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestNumber?: string;
  requestTitle?: string;
  /** Named in the prompt above the question box; falls back to the generic role. */
  departmentApprover?: string;
  /** Workflow transitions merged with comments, newest last. */
  entries: ThreadEntryDto[];
  loading?: boolean;
  sending?: boolean;
  /** Posts the question; resolves false when the save was rejected. */
  onSendQuestion?: (question: string) => Promise<boolean>;
  /** Hides the question box on screens that only read history. */
  readOnly?: boolean;
}

export const RequestJustificationModal: React.FC<RequestJustificationModalProps> = ({
  isOpen,
  onClose,
  requestNumber,
  requestTitle,
  departmentApprover,
  entries,
  loading = false,
  sending = false,
  onSendQuestion,
  readOnly = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [sentSuccess, setSentSuccess] = useState(false);

  const approverLabel = departmentApprover || "Departmental Approver";

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!questionText.trim() || !onSendQuestion || sending) return;

    // Only clear the box and confirm once the server accepted the comment.
    if (await onSendQuestion(questionText.trim())) {
      setQuestionText("");
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgb(var(--color-overlay) / 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem"
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "rgb(var(--color-card))",
          border: "1px solid rgb(var(--color-card-border) / 0.6)",
          borderRadius: "16px",
          padding: "1.75rem 2rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "rgb(var(--color-text))", margin: 0, letterSpacing: "-0.01em" }}>
              Request Justification
            </h2>
            <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", marginTop: "0.2rem", display: "block" }}>
              Request {requestNumber} • {requestTitle}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgb(var(--color-text-muted))",
              cursor: "pointer",
              padding: "0.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              transition: "background 0.2s"
            }}
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Section: CURRENT CONVERSATION */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <span
            style={{
              fontSize: "0.725rem",
              fontWeight: "700",
              color: "rgb(var(--color-text-dim))",
              letterSpacing: "0.08em",
              textTransform: "uppercase"
            }}
          >
            CURRENT CONVERSATION
          </span>

          {/* Message History Card Container */}
          <div
            style={{
              border: "1px solid rgb(var(--color-card-border) / 0.5)",
              borderRadius: "12px",
              padding: "1.25rem",
              background: "rgb(var(--color-surface-secondary) / 0.3)"
            }}
          >
            {/* Card Top Sub-Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#2563EB" }}>
                <Icons.MessageSquare size={18} />
                <span style={{ fontWeight: "700", fontSize: "0.95rem", color: "rgb(var(--color-text))" }}>
                  Message History
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))" }}>
                  {entries.length} Total Message{entries.length === 1 ? "" : "s"}
                </span>
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563EB",
                    fontSize: "0.775rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  {isCollapsed ? "Expand" : "Collapse"}
                </button>
              </div>
            </div>

            {/* Timeline - the request's real thread. An approval decision is
                highlighted, matching the green "Final Approval Comment" card in
                the design. */}
            {!isCollapsed && (
              loading ? (
                <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", textAlign: "center", padding: "1.25rem" }}>
                  Loading the conversation...
                </p>
              ) : entries.length === 0 ? (
                <EmptyState
                  icon={<Icons.MessageSquare size={18} />}
                  title="No messages yet"
                  description="Decisions and comments on this request will appear here."
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "relative" }}>
                  {entries.map((entry, index) => {
                    const isLast = index === entries.length - 1;
                    const isApproval = ["APPROVE", "APPROVED"].includes(String(entry.action));

                    return (
                      <div key={entry.id} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", position: "relative" }}>
                        {/* Timeline connector line */}
                        {!isLast && (
                          <div
                            style={{
                              position: "absolute",
                              left: "14px",
                              top: "32px",
                              bottom: "-20px",
                              width: "2px",
                              background: "rgb(var(--color-card-border) / 0.4)"
                            }}
                          />
                        )}

                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            backgroundColor: isApproval ? "rgb(var(--color-secondary))" : "rgb(var(--color-primary))",
                            color: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            zIndex: 2
                          }}
                        >
                          {isApproval ? <Icons.Check size={16} /> : <Icons.User size={15} />}
                        </div>

                        <div
                          style={{
                            flexGrow: 1,
                            minWidth: 0,
                            background: isApproval ? "rgb(var(--color-secondary) / 0.08)" : "rgb(var(--color-surface) / 0.5)",
                            border: isApproval
                              ? "1px solid rgb(var(--color-secondary) / 0.25)"
                              : "1px solid rgb(var(--color-card-border) / 0.4)",
                            borderRadius: "10px",
                            padding: "0.85rem 1.15rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.35rem"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                            <span style={{ fontSize: "0.825rem", fontWeight: "700", color: isApproval ? "rgb(var(--color-secondary))" : "rgb(var(--color-text))" }}>
                              {entry.authorName}
                              <span style={{ fontWeight: 600, color: "rgb(var(--color-text-muted))", marginLeft: "0.4rem" }}>
                                {humanizeStatus(String(entry.authorRole))}
                              </span>
                            </span>
                            <span style={{ fontSize: "0.725rem", color: "rgb(var(--color-text-dim))", whiteSpace: "nowrap" }}>
                              {formatDateTime(entry.timestamp)}
                            </span>
                          </div>

                          <p
                            style={{
                              fontSize: "0.875rem",
                              margin: 0,
                              lineHeight: 1.5,
                              fontStyle: isApproval ? "italic" : "normal",
                              fontWeight: isApproval ? 600 : 400,
                              color: isApproval ? "rgb(var(--color-secondary))" : "rgb(var(--color-text))"
                            }}
                          >
                            {entry.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* Question to the departmental approver. Tinted with the brand token
            rather than the design's literal #EFF6FF / #BFDBFE, which painted a
            pale blue card with pale blue text in dark mode. */}
        {!readOnly && (
          <div
            style={{
              background: "rgb(var(--color-primary) / 0.08)",
              border: "1px solid rgb(var(--color-primary) / 0.25)",
              borderRadius: "12px",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgb(var(--color-primary))" }}>
              <Icons.HelpCircle size={18} />
              <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>
                Your Question to the Departmental Approver ({approverLabel})
              </span>
            </div>

            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Example: Please provide a detailed risk assessment for hardware failure if this is not replaced within 48 hours. Are there cheaper emergency rental alternatives available locally?"
              className="form-textarea"
              style={{ resize: "vertical", lineHeight: 1.5 }}
            />
          </div>
        )}

        {/* Section: Audit Info Banner */}
        <div
          style={{
            background: "rgb(var(--color-surface-secondary) / 0.4)",
            border: "1px solid rgb(var(--color-card-border) / 0.4)",
            borderRadius: "8px",
            padding: "0.85rem 1.15rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            color: "rgb(var(--color-text-muted))"
          }}
        >
          <Icons.Info size={18} style={{ color: "#2563EB", flexShrink: 0, marginTop: "2px" }} />
          <span style={{ fontSize: "0.8rem", lineHeight: "1.5" }}>
            The request remains in 'Pending' status while clarification is sought. Note: The Finance Officer maintains read-only visibility of this specific exchange until a final decision is posted.
          </span>
        </div>

        {sentSuccess && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              color: "#16A34A",
              fontSize: "0.85rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            <Icons.CheckCircle size={16} /> Question sent to {approverLabel}.
          </div>
        )}

        {/* Modal Footer Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.85rem", marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              padding: "0.6rem 1.35rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              border: "1px solid rgb(var(--color-card-border) / 0.6)",
              background: "transparent",
              color: "rgb(var(--color-text))",
              cursor: "pointer"
            }}
          >
            {readOnly ? "Close" : "Cancel"}
          </button>

          {/* Hidden on read-only screens, which have no question to send. */}
          {!readOnly && (
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={sending || !questionText.trim()}
              className="btn btn-primary"
              style={{
                padding: "0.6rem 1.5rem",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "600",
                opacity: sending || !questionText.trim() ? 0.55 : 1,
                cursor: sending || !questionText.trim() ? "not-allowed" : "pointer"
              }}
            >
              {sending ? "Sending..." : "Send Request"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
