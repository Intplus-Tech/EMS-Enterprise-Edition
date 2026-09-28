/* eslint-disable @typescript-eslint/no-explicit-any */
import { BANK_STAGE_STATUSES, OVER_BUDGET_STATUSES, RequestStatus } from "../../enums/statuses";
import { SystemRole } from "../../enums/roles";
import {
  NotificationType,
  collapsesInto,
  isCompletionStatus,
  notificationTypeFor,
} from "./notifiable-events";
import { requestStateLabel } from "./status-labels";
import { idOf, isSystemEntry } from "../identity/reference";
import { formatNaira } from "../../components/ui/format";

export type { NotificationType };

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  requestId: string;
  meta: Record<string, any>;
}

/** Same Naira rendering as the screens the notification links through to. */
const money = formatNaira;

/**
 * Human readable "time ago" label for a notification timestamp.
 */
export function formatRelativeTime(timestamp: string | Date | undefined): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const timeLabel = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const days = Math.floor(hours / 24);
  if (days === 1) return `Yesterday, ${timeLabel}`;
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function titleFor(type: NotificationType, requestNumber: string): string {
  switch (type) {
    case "RETURNED":
      return `Returned for Correction: ${requestNumber}`;
    case "REJECTED":
      return `Request Rejected: ${requestNumber}`;
    case "PAID":
      return `Payment Completed: ${requestNumber}`;
    case "APPROVED":
      return `Request Approved: ${requestNumber}`;
    case "CANCELLED":
      return `Request Cancelled: ${requestNumber}`;
    case "IN_PROGRESS":
      return `Status Update: ${requestNumber}`;
    default:
      return `Awaiting Your Review: ${requestNumber}`;
  }
}

function messageFor(type: NotificationType, expense: any, entry: any): string {
  const category = expense.category || "expense";
  const amount = money(expense.amount);
  const actor = entry?.actorName || "an approver";
  const reason = entry?.comment ? ` Reason: ${entry.comment}` : "";

  switch (type) {
    case "RETURNED":
      return `Your ${category} request for ${amount} was returned by ${actor}.${reason}`;
    case "REJECTED":
      return `Your ${category} request for ${amount} was rejected by ${actor}.${reason}`;
    case "PAID":
      return entry?.statusAfter === RequestStatus.CLOSED
        ? `Your ${category} request for ${amount} has been closed and the ledger updated.`
        : `Your ${category} request for ${amount} has been paid.` +
          (expense.paymentReference ? ` Bank Ref: ${expense.paymentReference}` : "");
    case "APPROVED":
      return `Your ${category} request for ${amount} was approved by ${actor}.` +
        (entry?.statusAfter === RequestStatus.SENT_TO_FINANCE
          ? " Moving to Finance for payment."
          : "");
    // A request the initiator did not withdraw themselves — the builder skips a
    // user's own actions, so reaching here means someone else cancelled it,
    // which in practice means their department was deleted.
    case "CANCELLED":
      return `Your ${category} request for ${amount} was cancelled by ${actor}.${reason}`;
    // Progress the initiator can watch but not act on. Each of these used to be
    // emailed and shown nowhere in the app.
    case "IN_PROGRESS":
      // "Flagged as over budget" would be untrue of a request merely held for a
      // missing period, so the flag qualifies the label. Pairing it with the
      // entry's own status keeps an unrelated transition from picking it up.
      return `Your ${category} request for ${amount} is now ${requestStateLabel({
        status: entry?.statusAfter,
        awaitingBudgetPeriod:
          entry?.statusAfter === RequestStatus.INSUFFICIENT_BUDGET &&
          Boolean(expense.awaitingBudgetPeriod),
      }).toLowerCase()}.${reason}`;
    default:
      return "";
  }
}

/**
 * Statuses that represent work sitting in a given reviewer role's queue.
 *
 * Returns a set rather than one status because two stages can share an owner:
 * the Finance Head rules on a request whether it is still flagged or already
 * routed to them, and the Finance Manager releases from either bank state.
 *
 * The approver and the Finance Officer are both approval steps, so both wait at
 * PENDING_APPROVAL — the status alone cannot tell their queues apart, which is
 * what `isOwnStage` below settles. SENT_TO_FINANCE stays on the officer's list
 * for records parked there before their approval carried the bank leg.
 */
function pendingStatusesForRole(role: string | undefined): string[] {
  switch (role) {
    case SystemRole.FINANCE_HEAD:
      return OVER_BUDGET_STATUSES;
    case SystemRole.APPROVER:
      return [RequestStatus.PENDING_APPROVAL];
    case SystemRole.FINANCE_OFFICER:
      return [RequestStatus.PENDING_APPROVAL, RequestStatus.SENT_TO_FINANCE];
    case SystemRole.FINANCE_MANAGER:
      return BANK_STAGE_STATUSES;
    default:
      return [];
  }
}

/**
 * Whether a pending request is resting on this role's own step.
 *
 * Only PENDING_APPROVAL is ambiguous: it covers the departmental approver and
 * the Finance Officer alike, so matching on status alone told the approver that
 * a request already sitting with the officer was "awaiting your review". The
 * list route resolves the active step and sends its role down as
 * `currentStageRole`; requests from before that field existed fall back to the
 * old behaviour rather than vanishing from the queue.
 */
function isOwnStage(expense: any, role: string | undefined): boolean {
  if (expense.status !== RequestStatus.PENDING_APPROVAL) return true;
  if (!expense.currentStageRole) return true;
  return expense.currentStageRole === role;
}

function buildOwnRequestNotifications(expenses: any[], userId: string): AppNotification[] {
  const results: AppNotification[] = [];

  for (const expense of expenses) {
    if (idOf(expense.initiatorId) !== userId) continue;

    const history: any[] = Array.isArray(expense.history) ? expense.history : [];

    history.forEach((entry, index) => {
      // Never notify a user about their own action.
      if (idOf(entry.actorId) === userId) return;

      const type = notificationTypeFor(entry.statusAfter);
      if (!type) return;

      // The trailing half of a paired transition is the same event as the row
      // before it, which already produced a notification.
      if (collapsesInto(entry.statusAfter, history[index - 1]?.statusAfter)) return;

      const requestNumber = expense.requestNumber || "Request";

      results.push({
        id: `${idOf(expense._id)}:${index}`,
        type,
        title: titleFor(type, requestNumber),
        message: messageFor(type, expense, entry),
        timestamp: new Date(entry.timestamp || expense.updatedAt || Date.now()).toISOString(),
        requestId: idOf(expense._id),
        meta: {
          requestNumber,
          category: expense.category,
          amount: expense.amount,
          description: expense.description,
          status: expense.status,
          auditor: entry.actorName,
          auditorRole: entry.actorRole,
          action: entry.action,
          comment: entry.comment,
          vendorName: expense.vendorName,
          bankName: expense.vendorBankDetails?.bankName,
          accountNumber: expense.vendorBankDetails?.accountNumber,
          accountName: expense.vendorBankDetails?.accountName,
          reference: expense.paymentReference,
          receipt: expense.paymentReceipt,
          attachments: expense.attachments?.length
            ? expense.attachments.map((a: any) => ({ name: a.name, url: a.url }))
            : [],
        },
      });
    });
  }

  return results;
}

function buildReviewQueueNotifications(
  expenses: any[],
  userId: string,
  role: string | undefined
): AppNotification[] {
  const pendingStatuses = pendingStatusesForRole(role);
  if (pendingStatuses.length === 0) return [];

  return expenses
    .filter(
      (expense) =>
        pendingStatuses.includes(expense.status) &&
        isOwnStage(expense, role) &&
        idOf(expense.initiatorId) !== userId &&
        // Nothing for the Finance Head to act on while a request is held for a
        // missing budget period — telling them it "is waiting on your action"
        // would send them to a decision they cannot make.
        !expense.awaitingBudgetPeriod
    )
    .map((expense) => {
      const requestNumber = expense.requestNumber || "Request";
      const initiatorName = expense.initiatorId?.name || "an initiator";

      return {
        id: `${idOf(expense._id)}:pending:${expense.status}`,
        type: "ACTION_REQUIRED" as NotificationType,
        title: `Awaiting Your Review: ${requestNumber}`,
        message: `${initiatorName} submitted a ${expense.category || "expense"} request for ${money(expense.amount)}. It is waiting on your action.`,
        timestamp: new Date(expense.updatedAt || expense.createdAt || Date.now()).toISOString(),
        requestId: idOf(expense._id),
        meta: {
          requestNumber,
          category: expense.category,
          amount: expense.amount,
          description: expense.description,
          status: expense.status,
          initiatorName,
        },
      };
    });
}

/**
 * Tells a reviewer that a request they handled has been paid and closed.
 *
 * Everything else in this feed is queue-derived, so a reviewer's notification
 * disappeared the moment the request left their stage: the approver and Finance
 * Officer who cleared a request — and, on the over-budget path, the Finance
 * Head who funded it — never learned whether it was ultimately paid. This is
 * the completion half of their feed, keyed off the closing history row so it
 * appears exactly once and carries the payment facts with it.
 */
function buildCompletionNotifications(expenses: any[], userId: string): AppNotification[] {
  const results: AppNotification[] = [];

  for (const expense of expenses) {
    if (!isCompletionStatus(expense.status)) continue;
    // The initiator's own feed already reports this; it is built from every
    // transition rather than just the last one.
    if (idOf(expense.initiatorId) === userId) continue;

    const history: any[] = Array.isArray(expense.history) ? expense.history : [];

    // Did this user actually handle the request? A finance role can see closed
    // requests they had no part in, and those are not their news. System rows
    // do not count: they carry the acting user's id but nobody decided them.
    const acted = history.some(
      (entry) => idOf(entry.actorId) === userId && !isSystemEntry(entry)
    );
    if (!acted) continue;

    // Anchored on the closing row so the card carries the release timestamp
    // rather than whenever the reader's own approval happened.
    const closing = [...history].reverse().find((entry) => isCompletionStatus(entry.statusAfter));

    // The Finance Manager who released the payment does not need telling that
    // they released it — same rule the initiator's own feed follows.
    const released = history.find((entry) => entry.statusAfter === RequestStatus.PAID);
    if (idOf(released?.actorId) === userId) continue;

    const requestNumber = expense.requestNumber || "Request";

    results.push({
      id: `${idOf(expense._id)}:completed`,
      type: "PAID",
      title: `Payment Completed: ${requestNumber}`,
      message:
        `The ${expense.category || "expense"} request for ${money(expense.amount)} you reviewed has been paid and closed.` +
        (expense.paymentReference ? ` Bank Ref: ${expense.paymentReference}` : ""),
      timestamp: new Date(
        closing?.timestamp || expense.paymentDate || expense.updatedAt || Date.now()
      ).toISOString(),
      requestId: idOf(expense._id),
      meta: {
        requestNumber,
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
        status: expense.status,
        auditor: closing?.actorName,
        auditorRole: closing?.actorRole,
        reference: expense.paymentReference,
        receipt: expense.paymentReceipt,
      },
    });
  }

  return results;
}

/**
 * Derives the notification feed from real expense workflow history.
 * Initiators are told what happened to their own requests; reviewers are told
 * what is currently sitting in their queue, and what became of the requests they
 * have already handled.
 */
export function buildNotifications(
  expenses: any[],
  currentUser: any,
  limit = 25
): AppNotification[] {
  if (!Array.isArray(expenses) || !currentUser) return [];

  const userId = idOf(currentUser.id ?? currentUser._id);
  if (!userId) return [];

  return [
    ...buildOwnRequestNotifications(expenses, userId),
    ...buildReviewQueueNotifications(expenses, userId, currentUser.role),
    ...buildCompletionNotifications(expenses, userId),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
