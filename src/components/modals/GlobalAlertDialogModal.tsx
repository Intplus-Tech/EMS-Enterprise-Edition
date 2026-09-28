"use client";

import React from "react";
import * as Icons from "lucide-react";
import { BRANDING } from "../../config/branding";

interface GlobalAlertDialogModalProps {
  alertDialog: { isOpen: boolean; message: string };
  onClose: () => void;
}

export const GlobalAlertDialogModal: React.FC<GlobalAlertDialogModalProps> = ({
  alertDialog,
  onClose,
}) => {
  if (!alertDialog.isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "420px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: "700", fontSize: "1rem", color: "rgb(var(--color-text))" }}>{BRANDING.appName} Notification</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer" }}>
            <Icons.X size={20} />
          </button>
        </div>
        
        <p style={{ fontSize: "0.95rem", color: "rgb(var(--color-text-muted))", lineHeight: "1.6", margin: "1rem 0" }}>
          {alertDialog.message}
        </p>

        <button onClick={onClose} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
          Dismiss
        </button>
      </div>
    </div>
  );
};
