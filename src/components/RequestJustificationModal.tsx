import React, { useState } from "react";
import * as Icons from "lucide-react";

interface MessageItem {
  id: string;
  senderRole: "Initiator" | "Dept Head" | "Final Approval Comment" | "Finance Head" | "Approver";
  senderName?: string;
  time: string;
  text: string;
  isApproval?: boolean;
  avatarBg?: string;
}

interface RequestJustificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestNumber?: string;
  requestTitle?: string;
  departmentApprover?: string;
  messages?: MessageItem[];
  onSendMessage?: (question: string) => void;
}

export const RequestJustificationModal: React.FC<RequestJustificationModalProps> = ({
  isOpen,
  onClose,
  requestNumber = "#0044",
  requestTitle = "Cooling Unit Replacement",
  departmentApprover = "K. Adeyemi",
  messages: customMessages,
  onSendMessage
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Default initial messages matching exact screenshot text
  const defaultMessages: MessageItem[] = [
    {
      id: "msg-1",
      senderRole: "Initiator",
      time: "09:12 AM",
      text: "Please find the invoice for the Q3 Server maintenance attached.",
      avatarBg: "#2563EB"
    },
    {
      id: "msg-2",
      senderRole: "Dept Head",
      time: "11:45 AM",
      text: "The amount is slightly above the usual maintenance fee. Please provide further justification for the 15% increase.",
      avatarBg: "#93C5FD"
    },
    {
      id: "msg-3",
      senderRole: "Initiator",
      time: "02:30 PM",
      text: "The increase is due to the emergency replacement of the cooling fans which were not in the initial quote. Justification document uploaded.",
      avatarBg: "#2563EB"
    },
    {
      id: "msg-4",
      senderRole: "Final Approval Comment",
      senderName: "Dept Head",
      time: "04:15 PM",
      text: '"Justification accepted. Urgent maintenance confirmed. Approved for Finance processing."',
      isApproval: true,
      avatarBg: "#16A34A"
    }
  ];

  const [messageList, setMessageList] = useState<MessageItem[]>(customMessages || defaultMessages);

  if (!isOpen) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!questionText.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const newMsg: MessageItem = {
        id: `msg-${Date.now()}`,
        senderRole: "Finance Head",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: questionText,
        avatarBg: "#2563EB"
      };

      setMessageList(prev => [...prev, newMsg]);
      if (onSendMessage) {
        onSendMessage(questionText);
      }
      setQuestionText("");
      setIsSubmitting(false);
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 3000);
    }, 400);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
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
          border: "1px solid rgba(var(--color-card-border), 0.6)",
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
              border: "1px solid rgba(var(--color-card-border), 0.5)",
              borderRadius: "12px",
              padding: "1.25rem",
              background: "rgba(var(--color-surface-secondary), 0.3)"
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
                  {messageList.length} Total Messages
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

            {/* Timeline of Messages */}
            {!isCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "relative" }}>
                {messageList.map((msg, index) => {
                  const isLast = index === messageList.length - 1;

                  if (msg.isApproval) {
                    return (
                      <div key={msg.id} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", position: "relative" }}>
                        {/* Timeline connector line */}
                        {!isLast && (
                          <div
                            style={{
                              position: "absolute",
                              left: "14px",
                              top: "32px",
                              bottom: "-20px",
                              width: "2px",
                              background: "rgba(var(--color-card-border), 0.4)"
                            }}
                          />
                        )}

                        {/* Green checkmark circle icon */}
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            backgroundColor: "#16A34A",
                            color: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            zIndex: 2
                          }}
                        >
                          <Icons.Check size={16} />
                        </div>

                        {/* Approval Box */}
                        <div
                          style={{
                            flexGrow: 1,
                            background: "rgba(34, 197, 94, 0.08)",
                            border: "1px solid rgba(34, 197, 94, 0.25)",
                            borderRadius: "10px",
                            padding: "1rem 1.15rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.4rem"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.825rem", fontWeight: "700", color: "#16A34A" }}>
                              {msg.senderRole}
                            </span>
                            <span style={{ fontSize: "0.725rem", color: "rgb(var(--color-text-dim))" }}>
                              {msg.time}
                            </span>
                          </div>

                          <p style={{ fontSize: "0.875rem", fontStyle: "italic", fontWeight: "600", color: "#15803D", margin: 0, lineHeight: 1.5 }}>
                            {msg.text}
                          </p>

                          <span style={{ fontSize: "0.775rem", color: "#16A34A", fontWeight: "600", marginTop: "0.2rem" }}>
                            — {msg.senderName || "Dept Head"}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", position: "relative" }}>
                      {/* Timeline connector line */}
                      {!isLast && (
                        <div
                          style={{
                            position: "absolute",
                            left: "14px",
                            top: "32px",
                            bottom: "-20px",
                            width: "2px",
                            background: "rgba(var(--color-card-border), 0.4)"
                          }}
                        />
                      )}

                      {/* User Avatar circle icon */}
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          backgroundColor: msg.avatarBg || "#2563EB",
                          color: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          zIndex: 2
                        }}
                      >
                        <Icons.User size={15} />
                      </div>

                      {/* Message Box */}
                      <div
                        style={{
                          flexGrow: 1,
                          background: "rgba(var(--color-surface), 0.5)",
                          border: "1px solid rgba(var(--color-card-border), 0.4)",
                          borderRadius: "10px",
                          padding: "0.85rem 1.15rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.35rem"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.825rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
                            {msg.senderRole}
                          </span>
                          <span style={{ fontSize: "0.725rem", color: "rgb(var(--color-text-dim))" }}>
                            {msg.time}
                          </span>
                        </div>

                        <p style={{ fontSize: "0.875rem", color: "rgb(var(--color-text))", margin: 0, lineHeight: 1.5 }}>
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Section: Question to Departmental Approver (Soft Blue Box) */}
        <div
          style={{
            background: "rgba(239, 246, 255, 0.9)",
            border: "1px solid #BFDBFE",
            borderRadius: "12px",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#1E40AF" }}>
            <Icons.HelpCircle size={18} />
            <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>
              Your Question to the Departmental Approver ({departmentApprover})
            </span>
          </div>

          <textarea
            rows={3}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Example: Please provide a detailed risk assessment for hardware failure if this is not replaced within 48 hours. Are there cheaper emergency rental alternatives available locally?"
            style={{
              width: "100%",
              padding: "0.85rem",
              fontSize: "0.875rem",
              borderRadius: "8px",
              border: "1px solid #93C5FD",
              background: "#FFFFFF",
              color: "#1E293B",
              outline: "none",
              lineHeight: 1.5,
              resize: "vertical"
            }}
          />
        </div>

        {/* Section: Audit Info Banner */}
        <div
          style={{
            background: "rgba(var(--color-surface-secondary), 0.4)",
            border: "1px solid rgba(var(--color-card-border), 0.4)",
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
            <Icons.CheckCircle size={16} /> Question transmitted successfully to {departmentApprover}.
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
              border: "1px solid rgba(var(--color-card-border), 0.6)",
              background: "transparent",
              color: "rgb(var(--color-text))",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={isSubmitting || !questionText.trim()}
            className="btn btn-primary"
            style={{
              padding: "0.6rem 1.5rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              background: isSubmitting || !questionText.trim() ? "#93C5FD" : "#2563EB",
              color: "#FFFFFF",
              border: "none",
              cursor: isSubmitting || !questionText.trim() ? "not-allowed" : "pointer"
            }}
          >
            {isSubmitting ? "Sending..." : "Send Request"}
          </button>
        </div>
      </div>
    </div>
  );
};
