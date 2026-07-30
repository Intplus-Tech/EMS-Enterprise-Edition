"use client";

/**
 * NoticeBanner — inline success/error feedback for persisted actions.
 *
 * Replaces the `window.alert()` calls the admin modals used to fire, which
 * reported success unconditionally even when nothing had been saved. Renders
 * nothing when there is no notice, so callers can mount it unconditionally.
 */

import React, { useEffect } from "react";
import * as Icons from "lucide-react";

export interface Notice {
  tone: "success" | "error";
  message: string;
}

export interface NoticeBannerProps {
  notice: Notice | null;
  onDismiss: () => void;
  /** Errors stay until dismissed; successes auto-clear after this many ms. */
  autoDismissMs?: number;
}

export const NoticeBanner: React.FC<NoticeBannerProps> = ({
  notice,
  onDismiss,
  autoDismissMs = 5000,
}) => {
  const shouldAutoDismiss = notice?.tone === "success";

  useEffect(() => {
    if (!shouldAutoDismiss) return;
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [shouldAutoDismiss, notice?.message, autoDismissMs, onDismiss]);

  if (!notice) return null;

  const isError = notice.tone === "error";
  const accent = isError ? "239, 68, 68" : "16, 185, 129";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.65rem",
        padding: "0.85rem 1rem",
        marginBottom: "1.25rem",
        borderRadius: "0.6rem",
        background: `rgba(${accent}, 0.12)`,
        border: `1px solid rgba(${accent}, 0.35)`,
        color: "rgb(var(--color-text))",
        fontSize: "0.85rem",
      }}
    >
      {isError ? (
        <Icons.AlertCircle size={18} style={{ color: `rgb(${accent})`, flexShrink: 0, marginTop: "1px" }} />
      ) : (
        <Icons.CheckCircle2 size={18} style={{ color: `rgb(${accent})`, flexShrink: 0, marginTop: "1px" }} />
      )}
      <span style={{ flex: 1, lineHeight: 1.45 }}>{notice.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{
          background: "none",
          border: "none",
          color: "rgb(var(--color-text-muted))",
          cursor: "pointer",
          padding: 0,
          lineHeight: 0,
        }}
      >
        <Icons.X size={16} />
      </button>
    </div>
  );
};
