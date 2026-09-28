import { EmailDispatchResult, IEmailService } from "./email-service.interface";

/**
 * Development fallback used when no BREVO_API_KEY is configured.
 *
 * Every send "succeeds" because nothing left the machine — callers that report
 * delivery to the user should make clear this is a local-only provider.
 */
export class ConsoleEmailService implements IEmailService {
  public async sendInviteEmail(
    to: string,
    recipientName: string,
    roleName: string,
    inviteUrl: string,
    _origin?: string
  ): Promise<EmailDispatchResult> {
    console.log("\n=======================================================");
    console.log(`[ConsoleEmailService] INVITATION EMAIL TO: ${to} (${recipientName})`);
    console.log(`Role: ${roleName} | Link: ${inviteUrl}`);
    console.log("=======================================================\n");
    return { sent: true, simulated: true };
  }

  public async sendPasswordResetEmail(
    to: string,
    recipientName: string,
    code: string,
    _origin?: string
  ): Promise<EmailDispatchResult> {
    console.log("\n=======================================================");
    console.log(`[ConsoleEmailService] PASSWORD RESET CODE TO: ${to} (${recipientName})`);
    console.log(`Verification Code: ${code}`);
    console.log("=======================================================\n");
    return { sent: true, simulated: true };
  }

  public async sendExpenseNotification(
    to: string,
    recipientName: string,
    requestNumber: string,
    status: string,
    actionUrl?: string,
    _origin?: string
  ): Promise<EmailDispatchResult> {
    console.log("\n=======================================================");
    console.log(`[ConsoleEmailService] EXPENSE NOTIFICATION TO: ${to} (${recipientName})`);
    console.log(`Request #${requestNumber} | Status: ${status} | Action: ${actionUrl || "N/A"}`);
    console.log("=======================================================\n");
    return { sent: true, simulated: true };
  }
}
