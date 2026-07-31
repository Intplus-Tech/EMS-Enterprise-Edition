"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { BRANDING } from "../../config/branding";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // State
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSent(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.success) {
        // The code is emailed and never returned by the API, so nothing is
        // echoed on screen or carried in the URL.
        setSent(true);
        setTimeout(() => {
          router.push(`/verify-code?email=${encodeURIComponent(email)}`);
        }, 1200);
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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "rgb(var(--color-background))", color: "rgb(var(--color-text))", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <header style={{ 
        padding: "1.25rem 2.5rem", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        background: "rgb(var(--color-surface))",
        borderBottom: "1px solid rgba(var(--color-card-border), 0.5)"
      }}>
        {/* Brand logo & text */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ 
            padding: "0.4rem", 
            borderRadius: "50%", 
            background: "rgba(var(--color-primary), 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <img src={BRANDING.logoUrl || "/logo.svg"} alt="EMS Logo" style={{ width: 26, height: 26, objectFit: "contain", borderRadius: "50%" }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ fontWeight: "700", fontSize: "1rem", color: "rgb(var(--color-text))" }}>EMS</span>
              <span style={{ 
                fontSize: "0.65rem", 
                fontWeight: "600", 
                background: "rgba(var(--color-card-border), 0.4)", 
                color: "rgb(var(--color-text-muted))", 
                padding: "0.15rem 0.35rem", 
                borderRadius: "4px" 
              }}>
                v1.0
              </span>
            </div>
            <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-muted))", display: "block", marginTop: "1px" }}>Enterprise Edition</span>
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
            border: "1px solid rgba(var(--color-card-border), 0.5)", 
            background: "rgb(var(--color-surface))",
            color: "rgb(var(--color-text-muted))",
            fontSize: "0.85rem",
            fontWeight: "500",
            textDecoration: "none",
            transition: "all 0.15s ease"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = "rgba(var(--color-primary), 0.5)";
            e.currentTarget.style.background = "rgba(var(--color-primary), 0.05)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = "rgba(var(--color-card-border), 0.6)";
            e.currentTarget.style.background = "rgb(var(--color-card))";
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
          background: "rgb(var(--color-surface))", 
          border: "1px solid rgba(var(--color-card-border), 0.5)", 
          borderRadius: "16px", 
          padding: "2.5rem", 
          boxShadow: "var(--shadow-lg)" 
        }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "rgb(var(--color-text))", marginBottom: "0.5rem" }}>Forgot your password?</h2>
          <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "2rem" }}>
            Enter your work email address and we will send you a verification code to reset your password.
          </p>

          {error && (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.75rem", 
              background: "rgba(239, 68, 68, 0.08)", 
              border: "1px solid rgba(239, 68, 68, 0.3)", 
              borderRadius: "8px", 
              padding: "0.75rem 1rem", 
              color: "#EF4444", 
              fontSize: "0.875rem", 
              marginBottom: "1.5rem" 
            }}>
              <Icons.AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {sent && (
            <div style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              color: "#059669",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
              textAlign: "center"
            }}>
              If that email is registered, a verification code is on its way. Redirecting…
            </div>
          )}

          <form onSubmit={handleSendCode}>
            {/* Work Email input */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "rgb(var(--color-text-muted))", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
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
                  background: "rgb(var(--color-surface))", 
                  border: "1px solid rgba(var(--color-card-border), 0.6)", 
                  borderRadius: "8px", 
                  color: "rgb(var(--color-text))", 
                  fontSize: "0.95rem",
                  outline: "none"
                }} 
              />
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading || sent}
              style={{ 
                width: "100%", 
                background: "rgb(var(--color-primary))", 
                color: "#FFFFFF", 
                border: "none", 
                borderRadius: "8px", 
                padding: "0.875rem", 
                fontWeight: "600", 
                fontSize: "1rem",
                cursor: (loading || sent) ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                opacity: (loading || sent) ? 0.7 : 1,
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => !(loading || sent) && (e.currentTarget.style.backgroundColor = "rgb(var(--color-primary-hover))")}
              onMouseOut={(e) => !(loading || sent) && (e.currentTarget.style.backgroundColor = "rgb(var(--color-primary))")}
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
                color: "#2563EB", 
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
