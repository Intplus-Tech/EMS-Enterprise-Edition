/**
 * SubmitButton — a `.btn` that shows its own in-flight state.
 *
 * Every form in the app previously either froze with no feedback or hand-rolled
 * an `opacity`/"Saving..." pair, so the same behaviour was written a dozen ways.
 * Callers now pass `loading` and get the spinner, the disabled state and the
 * `aria-busy` wiring for free.
 *
 * Presentational only — it takes a `loading` flag and an `onClick`/`type`, never
 * a promise or a fetch of its own.
 */

import React from "react";
import { Spinner } from "./Spinner";

export interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** True while the action this button triggered is still running. */
  loading?: boolean;
  /** Replaces the label while `loading`; the idle label is kept when omitted. */
  loadingLabel?: string;
  /** Maps to the existing `.btn-*` classes in globals.css. */
  variant?: "primary" | "secondary" | "danger";
  /** Rendered before the label when idle, e.g. a lucide icon. */
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  loading = false,
  loadingLabel,
  variant = "primary",
  icon,
  children,
  className = "",
  disabled,
  style,
  ...rest
}) => {
  const isBusy = loading;

  return (
    <button
      {...rest}
      // Disabling on `loading` is what actually blocks the double submit that
      // duplicated records before; `aria-busy` is only the announcement.
      disabled={disabled || isBusy}
      aria-busy={isBusy || undefined}
      className={`btn btn-${variant} ${className}`.trim()}
      style={style}
    >
      {isBusy ? (
        <>
          {/* Decorative: the label beside it already states what is happening. */}
          <Spinner size="sm" onFill={variant !== "secondary"} label={null} />
          {loadingLabel ?? children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
};
