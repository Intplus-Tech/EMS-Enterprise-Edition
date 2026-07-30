"use client";

/**
 * ModalShell — the single dialog chrome used by every modal in the app.
 *
 * Owns only the backdrop, the card, the sticky header and the sticky footer so
 * that callers supply nothing but their own body content. Theme-aware: all
 * surfaces resolve through `rgb(var(--color-*))` so light mode works unchanged.
 */

import React from "react";
import * as Icons from "lucide-react";

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Small line under the title (the design calls this the modal "eyebrow"). */
  subtitle?: string;
  /** Footer actions, usually a Cancel + primary button pair. */
  footer?: React.ReactNode;
  /** Any CSS width; defaults to the 560px dialog used by most designs. */
  maxWidth?: string;
  children: React.ReactNode;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  footer,
  maxWidth = "560px",
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div
      // Clicking the backdrop dismisses; clicks inside the card are stopped below.
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          background: "rgb(var(--color-card))",
          border: "1px solid rgb(var(--color-card-border))",
          borderRadius: "1rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.45)",
          overflow: "hidden",
        }}
      >
        {/* Sticky header — title, optional subtitle, close affordance */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            padding: "1.5rem 1.75rem",
            borderBottom: "1px solid rgb(var(--color-card-border))",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "rgb(var(--color-text))" }}>{title}</h3>
            {subtitle && (
              <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", marginTop: "0.25rem" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: "none",
              border: "none",
              color: "rgb(var(--color-text-muted))",
              cursor: "pointer",
              padding: "0.15rem",
              lineHeight: 0,
            }}
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: "1.5rem 1.75rem", overflowY: "auto", flex: 1 }}>{children}</div>

        {/* Sticky footer — omitted when the caller renders its own actions inline */}
        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1.15rem 1.75rem",
              borderTop: "1px solid rgb(var(--color-card-border))",
              background: "rgba(var(--color-surface-secondary), 0.35)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
