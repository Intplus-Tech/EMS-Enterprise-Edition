"use client";

/**
 * ElectronicSignatureField — identity re-confirmation block required by the
 * approval designs before any financial decision is committed.
 *
 * Controlled component: the secret never leaves the parent's state and is never
 * logged or echoed anywhere else in the UI.
 */

import React from "react";
import * as Icons from "lucide-react";

export interface ElectronicSignatureFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Overrides the default disbursement wording for non-payment decisions. */
  description?: string;
}

export const ElectronicSignatureField: React.FC<ElectronicSignatureFieldProps> = ({
  value,
  onChange,
  description = "Please confirm your identity by entering your security PIN or password to authorize this disbursement.",
}) => (
  <div
    style={{
      padding: "1.15rem",
      borderRadius: "0.65rem",
      background: "rgba(37, 99, 235, 0.08)",
      border: "1px solid rgba(37, 99, 235, 0.18)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
      <Icons.ShieldCheck size={18} style={{ color: "#2563EB" }} />
      <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "rgb(var(--color-text))" }}>
        Electronic Signature
      </span>
    </div>

    <p style={{ fontSize: "0.82rem", color: "rgb(var(--color-text-muted))", lineHeight: 1.5, marginBottom: "0.85rem" }}>
      {description}
    </p>

    <div style={{ position: "relative" }}>
      <Icons.Lock
        size={15}
        style={{
          position: "absolute",
          left: "0.75rem",
          top: "50%",
          transform: "translateY(-50%)",
          color: "rgb(var(--color-text-dim))",
        }}
      />
      <input
        type="password"
        autoComplete="current-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        className="form-input"
        style={{ paddingLeft: "2.25rem" }}
      />
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.6rem" }}>
      <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))" }}>
        Authorized by biometric-linked vault
      </span>
      <a href="/forgot-password" style={{ fontSize: "0.75rem", fontWeight: 600, color: "#2563EB" }}>
        Forgot security PIN?
      </a>
    </div>
  </div>
);
