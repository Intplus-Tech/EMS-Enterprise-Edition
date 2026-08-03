/**
 * Outcome of a single send attempt.
 *
 * Replaces the bare `boolean` these methods used to return. A false came back
 * indistinguishable from "the provider refused this message and told us why",
 * so callers had nothing to show the user and the reason only ever reached the
 * server console — an invite could be rejected by the provider while the admin
 * screen reported "Invitation sent".
 */
export interface EmailDispatchResult {
  sent: boolean;
  /**
   * Provider-reported reason when `sent` is false. Written for an administrator
   * to act on (e.g. "the sender you used … is not valid"), so it is safe to
   * surface in the UI. Never contains credentials — only the provider's message.
   */
  error?: string;
  /**
   * True when no real provider handled the message (the console fallback used
   * in local development). `sent` is still true — the service did all it can —
   * but nothing left the machine, and the UI must say so rather than claim a
   * delivery that did not happen.
   */
  simulated?: boolean;
}

export interface IEmailService {
  /**
   * Sends an invitation email to a newly created/invited user.
   */
  sendInviteEmail(
    to: string,
    recipientName: string,
    roleName: string,
    inviteUrl: string,
    origin?: string
  ): Promise<EmailDispatchResult>;

  /**
   * Sends a 6-digit password reset verification code email.
   */
  sendPasswordResetEmail(
    to: string,
    recipientName: string,
    code: string,
    origin?: string
  ): Promise<EmailDispatchResult>;

  /**
   * Sends generic expense status update or approval notification.
   */
  sendExpenseNotification(
    to: string,
    recipientName: string,
    requestNumber: string,
    status: string,
    actionUrl?: string,
    origin?: string
  ): Promise<EmailDispatchResult>;
}
