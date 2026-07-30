"use client";

/**
 * StatCard — the KPI tile repeated on every dashboard, history and admin screen.
 *
 * Extracted because the same icon + label + value block was duplicated across
 * RequestsTab, HistoryTab and the admin tabs with slightly different markup.
 */

import React from "react";

export interface StatCardProps {
  label: string;
  /** Secondary line under the label, e.g. "this month" / "across all statuses". */
  hint?: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  /**
   * Semantic accent. `danger` is used for the "Total Rejected" tile which the
   * designs render in red; everything else keeps the brand blue.
   */
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
}

const TONE_COLORS: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "37, 99, 235",
  success: "16, 185, 129",
  warning: "245, 158, 11",
  danger: "239, 68, 68",
  neutral: "100, 116, 139",
};

export const StatCard: React.FC<StatCardProps> = ({ label, hint, value, icon, tone = "primary" }) => {
  const rgb = TONE_COLORS[tone];

  return (
    <div
      className="glass-card"
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "1.25rem 1.35rem",
      }}
    >
      <div>
        <p style={{ fontSize: "0.95rem", fontWeight: 700, color: `rgb(${rgb})`, margin: 0 }}>{label}</p>
        {hint && (
          <p style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-muted))", margin: "0.1rem 0 0" }}>{hint}</p>
        )}
        <h3
          style={{
            fontSize: "1.6rem",
            fontWeight: 800,
            marginTop: "0.65rem",
            color: tone === "danger" ? `rgb(${rgb})` : "rgb(var(--color-text))",
          }}
        >
          {value}
        </h3>
      </div>

      {/* Icon chip — tinted with the same tone so the tile reads at a glance */}
      <div
        style={{
          flexShrink: 0,
          width: 38,
          height: 38,
          borderRadius: "0.6rem",
          background: `rgba(${rgb}, 0.12)`,
          color: `rgb(${rgb})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
    </div>
  );
};
