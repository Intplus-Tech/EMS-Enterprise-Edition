"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { BRANDING } from "../../config/branding";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // State
  const [email, setEmail] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoCode, setDemoCode] = useState("");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDemoCode("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.success) {
        setDemoCode(data.code);
        // Navigate to verification page with email as query parameter
        setTimeout(() => {
          router.push(`/verify-code?email=${encodeURIComponent(email)}&demo=${data.code}`);
        }, 1500);
      } else {
        setError(data.error || "Failed to process forgot password request.");
      }
    } catch (e) {
      setError("An error occurred. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#F8FAFC", color: "#0F172A", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <header style={{ 
        padding: "1.25rem 2.5rem", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        background: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0"
      }}>
        {/* Brand logo & text */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ 
            padding: "0.4rem", 
            borderRadius: "50%", 
            background: "rgba(10, 82, 214, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <img src={BRANDING.logoUrl || "/logo.svg"} alt="EMS Logo" style={{ width: 26, height: 26, objectFit: "contain", borderRadius: "50%" }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ fontWeight: "700", fontSize: "1rem", color: "#0F172A" }}>EMS</span>
              <span style={{ 
                fontSize: "0.65rem", 
                fontWeight: "600", 
                background: "#E2E8F0", 
                color: "#475569", 
                padding: "0.15rem 0.35rem", 
                borderRadius: "4px" 
              }}>
                v1.0
              </span>
            </div>
            <span style={{ fontSize: "0.7rem", color: "#64748B", display: "block", marginTop: "1px" }}>Enterprise Edition</span>
          </div>
        </div>

        {/* Right navigation / Help button */}
        <a 
          href="https://spendflow.com/support" 
          target="_blank"
          style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "0.5rem", 
            padding: "0.5rem 1rem", 
            borderRadius: "8px", 
            border: "1px solid #E2E8F0", 
            background: "#FFFFFF",
            color: "#475569",
            fontSize: "0.85rem",
            fontWeight: "500",
            textDecoration: "none",
            transition: "all 0.15s ease"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = "#CBD5E1";
            e.currentTarget.style.background = "#F8FAFC";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = "#E2E8F0";
            e.currentTarget.style.background = "#FFFFFF";
          }}
        >
          <Icons.HelpCircle size={16} /> Help
        </a>
      </header>

      {/* Main Content Card */}
      <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ 
          maxWidth: "480px", 
          width: "100%", 
          background: "#FFFFFF", 
          border: "1px solid #E2E8F0", 
          borderRadius: "16px", 
          padding: "2.5rem", 
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" 
        }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#0F172A", marginBottom: "0.5rem" }}>Forgot your password?</h2>
          <p style={{ color: "#64748B", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "2rem" }}>
            Enter your work email address and we will send you a verification code to reset your password.
          </p>

          {error && (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.75rem", 
              background: "#FFF1F2", 
              border: "1px solid #FCA5A5", 
              borderRadius: "8px", 
              padding: "0.75rem 1rem", 
              color: "#B91C1C", 
              fontSize: "0.875rem", 
              marginBottom: "1.5rem" 
            }}>
              <Icons.AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {demoCode && (
            <div style={{ 
              background: "#ECFDF5", 
              border: "1px solid #10B981", 
              borderRadius: "8px", 
              padding: "0.75rem 1rem", 
              color: "#065F46", 
              fontSize: "0.875rem", 
              marginBottom: "1.5rem",
              textAlign: "center"
            }}>
              <strong>[Demo Mode]</strong> Code sent: <span style={{ fontFamily: "Courier", fontSize: "1.1rem", fontWeight: "bold" }}>{demoCode}</span>. Redirecting...
            </div>
          )}

          <form onSubmit={handleSendCode}>
            {/* Work Email input */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "#64748B", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Work Email
              </label>
              <input 
                type="email" 
                placeholder="jane.doe@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ 
                  width: "100%", 
                  padding: "0.75rem 1rem", 
                  background: "#FFFFFF", 
                  border: "1px solid #D1D5DB", 
                  borderRadius: "8px", 
                  color: "#1F2937", 
                  fontSize: "0.95rem",
                  outline: "none"
                }} 
              />
            </div>

            {/* Remember Me */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2.25rem" }}>
              <input 
                type="checkbox" 
                id="rememberDevice"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                style={{ 
                  width: "16px", 
                  height: "16px", 
                  borderRadius: "4px", 
                  border: "1px solid #D1D5DB",
                  cursor: "pointer"
                }} 
              />
              <label htmlFor="rememberDevice" style={{ fontSize: "0.85rem", color: "#475569", cursor: "pointer" }}>
                Remember this device — trusted for 7 days
              </label>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading || !!demoCode}
              style={{ 
                width: "100%", 
                background: "#0A52D6", 
                color: "#FFFFFF", 
                border: "none", 
                borderRadius: "8px", 
                padding: "0.875rem", 
                fontWeight: "600", 
                fontSize: "1rem",
                cursor: (loading || !!demoCode) ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                opacity: (loading || !!demoCode) ? 0.7 : 1,
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => !(loading || !!demoCode) && (e.currentTarget.style.backgroundColor = "#0848BE")}
              onMouseOut={(e) => !(loading || !!demoCode) && (e.currentTarget.style.backgroundColor = "#0A52D6")}
            >
              {loading ? "Sending..." : (
                <>
                  Send Verification Code <Icons.ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Back to Login Link */}
          <div style={{ textAlign: "center", marginTop: "1.75rem" }}>
            <a 
              href="/login" 
              style={{ 
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                color: "#0A52D6", 
                fontSize: "0.85rem", 
                fontWeight: "600", 
                textDecoration: "none",
                transition: "opacity 0.15s" 
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = "0.8"}
              onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
            >
              <Icons.ArrowLeft size={16} /> Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
