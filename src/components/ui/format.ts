/**
 * Presentation-layer formatting helpers.
 *
 * Single source of truth for how money, dates and statuses are rendered so that
 * every tab/modal shows identical strings. Pure functions only — no React, no I/O.
 */

/**
 * The application's only currency. Every amount stored, entered, logged or
 * rendered is Naira — there is no multi-currency support and no conversion
 * anywhere in the stack, so a `$` on screen is always a bug, not another
 * currency. The three helpers below are the only places this symbol is written.
 */
export const CURRENCY_SYMBOL = "₦";

/**
 * Grouping is pinned rather than left to the reader's locale.
 *
 * `toLocaleString()` with no locale follows whatever the runtime is set to, so
 * the same amount rendered on the server and re-rendered in a de-DE browser
 * disagreed (`1,450,000` vs `1.450.000`) — a hydration mismatch as well as an
 * inconsistency. en-NG is the locale that goes with the currency and formats
 * `1,450,000.00`.
 */
const MONEY_LOCALE = "en-NG";

/** Naira amount with thousands separators, e.g. `₦1,450,000`. */
export function formatNaira(amount?: number | null): string {
  return `${CURRENCY_SYMBOL}${Number(amount ?? 0).toLocaleString(MONEY_LOCALE)}`;
}

/** Naira amount with kobo, matching the design's `₦ 1,450,000.00` treatment. */
export function formatNairaPrecise(amount?: number | null): string {
  return `${CURRENCY_SYMBOL}${Number(amount ?? 0).toLocaleString(MONEY_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact money used on KPI cards, e.g. `₦28.4M` / `₦800k`. */
export function formatNairaCompact(amount?: number | null): string {
  const value = Number(amount ?? 0);
  if (Math.abs(value) >= 1_000_000) return `${CURRENCY_SYMBOL}${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${CURRENCY_SYMBOL}${Math.round(value / 1_000)}k`;
  return `${CURRENCY_SYMBOL}${value}`;
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
 * What a request is actually waiting on, for badges and queue tables.
 *
 * PENDING_APPROVAL covers two distinct queues — the departmental approver and
 * then the Finance Officer — so the bare status leaves a reader unable to tell
 * which desk a request is sitting on. The server resolves the active step's
 * name against the configured chain and sends it as `currentStageName`; this
 * prefers it and falls back to the status for every other state.
 *
 * A request held for a missing budget period shares the INSUFFICIENT_BUDGET
 * status with a genuine overrun but is not one — nobody has ruled it over
 * budget, its department simply has no allocation yet — so it is named for what
 * it is actually waiting on.
 */
export function stageLabel(
  expense?: { status?: string; currentStageName?: string; awaitingBudgetPeriod?: boolean } | null
): string {
  if (!expense) return "";
  if (expense.awaitingBudgetPeriod) return "AWAITING BUDGET SETUP";
  return expense.currentStageName
    ? expense.currentStageName.toUpperCase()
    : humanizeStatus(expense.status);
}

/**
 * How a decision comment is attributed in the release designs — by the role's
 * job in the flow rather than the raw enum. Shared by the release review and
 * completed release dialogs, which show the same trail either side of payment.
 */
const JUSTIFICATION_LABELS: Record<string, string> = {
  APPROVER: "Approver's Justification (Dept. Head)",
  FINANCE_HEAD: "Finance Head's Justification",
  FINANCE_OFFICER: "Finance Officer's Justification",
  FINANCE_MANAGER: "Finance Manager's Justification",
};

/** `null` for roles that contribute no justification (the initiator's own notes). */
export function justificationLabel(actorRole?: string | null): string | null {
  return JUSTIFICATION_LABELS[actorRole ?? ""] ?? null;
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

/**
 * Payment method for a released request.
 *
 * Nothing on the model stores it yet, so it is inferred from the reference
 * prefix. Lived as two byte-identical private copies in ApprovalsTab and
 * PaymentHistoryTab, each carrying a comment promising to keep the other in
 * step; the payment record card is a third reader, so it lives here now.
 */
export function paymentMethodOf(expense?: {
  paymentMethod?: string | null;
  paymentReference?: string | null;
} | null): string {
  if (expense?.paymentMethod) return expense.paymentMethod;
  const reference = expense?.paymentReference || "";
  if (reference.startsWith("CASH")) return "Cash";
  if (reference.startsWith("CHQ")) return "Cheque";
  return "Transfer";
}
