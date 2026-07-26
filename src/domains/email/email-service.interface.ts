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
  ): Promise<boolean>;

  /**
   * Sends a 6-digit password reset verification code email.
   */
  sendPasswordResetEmail(
    to: string,
    recipientName: string,
    code: string,
    origin?: string
  ): Promise<boolean>;

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
  ): Promise<boolean>;
}
