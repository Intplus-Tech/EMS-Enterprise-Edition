/**
 * Single Source of Truth for Application Branding and Theme Configuration
 * Changing this file updates the App Name, Logo Icon, and Theme colors globally.
 */

import { ENV } from "./env";

export const BRANDING = {
  /**
   * Short for "Expense Management System". The only place the product name is
   * written down — every surface (sidebar, auth pages, email subjects and
   * footers, dialog titles) reads it from here. Do not re-type it inline.
   */
  appName: "EMS",
  logoIcon: "Wallet", // This corresponds to the Lucide icon name we will render dynamically
  logoUrl: ENV.NEXT_PUBLIC_APP_LOGO_URL, // Configurable from ENV source of truth
  tagline: "Enterprise Edition",
  theme: {
    // Brand accent is the blue every design uses for primary actions, active
    // navigation and chart highlights. It was previously indigo here while the
    // components hardcoded #2563EB inline, so the token and the product
    // disagreed; they are now the same colour.
    primary: "37 99 235",      // RGB for #2563EB (Blue 600)
    primaryHover: "29 78 216", // RGB for #1d4ed8 (Blue 700)
    primarySoft: "147 197 253",// RGB for #93c5fd (Blue 300) — accent on dark surfaces
    secondary: "16 185 129",    // RGB for #10b981 (Emerald 500)
    secondaryHover: "5 150 105",// RGB for #059669 (Emerald 600)
    accent: "245 158 11",       // RGB for #f59e0b (Amber 500)
    danger: "239 68 68",        // RGB for #ef4444 (Red 500)
    dangerHover: "220 38 38",   // RGB for #dc2626 (Red 600)
    warning: "234 179 8",       // RGB for #eab308 (Yellow 500)
    info: "59 130 246",         // RGB for #3b82f6 (Blue 500)
    
    // Background and Surface (Dark Glassmorphism Theme)
    background: "15 23 42",     // RGB for #0f172a (Slate 900)
    surface: "30 41 59",        // RGB for #1e293b (Slate 800)
    surfaceSecondary: "15 23 42", // RGB for #0f172a (Slate 900)
    card: "30 41 59",           // RGB for #1e293b (Slate 800)
    cardBorder: "51 65 85",     // RGB for #334155 (Slate 700)
    
    // Text colors
    text: "248 250 252",        // RGB for #f8fafc (Slate 50)
    textMuted: "148 163 184",   // RGB for #94a3b8 (Slate 400)
    textDim: "100 116 139",     // RGB for #64748b (Slate 500)
  }
};
