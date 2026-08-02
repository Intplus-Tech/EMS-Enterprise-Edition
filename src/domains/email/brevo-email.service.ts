import { IEmailService } from "./email-service.interface";
import { getInviteEmailHtml, getResetCodeEmailHtml, compileTemplate } from "./templates";
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

  private async sendSmtpEmail(
    toEmail: string,
    toName: string,
    subject: string,
    htmlContent: string
  ): Promise<boolean> {
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
          subject,
          htmlContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[BrevoEmailService] Error sending email (${response.status}):`, errorText);
        return false;
      }

      console.log(`[BrevoEmailService] Email sent successfully to ${toEmail}`);
      return true;
    } catch (error) {
      console.error("[BrevoEmailService] Exception during Brevo API fetch:", error);
      return false;
    }
  }

  public async sendInviteEmail(
    to: string,
    recipientName: string,
    roleName: string,
    inviteUrl: string,
    origin?: string
  ): Promise<boolean> {
    const htmlContent = getInviteEmailHtml(inviteUrl, roleName, recipientName, origin);
    const subject = `Invitation to join ${BRANDING.appName} as ${roleName}`;
    return this.sendSmtpEmail(to, recipientName, subject, htmlContent);
  }

  public async sendPasswordResetEmail(
    to: string,
    recipientName: string,
    code: string,
    origin?: string
  ): Promise<boolean> {
    const htmlContent = getResetCodeEmailHtml(code, recipientName, origin);
    const subject = `Your Password Reset Code - ${BRANDING.appName}`;
    return this.sendSmtpEmail(to, recipientName, subject, htmlContent);
  }

  public async sendExpenseNotification(
    to: string,
    recipientName: string,
    requestNumber: string,
    status: string,
    actionUrl?: string,
    origin?: string
  ): Promise<boolean> {
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
    const subject = `Expense Request #${requestNumber} Status: ${status}`;
    return this.sendSmtpEmail(to, recipientName, subject, htmlContent);
  }
}
