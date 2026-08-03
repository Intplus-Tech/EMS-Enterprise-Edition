"use client";

/**
 * EmptyState — the "nothing here yet" placeholder every table and list must show
 * instead of a bare empty tbody. Keeps the wording/spacing consistent app-wide.
 */

import React from "react";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  /** Optional call-to-action, e.g. a "New Request" button. */
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      padding: "2.75rem 1.5rem",
      textAlign: "center",
    }}
  >
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: "50%",
        background: "rgb(var(--color-text-muted) / 0.12)",
        color: "rgb(var(--color-text-dim))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "0.35rem",
      }}
    >
      {icon}
    </div>
    <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "rgb(var(--color-text))", margin: 0 }}>{title}</p>
    {description && (
      <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", margin: 0, maxWidth: "38ch" }}>
        {description}
      </p>
    )}
    {action && <div style={{ marginTop: "0.75rem" }}>{action}</div>}
  </div>
);
