/**
 * Single Source of Truth for Environment Variables across the application.
 * All process.env access must be performed exclusively through this file.
 */
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  
  // Database Configuration
  MONGODB_URI:
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/expense_manager",

  // JWT Authentication Configuration
  JWT_SECRET:
    process.env.JWT_SECRET ||
    "spendflow-secure-jwt-secret-key-12345",

  // Application Branding & Public Assets
  NEXT_PUBLIC_APP_LOGO_URL: process.env.NEXT_PUBLIC_APP_LOGO_URL || "/logo.svg",

  // Brevo Transactional Email Integration
  BREVO_API_KEY: process.env.BREVO_API_KEY || "",
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || "noreply@spendflow.com",
  // Empty by default: the email service falls back to BRANDING.appName, so the
  // product name is not spelled out a second time here.
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || "",
  get isBrevoConfigured(): boolean {
    return !!(this.BREVO_API_KEY && this.BREVO_API_KEY.trim().length > 0);
  },

  // Cloudinary Media Upload Integration
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
  CLOUDINARY_UPLOAD_FOLDER: process.env.CLOUDINARY_UPLOAD_FOLDER || "ems",
  get isCloudinaryConfigured(): boolean {
    return !!(
      this.CLOUDINARY_CLOUD_NAME &&
      this.CLOUDINARY_API_KEY &&
      this.CLOUDINARY_API_SECRET
    );
  },
} as const;

export type EnvironmentConfig = typeof ENV;
