"use client";

import React from "react";
import * as Icons from "lucide-react";
import { formatNaira } from "../ui/format";

interface ViewReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReceiptData: any;
}

export const ViewReceiptModal: React.FC<ViewReceiptModalProps> = ({
  isOpen,
  onClose,
  selectedReceiptData,
}) => {
  if (!isOpen || !selectedReceiptData) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 105, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "450px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: "700", fontSize: "0.95rem" }}>Transaction Invoice Receipt</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer" }}>
            <Icons.X size={20} />
          </button>
        </div>

        <div style={{ padding: "1.5rem", background: "rgb(var(--color-card-border) / 0.1)", borderRadius: "12px", border: "1px solid rgb(var(--color-card-border) / 0.2)", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(16,185,129,0.15)", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.5rem" }}>
            <Icons.CheckCircle size={28} />
          </div>
          <div>
            {/* Shared helper; the `|| 12000` that used to sit here invented a
                design sample amount whenever the receipt carried none. */}
            <h4 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "0" }}>{formatNaira(selectedReceiptData.amount)}</h4>
            <p style={{ color: "#10B981", fontSize: "0.85rem", margin: "0.25rem 0 0" }}><span className="badge badge-paid">PAID</span></p>
          </div>

          <div style={{ width: "100%", borderTop: "1px dashed rgb(var(--color-card-border) / 0.4)", margin: "0.5rem 0" }} />

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.85rem", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "rgb(var(--color-text-dim))" }}>Bank Reference</span>
              <strong style={{ fontFamily: "monospace" }}>{selectedReceiptData.reference || "BNK-2026-0829-01"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "rgb(var(--color-text-dim))" }}>Category</span>
              <strong>{selectedReceiptData.category || "Software & Services"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "rgb(var(--color-text-dim))" }}>Request ID</span>
              <strong>{selectedReceiptData.requestNumber || "REQ-0482"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "rgb(var(--color-text-dim))" }}>Date Cleared</span>
              <strong>{new Date().toLocaleDateString()}</strong>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="btn btn-primary" style={{ width: "100%" }}>
          Done / Close
        </button>
      </div>
    </div>
  );
};
