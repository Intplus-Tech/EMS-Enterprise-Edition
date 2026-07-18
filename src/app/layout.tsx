import type { Metadata } from "next";
import { BRANDING } from "../config/branding";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRANDING.appName} - ${BRANDING.tagline}`,
  description: "Next-gen corporate expense and budget approval workflow system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inject branding theme variables from our single source of truth branding configuration
  const cssVariables = `
    :root {
      --color-primary: ${BRANDING.theme.primary};
      --color-primary-hover: ${BRANDING.theme.primaryHover};
      --color-secondary: ${BRANDING.theme.secondary};
      --color-secondary-hover: ${BRANDING.theme.secondaryHover};
      --color-accent: ${BRANDING.theme.accent};
      --color-danger: ${BRANDING.theme.danger};
      --color-danger-hover: ${BRANDING.theme.dangerHover};
      --color-warning: ${BRANDING.theme.warning};
      --color-info: ${BRANDING.theme.info};
      --color-background: ${BRANDING.theme.background};
      --color-surface: ${BRANDING.theme.surface};
      --color-surface-secondary: ${BRANDING.theme.surfaceSecondary};
      --color-card: ${BRANDING.theme.card};
      --color-card-border: ${BRANDING.theme.cardBorder};
      --color-text: ${BRANDING.theme.text};
      --color-text-muted: ${BRANDING.theme.textMuted};
      --color-text-dim: ${BRANDING.theme.textDim};
    }
  `;

  return (
    <html lang="en" className="h-full">
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssVariables }} />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var savedTheme = localStorage.getItem('theme');
              if (savedTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
              } else {
                document.documentElement.setAttribute('data-theme', 'dark');
              }
            } catch (e) {}
          })();
        ` }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
