/**
 * Single Source of Truth for Application Branding and Theme Configuration
 * Changing this file updates the App Name, Logo Icon, and Theme colors globally.
 */

export const BRANDING = {
  appName: "SpendFlow",
  logoIcon: "Wallet", // This corresponds to the Lucide icon name we will render dynamically
  logoUrl: process.env.NEXT_PUBLIC_APP_LOGO_URL || "", // Configurable from .env
  tagline: "Dynamic Expense & Budget Management",
  theme: {
    // Standard Dark Mode palette with Indigo/Purple highlights
    primary: "99 102 241",      // RGB for #6366f1 (Indigo 500)
    primaryHover: "79 70 229", // RGB for #4f46e5 (Indigo 600)
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
