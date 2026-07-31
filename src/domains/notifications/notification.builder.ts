/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestStatus } from "../../enums/statuses";
import { SystemRole } from "../../enums/roles";

export type NotificationType =
  | "RETURNED"
  | "REJECTED"
  | "APPROVED"
  | "PAID"
  | "ACTION_REQUIRED";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  requestId: string;
  meta: Record<string, any>;
}

const NAIRA = "\u20A6";

function money(amount: number | undefined): string {
  return `${NAIRA}${Number(amount || 0).toLocaleString()}`;
}

function idOf(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id ?? value.id ?? value);
}

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

/**
 * Maps a workflow transition onto the notification category shown to the initiator.
 * Returns null for transitions that are not worth surfacing.
 */
function typeForTransition(statusAfter: string): NotificationType | null {
  switch (statusAfter) {
    case RequestStatus.RETURNED:
      return "RETURNED";
    case RequestStatus.REJECTED:
      return "REJECTED";
    case RequestStatus.PAID:
      return "PAID";
    case RequestStatus.PENDING_APPROVAL:
    case RequestStatus.SENT_TO_FINANCE:
      return "APPROVED";
    default:
      return null;
  }
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
    default:
      return `Awaiting Your Review: ${requestNumber}`;
  }
}

function messageFor(type: NotificationType, expense: any, entry: any): string {
  const category = expense.category || "expense";
  const amount = money(expense.amount);
  const actor = entry?.actorName || "an approver";

  switch (type) {
    case "RETURNED":
      return `Your ${category} request for ${amount} was returned by ${actor}.` +
        (entry?.comment ? ` Reason: ${entry.comment}` : "");
    case "REJECTED":
      return `Your ${category} request for ${amount} was rejected by ${actor}.` +
        (entry?.comment ? ` Reason: ${entry.comment}` : "");
    case "PAID":
      return `Your ${category} request for ${amount} has been paid.` +
        (expense.paymentReference ? ` Bank Ref: ${expense.paymentReference}` : "");
    case "APPROVED":
      return `Your ${category} request for ${amount} was approved by ${actor}.` +
        (entry?.statusAfter === RequestStatus.SENT_TO_FINANCE
          ? " Moving to Finance for payment."
          : "");
    default:
      return "";
  }
}

/**
 * Statuses that represent work sitting in a given reviewer role's queue.
 */
function pendingStatusForRole(role: string | undefined): string | null {
  switch (role) {
    case SystemRole.FINANCE_HEAD:
      return RequestStatus.PENDING_EXCEPTIONAL;
    case SystemRole.APPROVER:
      return RequestStatus.PENDING_APPROVAL;
    case SystemRole.FINANCE_OFFICER:
      return RequestStatus.SENT_TO_FINANCE;
    case SystemRole.FINANCE_MANAGER:
      return RequestStatus.UPLOADED_TO_BANK;
    default:
      return null;
  }
}

function buildOwnRequestNotifications(expenses: any[], userId: string): AppNotification[] {
  const results: AppNotification[] = [];

  for (const expense of expenses) {
    if (idOf(expense.initiatorId) !== userId) continue;

    const history: any[] = Array.isArray(expense.history) ? expense.history : [];

    history.forEach((entry, index) => {
      // Never notify a user about their own action.
      if (idOf(entry.actorId) === userId) return;

      const type = typeForTransition(entry.statusAfter);
      if (!type) return;

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
  const pendingStatus = pendingStatusForRole(role);
  if (!pendingStatus) return [];

  return expenses
    .filter((expense) => expense.status === pendingStatus && idOf(expense.initiatorId) !== userId)
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
 * Derives the notification feed from real expense workflow history.
 * Initiators are told what happened to their own requests; reviewers are told
 * what is currently sitting in their queue.
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
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
