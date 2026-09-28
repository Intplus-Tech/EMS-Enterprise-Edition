/**
 * Session policy shared by the API guard, the browser clients and the sign-in
 * screen: one active session per account, and the copy that explains it when a
 * session is taken away.
 *
 * The strings live here rather than at each site because three layers have to
 * agree on them — the middleware raises the error, `http.ts` recognises the
 * 401 it produces, and the login page renders the reason. Pure constants only,
 * so both the server and the client bundle can import this.
 */

/**
 * Marker carried in the middleware's error message.
 *
 * `withErrorHandling` maps any message containing "Unauthorized" to a 401, so
 * the prefix is load-bearing and must not be reworded away.
 */
export const SINGLE_SESSION_ERROR =
  "Unauthorized: This account was signed in on another device. " +
  "Only one active session is allowed at a time.";

/** Raised when an admin's "Force Log Out" (or a suspension) killed the session. */
export const SESSION_REVOKED_ERROR =
  "Unauthorized: This session has been ended. Please sign in again.";

/** Query parameter the dashboard appends when it bounces a dead session. */
export const SESSION_REASON_PARAM = "reason";

/** Why a session ended, as the login page receives it. */
export type SessionEndReason = "displaced" | "expired";

/**
 * Login-screen copy per reason. Keyed by code rather than passing the server's
 * sentence through the URL, so nothing arbitrary can be rendered as a notice.
 */
export const SESSION_END_NOTICES: Record<SessionEndReason, string> = {
  displaced:
    "You were signed out because this account was signed in on another device. " +
    "Only one active session is allowed at a time.",
  expired: "Your session has ended. Please sign in again.",
};

/** Narrows an untrusted query value to a reason we have copy for. */
export function sessionEndNotice(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return SESSION_END_NOTICES[reason as SessionEndReason] ?? null;
}

/**
 * The reason code for a 401 the server raised, or null when there is nothing
 * to explain.
 *
 * Only a session that was *taken away* earns a notice. A caller who simply had
 * no cookie was never signed in, and telling them their session ended would be
 * a lie shown on every first visit to the app.
 */
export function sessionEndReasonFor(message: string): SessionEndReason | null {
  if (message === SINGLE_SESSION_ERROR) return "displaced";
  if (message === SESSION_REVOKED_ERROR) return "expired";
  return null;
}
