import { BRANDING } from "../../config/branding";

interface BaseLayoutOptions {
  title: string;
  origin?: string;
}

/**
 * Decoupled Header
 * Generates the top of the email template card with the banner image and overlapping app logo.
 */
export function getEmailHeader(options: BaseLayoutOptions): string {
  const origin = options.origin || "http://localhost:3000";
  let appLogoUrl = BRANDING.logoUrl || "/logo.svg";
  if (appLogoUrl.startsWith("/")) {
    appLogoUrl = `${origin}${appLogoUrl}`;
  }
  
  let bannerUrl = "/email_banner.png";
  if (bannerUrl.startsWith("/")) {
    bannerUrl = `${origin}${bannerUrl}`;
  }
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    /* Reset and normalization styles */
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      height: 100% !important;
      background-color: #F8FAFC;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
      border-spacing: 0;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
    }
    /* Typography and layout classes */
    .font-sans {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    @media only screen and (max-width: 600px) {
      .content-cell {
        padding: 24px 20px !important;
      }
      .footer-cell {
        padding: 24px 20px !important;
      }
    }
  </style>
</head>
<body class="font-sans" style="margin: 0; padding: 0; background-color: #F8FAFC; width: 100%;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; width: 100%;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <!-- Email Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Banner Image Section -->
          <tr>
            <td style="line-height: 0; position: relative;">
              <img src="${bannerUrl}" alt="Branding Banner" style="width: 100%; max-width: 600px; height: auto; display: block; border-top-left-radius: 16px; border-top-right-radius: 16px;" />
            </td>
          </tr>
          
          <!-- Overlapping Circular Logo Badge -->
          <tr>
            <td align="center" style="height: 0; line-height: 0;">
              <div style="margin-top: -30px; display: inline-block;">
                <table border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" style="width: 60px; height: 60px; background-color: #FFFFFF; border-radius: 50%; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); vertical-align: middle; text-align: center;">
                      <img src="${appLogoUrl}" alt="App Logo" style="width: 36px; height: 36px; border-radius: 50%; display: block; margin: 12px auto; object-fit: contain;" />
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Email Content Body -->
          <tr>
            <td class="content-cell" style="padding: 32px 48px 24px 48px;">
  `;
}

/**
 * Decoupled Footer
 * Generates the light blue-gray bottom section containing utility links, assistance note, and copyright.
 */
export function getEmailFooter(): string {
  return `
            </td>
          </tr>
          
          <!-- Footer section -->
          <tr>
            <td class="footer-cell" style="background-color: #F1F5F9; padding: 32px 48px; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; text-align: center; border-top: 1px solid #E2E8F0;">
              <!-- Utility Icon Links -->
              <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto 20px auto;">
                <tr>
                  <td style="padding: 0 12px;">
                    <a href="https://spendflow.com" target="_blank" style="text-decoration: none; color: #64748B;">
                      <span style="font-size: 20px; vertical-align: middle;">🌐</span>
                    </a>
                  </td>
                  <td style="padding: 0 12px;">
                    <a href="https://spendflow.com/support" target="_blank" style="text-decoration: none; color: #64748B;">
                      <span style="font-size: 20px; vertical-align: middle;">❓</span>
                    </a>
                  </td>
                  <td style="padding: 0 12px;">
                    <a href="https://spendflow.com/docs" target="_blank" style="text-decoration: none; color: #64748B;">
                      <span style="font-size: 20px; vertical-align: middle;">📄</span>
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Help text -->
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #64748B; line-height: 1.5; margin: 0 0 16px 0; text-align: center;">
                If you did not expect this invitation, please contact your IT department or reply to this email for assistance.
              </p>
              
              <!-- Copyright -->
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #94A3B8; margin: 0; text-align: center;">
                &copy; 2026 EMS. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Combines header, body content, and footer into a complete HTML email.
 */
export function compileTemplate(content: string, options: BaseLayoutOptions): string {
  return `${getEmailHeader(options)}${content}${getEmailFooter()}`;
}

/**
 * Invitation specific email template.
 */
export function getInviteEmailHtml(inviteUrl: string, roleName: string, recipientName: string = "User", origin?: string): string {
  const content = `
    <h2 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 24px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0; text-align: left;">You're invited to join</h2>
    
    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0; text-align: left;">
      Hello ${recipientName},
    </p>
    
    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0; text-align: left;">
      You have been invited to join the Expense Management System as a <span style="font-weight: 600; color: #0F172A;">${roleName}</span>.
    </p>
    
    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0; text-align: left;">
      EMS provides your team with high-density, low-friction tools to manage complex financial data, streamline approvals, and ensure institutional trust across all departments.
    </p>
    
    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 28px 0; text-align: left;">
      Click the button below to set up your account and get started.
    </p>
    
    <!-- Button container -->
    <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 24px auto 16px auto; width: 100%;">
      <tr>
        <td align="center">
          <a href="${inviteUrl}" target="_blank" style="display: inline-block; background-color: #0A52D6; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 8px; text-align: center; border: 1px solid #0848BE; letter-spacing: 0.2px;">
            Accept Invitation &nbsp;&rarr;
          </a>
        </td>
      </tr>
    </table>
    
    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #64748B; text-align: center; margin: 16px 0 0 0;">
      This link will expire in 48 hours.
    </p>
  `;

  return compileTemplate(content, { title: "Invitation to join EMS", origin });
}
