"use client";

import React from "react";
import * as Icons from "lucide-react";

interface PerDiemPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PerDiemPolicyModal: React.FC<PerDiemPolicyModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 105, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "550px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontWeight: "bold" }}>Per Diem Travel Policy Update</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer" }}>
            <Icons.X size={24} />
          </button>
        </div>

        <p style={{ fontSize: "0.9rem", color: "rgb(var(--color-text-muted))" }}>
          The following standard domestic travel per diem limits are active from August 1, 2026 for all departments:
        </p>

        <div className="table-container" style={{ margin: "0.5rem 0" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Location Region</th>
                <th>Lodging Cap (per Night)</th>
                <th>Meal / Local Per Diem</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Lagos Met</strong></td>
                <td>₦50,000</td>
                <td>₦15,000</td>
              </tr>
              <tr>
                <td><strong>Abuja (FCT)</strong></td>
                <td>₦45,000</td>
                <td>₦12,500</td>
              </tr>
              <tr>
                <td><strong>Other States</strong></td>
                <td>₦30,000</td>
                <td>₦8,000</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="glass-card" style={{ background: "rgba(15,23,42,0.3)", padding: "1rem", borderLeft: "4px solid rgb(var(--color-primary))" }}>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "rgb(var(--color-text-muted))", lineHeight: "1.4" }}>
            <strong>Important:</strong> Reimbursable lodging requires an original hotel billing invoice containing merchant logo and paid validation seal. Pre-booking confirmations are not acceptable.
          </p>
        </div>

        <button onClick={onClose} className="btn btn-primary" style={{ alignSelf: "flex-end" }}>
          I Understand
        </button>
      </div>
    </div>
  );
};
