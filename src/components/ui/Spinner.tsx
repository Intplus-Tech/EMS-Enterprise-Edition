/**
 * Spinner — the single loading indicator primitive for the whole app.
 *
 * Consumed by `SubmitButton`, `PageLoader`, `BusyOverlay` and any screen that
 * needs an inline busy hint. Purely presentational: the ring, its size and its
 * colour are all CSS (see the "Motion & loading states" block in globals.css),
 * so this file only maps props onto class names.
 */

import React from "react";

export type SpinnerSize = "sm" | "md" | "lg" | "xl";

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Use on a filled/brand-coloured background so the ring stays legible. */
  onFill?: boolean;
  /**
   * Announced to screen readers. Pass `null` for decorative spinners that sit
   * beside text already describing the wait — otherwise it is read twice.
   */
  label?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  onFill = false,
  label = "Loading",
  className = "",
  style,
}) => {
  const classes = ["spinner", `spinner-${size}`, onFill ? "spinner-on-fill" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      style={style}
      // `status` (not `alert`) so assistive tech announces politely rather than
      // interrupting whatever the user is reading.
      role={label ? "status" : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
    />
  );
};
