/**
 * Presentation-layer formatting helpers.
 *
 * Single source of truth for how money, dates and statuses are rendered so that
 * every tab/modal shows identical strings. Pure functions only — no React, no I/O.
 */

/** Naira amount with thousands separators, e.g. `₦1,450,000`. */
export function formatNaira(amount?: number | null): string {
  return `₦${Number(amount ?? 0).toLocaleString()}`;
}

/** Naira amount with kobo, matching the design's `₦ 1,450,000.00` treatment. */
export function formatNairaPrecise(amount?: number | null): string {
  return `₦${Number(amount ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact money used on KPI cards, e.g. `₦28.4M` / `₦800k`. */
export function formatNairaCompact(amount?: number | null): string {
  const value = Number(amount ?? 0);
  if (Math.abs(value) >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `₦${Math.round(value / 1_000)}k`;
  return `₦${value}`;
}

/** `Oct 24, 2023` — the date format used across every table in the designs. */
export function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** `Oct 24, 09:12 AM` — used by communication threads and audit timelines. */
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${date.toLocaleTimeString(
    undefined,
    { hour: "2-digit", minute: "2-digit" }
  )}`;
}

/** `PENDING_APPROVAL` -> `PENDING APPROVAL`, for badge labels. */
export function humanizeStatus(status?: string | null): string {
  return (status || "").replace(/_/g, " ");
}

/**
 * Maps a workflow status onto one of the `badge-*` classes in globals.css.
 * Centralised so a status never renders with a different colour on another screen.
 */
export function statusBadgeClass(status?: string | null): string {
  switch (status) {
    case "PAID":
    case "CLOSED":
    case "APPROVED":
      return "badge-approved";
    case "REJECTED":
    case "CANCELLED":
      return "badge-rejected";
    case "DRAFT":
      return "badge-draft";
    case "RETURNED":
    case "PENDING_EXCEPTIONAL":
    // The flag and the Finance Head review are one branch of the flow, so they
    // read as one colour rather than this one falling through to the default.
    case "INSUFFICIENT_BUDGET":
      return "badge-budget-check";
    case "SENT_TO_FINANCE":
      return "badge-finance";
    case "UPLOADED_TO_BANK":
    // Both halves of the bank leg — instruction uploaded, cash not yet released.
    case "AWAITING_RELEASE":
      return "badge-bank";
    case "SUBMITTED":
      return "badge-submitted";
    default:
      return "badge-pending";
  }
}
