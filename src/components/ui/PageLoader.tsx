/**
 * PageLoader — the branded whole-screen wait state.
 *
 * Used by the App Router `loading.tsx` suspense boundaries, by the dashboard
 * shell while the session and first dataset resolve, and by the auth entry
 * redirect. One loader for all three so a cold start looks like one product
 * rather than three different spinners.
 */

import React from "react";
import { BRANDING } from "../../config/branding";
import { Spinner } from "./Spinner";

export interface PageLoaderProps {
  /** Primary line, e.g. "Loading approvals". Defaults to the product name. */
  message?: string;
  /** Optional second line explaining a longer wait. */
  hint?: string;
  /**
   * `true` fills the viewport and paints the app background — correct when the
   * loader stands in for the entire shell. `false` fills the content column
   * only, leaving the sidebar visible during a route change.
   */
  fullScreen?: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  message = `Loading ${BRANDING.appName}`,
  hint,
  fullScreen = false,
}) => (
  <div className={`page-loader${fullScreen ? " page-loader-full" : ""}`}>
    {/* Haloed ring — the halo is a CSS pseudo-element on the mark. */}
    <div className="page-loader-mark">
      <Spinner size="xl" label={null} />
    </div>

    <div style={{ textAlign: "center" }}>
      <p style={{ fontWeight: 600, color: "rgb(var(--color-text))", fontSize: "0.95rem" }}>{message}</p>
      {hint && (
        <p style={{ marginTop: "0.35rem", fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>
          {hint}
        </p>
      )}
    </div>
  </div>
);
