import { IEmailService } from "./email-service.interface";
import { BrevoEmailService } from "./brevo-email.service";
import { ConsoleEmailService } from "./console-email.service";

/**
 * Factory and singleton instance exporter for EmailService
 * Adheres to Dependency Inversion and Open/Closed principles.
 */
function createEmailService(): IEmailService {
  const brevoApiKey = process.env.BREVO_API_KEY;

  if (brevoApiKey && brevoApiKey.trim().length > 0) {
    console.log("[EmailService] Initializing BrevoEmailService provider.");
    return new BrevoEmailService(brevoApiKey);
  }

  console.log("[EmailService] BREVO_API_KEY not configured. Falling back to ConsoleEmailService.");
  return new ConsoleEmailService();
}

export const EmailService: IEmailService = createEmailService();
