/**
 * Identity comparison for Mongo references that reach the client in two shapes.
 *
 * A field like `initiatorId` arrives either as a raw id string or as a populated
 * document (`{ _id, name, … }`), and the signed-in user arrives from
 * `/api/auth/me` as `{ id }` — never `_id`. Four screens compared
 * `expense.initiatorId?._id === currentUser?._id`, which is `string ===
 * undefined` for every row: the Initiator's History screen and the approver's
 * "My Drafts" / "My Active Requests" lists were permanently empty, and the
 * dashboard's "My Draft" / "Awaiting Update" tiles permanently read 0.
 *
 * Pure functions only — no React, no I/O.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Author recorded on the history rows the flow writes for itself — a budget
 * flag, an automatic routing, the closure that follows a payment release.
 *
 * These rows carry the *acting* user's id (there is no system account to point
 * at), so an id match alone cannot tell "this person did it" from "this
 * happened while this person was acting". Readers that care about the
 * difference — notably who to credit with a decision — check the name.
 */
export const SYSTEM_ACTOR_NAME = "System Engine";

/** True when a history row was written by the flow rather than by a person. */
export function isSystemEntry(entry?: { actorName?: string } | null): boolean {
  return entry?.actorName === SYSTEM_ACTOR_NAME;
}

/** Normalises a reference (string, ObjectId, or populated doc) to its id string. */
export function idOf(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id ?? value.id ?? value);
}

/** True when two references point at the same record, whatever shape they took. */
export function sameId(a: any, b: any): boolean {
  const left = idOf(a);
  // An empty id must never match another empty id, or every unset reference
  // would read as "mine".
  return left !== "" && left === idOf(b);
}

/** The signed-in user's id, tolerating either session shape. */
export function currentUserId(user: any): string {
  return idOf(user?.id ?? user?._id);
}

/** True when `expense` was raised by `user`. */
export function isOwnRequest(expense: any, user: any): boolean {
  return sameId(expense?.initiatorId, currentUserId(user));
}
