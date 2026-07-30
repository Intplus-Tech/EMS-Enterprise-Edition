"use client";

/**
 * RequestReferenceCard — the tinted "REFERENCE ID / AMOUNT" summary block that
 * heads every approval decision dialog (Approve Financial Request, Reject or
 * Request Clarification, Release Review).
 */

import React from "react";
import * as Icons from "lucide-react";
import { formatNairaPrecise } from "./format";

export interface RequestReferenceCardProps {
  requestNumber: string;
  title: string;
  amount: number;
  /** Right-hand caption above the amount; defaults to the approval wording. */
  amountLabel?: string;
  /** Compact variant renders the document icon used by the rejection dialog. */
  variant?: "highlight" | "compact";
}

export const RequestReferenceCard: React.FC<RequestReferenceCardProps> = ({
  requestNumber,
  title,
  amount,
  amountLabel = "APPROVAL AMOUNT",
  variant = "highlight",
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "1rem",
      padding: "1rem 1.15rem",
      borderRadius: "0.65rem",
      background: "rgba(37, 99, 235, 0.08)",
      border: "1px solid rgba(37, 99, 235, 0.18)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
      {variant === "compact" && (
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "0.5rem",
            background: "rgba(var(--color-text-muted), 0.15)",
            color: "rgb(var(--color-text-muted))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icons.FileText size={18} />
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        {variant === "highlight" && (
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#2563EB", letterSpacing: "0.06em" }}>
            REFERENCE ID
          </div>
        )}
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "rgb(var(--color-text))" }}>{requestNumber}</div>
        <div
          style={{
            fontSize: "0.82rem",
            color: "rgb(var(--color-text-muted))",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
      </div>
    </div>

    <div style={{ textAlign: "right", flexShrink: 0 }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#2563EB", letterSpacing: "0.06em" }}>
        {amountLabel}
      </div>
      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#2563EB", marginTop: "0.2rem" }}>
        {formatNairaPrecise(amount)}
      </div>
    </div>
  </div>
);
