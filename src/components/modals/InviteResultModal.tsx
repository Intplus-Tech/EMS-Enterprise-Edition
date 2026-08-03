"use client";

import React from "react";
import * as Icons from "lucide-react";

interface InviteResultModalProps {
  inviteResult: any;
  onClose: () => void;
}

export const InviteResultModal: React.FC<InviteResultModalProps> = ({
  inviteResult,
  onClose,
}) => {
  if (!inviteResult) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "650px", maxHeight: "90vh", overflowY: "auto", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgb(var(--color-secondary))" }}>
            <Icons.CheckCircle size={24} />
            <h3 style={{ fontWeight: "bold", color: "#fff" }}>Invitation Successful</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
            <Icons.X size={24} />
          </button>
        </div>

        <p style={{ fontSize: "0.9rem", color: "rgb(var(--color-text-muted))" }}>
          The user record has been created. An invitation email was simulated. You can preview the email template and copy the setup URL below.
        </p>

        <div className="glass-card" style={{ background: "rgb(var(--color-surface-secondary) / 0.3)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-dim))", textTransform: "uppercase", fontWeight: "bold" }}>Setup Activation Link</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input 
              type="text" 
              readOnly 
              value={inviteResult.inviteUrl} 
              style={{ flexGrow: 1, padding: "0.5rem", borderRadius: "4px", background: "#0a0a0a", border: "1px solid rgb(var(--color-card-border))", color: "#fff", fontSize: "0.85rem" }} 
            />
            <button 
              onClick={() => {
                navigator.clipboard.writeText(inviteResult.inviteUrl);
                alert("Invite link copied to clipboard!");
              }}
              className="btn btn-primary"
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
            >
              Copy Link
            </button>
          </div>
          <a href={inviteResult.inviteUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", color: "rgb(var(--color-primary))", textDecoration: "underline", alignSelf: "flex-start" }}>
            Open Activation Page directly &rarr;
          </a>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-dim))", textTransform: "uppercase", fontWeight: "bold" }}>Decoupled HTML Email Preview</span>
          <iframe 
            srcDoc={inviteResult.emailHtml} 
            title="Email Preview" 
            style={{ 
              width: "100%", 
              height: "360px", 
              border: "1px solid rgb(var(--color-card-border))", 
              borderRadius: "8px", 
              background: "#fff" 
            }} 
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
