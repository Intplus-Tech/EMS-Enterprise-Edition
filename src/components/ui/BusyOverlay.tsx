/**
 * BusyOverlay — dims a panel that is refreshing in place.
 *
 * For work that replaces the contents of something already on screen (a table
 * reloading, a modal saving) where a full-page loader would be too heavy and
 * losing the current view would be disorienting.
 *
 * The parent must establish a positioning context (`position: relative`) — the
 * overlay is absolutely positioned and inherits the parent's border radius.
 */

import React from "react";
import { Spinner } from "./Spinner";

export interface BusyOverlayProps {
  /** Nothing renders when false, so callers can leave this mounted. */
  active: boolean;
  label?: string;
}

export const BusyOverlay: React.FC<BusyOverlayProps> = ({ active, label = "Updating…" }) => {
  if (!active) return null;

  return (
    <div className="busy-overlay">
      <Spinner size="md" label={null} />
      <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "rgb(var(--color-text-muted))" }}>
        {label}
      </span>
    </div>
  );
};
