import { EmailDispatchResult, IEmailService } from "./email-service.interface";
import {
  getInviteEmailHtml,
  getInviteEmailText,
  getResetCodeEmailHtml,
  getResetCodeEmailText,
  getExpenseNotificationText,
  compileTemplate,
} from "./templates";
import { ENV } from "../../config/env";
import { BRANDING } from "../../config/branding";

export class BrevoEmailService implements IEmailService {
  private apiKey: string;
  private senderEmail: string;
  private senderName: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.senderEmail = ENV.BREVO_SENDER_EMAIL;
    // Deployments may override the "from" name; otherwise it is the product name.
    this.senderName = ENV.BREVO_SENDER_NAME || BRANDING.appName;
  }

  /**
   * Pulls the human-readable reason out of a Brevo error body.
   *
   * Brevo replies with `{ code, message }`; the raw JSON is noise to an admin,
   * and the `message` is the part that names the fix ("Validate your sender or
   * authenticate your domain").
   */
  private static describeFailure(status: number, body: string): string {
    try {
      const parsed = JSON.parse(body);
      if (parsed?.message) return String(parsed.message);
    } catch {
      // Non-JSON body (gateway HTML, empty response) — fall through.
    }
    return body?.trim() ? `Email provider returned ${status}: ${body.slice(0, 300)}` : `Email provider returned ${status}.`;
  }

  private async sendSmtpEmail(
    toEmail: string,
    toName: string,
    subject: string,
    htmlContent: string,
    textContent?: string
  ): Promise<EmailDispatchResult> {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: this.senderName,
            email: this.senderEmail,
          },
          to: [
            {
              email: toEmail,
              name: toName,
            },
          ],
          replyTo: {
            email: this.senderEmail,
            name: this.senderName,
          },
          subject,
          htmlContent,
          ...(textContent ? { textContent } : {}),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[BrevoEmailService] Error sending email (${response.status}):`, errorText);
        return { sent: false, error: BrevoEmailService.describeFailure(response.status, errorText) };
      }

      console.log(`[BrevoEmailService] Email sent successfully to ${toEmail}`);
      return { sent: true };
    } catch (error) {
      console.error("[BrevoEmailService] Exception during Brevo API fetch:", error);
      // Network-level failure: the provider was never reached, so there is no
      // provider message to quote.
      return {
        sent: false,
        error: `Could not reach the email provider: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  public async sendInviteEmail(
    to: string,
    recipientName: string,
    roleName: string,
    inviteUrl: string,
    origin?: string
  ): Promise<EmailDispatchResult> {
    const htmlContent = getInviteEmailHtml(inviteUrl, roleName, recipientName, origin);
    const textContent = getInviteEmailText(inviteUrl, roleName, recipientName);
    const subject = `Invitation to join ${BRANDING.appName} as ${roleName}`;
    return this.sendSmtpEmail(to, recipientName, subject, htmlContent, textContent);
  }

  public async sendPasswordResetEmail(
    to: string,
    recipientName: string,
    code: string,
    origin?: string
  ): Promise<EmailDispatchResult> {
    const htmlContent = getResetCodeEmailHtml(code, recipientName, origin);
    const textContent = getResetCodeEmailText(code, recipientName);
    const subject = `Your Password Reset Code - ${BRANDING.appName}`;
    return this.sendSmtpEmail(to, recipientName, subject, htmlContent, textContent);
  }

  public async sendExpenseNotification(
    to: string,
    recipientName: string,
    requestNumber: string,
    status: string,
    actionUrl?: string,
    origin?: string
  ): Promise<EmailDispatchResult> {
    const bodyText = `
      <h2 style="font-family: sans-serif; font-size: 20px; color: #0F172A;">Expense Request Update</h2>
      <p style="font-family: sans-serif; font-size: 15px; color: #475569;">Hello ${recipientName},</p>
      <p style="font-family: sans-serif; font-size: 15px; color: #475569;">
        Your expense request <strong>#${requestNumber}</strong> has been updated to status: 
        <span style="font-weight: 600; color: #0A52D6;">${status}</span>.
      </p>
      ${
        actionUrl
          ? `<p><a href="${actionUrl}" style="display: inline-block; background-color: #0A52D6; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">View Request Details</a></p>`
          : ""
      }
    `;
    const htmlContent = compileTemplate(bodyText, {
      title: `Expense #${requestNumber} Update`,
      origin,
    });
    const textContent = getExpenseNotificationText(requestNumber, status, recipientName, actionUrl);
    const subject = `Expense Request #${requestNumber} Status: ${status}`;
    return this.sendSmtpEmail(to, recipientName, subject, htmlContent, textContent);
  }
}
