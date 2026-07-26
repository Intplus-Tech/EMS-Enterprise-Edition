import { IEmailService } from "./email-service.interface";

export class ConsoleEmailService implements IEmailService {
  public async sendInviteEmail(
    to: string,
    recipientName: string,
    roleName: string,
    inviteUrl: string,
    _origin?: string
  ): Promise<boolean> {
    console.log("\n=======================================================");
    console.log(`[ConsoleEmailService] INVITATION EMAIL TO: ${to} (${recipientName})`);
    console.log(`Role: ${roleName} | Link: ${inviteUrl}`);
    console.log("=======================================================\n");
    return true;
  }

  public async sendPasswordResetEmail(
    to: string,
    recipientName: string,
    code: string,
    _origin?: string
  ): Promise<boolean> {
    console.log("\n=======================================================");
    console.log(`[ConsoleEmailService] PASSWORD RESET CODE TO: ${to} (${recipientName})`);
    console.log(`Verification Code: ${code}`);
    console.log("=======================================================\n");
    return true;
  }

  public async sendExpenseNotification(
    to: string,
    recipientName: string,
    requestNumber: string,
    status: string,
    actionUrl?: string,
    _origin?: string
  ): Promise<boolean> {
    console.log("\n=======================================================");
    console.log(`[ConsoleEmailService] EXPENSE NOTIFICATION TO: ${to} (${recipientName})`);
    console.log(`Request #${requestNumber} | Status: ${status} | Action: ${actionUrl || "N/A"}`);
    console.log("=======================================================\n");
    return true;
  }
}
