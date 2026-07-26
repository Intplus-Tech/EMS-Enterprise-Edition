import { IEmailService } from "./email-service.interface";
import { BrevoEmailService } from "./brevo-email.service";
import { ConsoleEmailService } from "./console-email.service";
import { ENV } from "../../config/env";

/**
 * Factory and singleton instance exporter for EmailService
 * Adheres to Dependency Inversion and Open/Closed principles.
 */
function createEmailService(): IEmailService {
  if (ENV.isBrevoConfigured) {
    console.log("[EmailService] Initializing BrevoEmailService provider.");
    return new BrevoEmailService(ENV.BREVO_API_KEY);
  }

  console.log("[EmailService] BREVO_API_KEY not configured. Falling back to ConsoleEmailService.");
  return new ConsoleEmailService();
}

export const EmailService: IEmailService = createEmailService();
