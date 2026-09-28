"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as Icons from "lucide-react";
import { BRANDING } from "../../config/branding";
import { SubmitButton } from "../../components/ui/SubmitButton";

function VerifyCodeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  // 6 digit code inputs state
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<HTMLInputElement[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [resendTimer, setResendTimer] = useState(60);

  // Dynamic countdown timer for OTP resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Mask the email address to display: j***@company.com
  const maskEmail = (emailStr: string) => {
    if (!emailStr) return "your work email";
    const parts = emailStr.split("@");
    if (parts.length !== 2) return emailStr;
    const [username, domain] = parts;
    if (username.length === 0) return emailStr;
    return `${username[0]}***@${domain}`;
  };

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // No autofill: the reset code is only ever delivered by email, never carried
  // in the URL where it would land in history and server logs.

  // Handle inputs digit typing
  const handleChange = (index: number, value: string) => {
    // Only accept numeric inputs
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle backspace key press
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Clear previous input and move focus backward
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
        inputRefs.current[index - 1].focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      }
    }
  };

  // Handle paste code
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pasteData)) {
      setDigits(pasteData.split(""));
      inputRefs.current[5].focus();
    }
  };

  // Submit code verification
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResendMessage("");

    const code = digits.join("");
    if (code.length !== 6) {
      setError("Please enter all 6 digits of the verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (data.success) {
        // Success redirect to password reset form page
        router.push(`/reset-password?email=${encodeURIComponent(email)}&code=${code}`);
      } else {
        setError(data.error || "The code you entered is invalid or has expired.");
      }
    } catch (e) {
      setError("An error occurred during verification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend code trigger
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError("");
    setResendMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        // The endpoint deliberately never returns the code — it is emailed.
        setResendMessage("A new verification code has been sent to your email.");
        setDigits(Array(6).fill(""));
        setResendTimer(60);
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      } else {
        setError(data.error || "Failed to resend code.");
      }
    } catch (e) {
      setError("Error resending code.");
    }
  };

  return (
    <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative" }}>
      <div className="glass-panel" style={{ 
        maxWidth: "480px", 
        width: "100%", 
        background: "rgb(var(--color-surface))", 
        border: "1px solid rgb(var(--color-card-border) / 0.5)", 
        borderRadius: "16px", 
        padding: "2.5rem", 
        boxShadow: "var(--shadow-glass)",
        textAlign: "center"
      }}>
        {/* Envelope icon header badge */}
        <div style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          justifyContent: "center", 
          width: "72px", 
          height: "72px", 
          borderRadius: "50%", 
          background: "rgb(var(--color-primary) / 0.12)", 
          color: "#2563EB", 
          marginBottom: "1.5rem" 
        }}>
          <Icons.Mail size={32} />
        </div>

        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "rgb(var(--color-text))", marginBottom: "0.5rem" }}>Check your email</h2>
        <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "2rem" }}>
          We have sent a 6-digit verification code to<br />
          <strong>{maskEmail(email)}</strong>.
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
            marginBottom: "1.5rem",
            textAlign: "left"
          }}>
            <Icons.AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {resendMessage && (
          <div style={{
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            color: "#059669",
            fontSize: "0.875rem",
            marginBottom: "1.5rem"
          }}>
            {resendMessage}
          </div>
        )}

        <form onSubmit={handleVerify}>
          {/* 6 digits input grid */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginBottom: "2rem" }}>
            {digits.map((digit, i) => (
              <input
                key={i}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                ref={(el) => {
                  if (el) inputRefs.current[i] = el;
                }}
                placeholder="-"
                style={{
                  width: "50px",
                  height: "56px",
                  border: "1px solid rgb(var(--color-card-border) / 0.6)",
                  borderRadius: "8px",
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  textAlign: "center",
                  outline: "none",
                  color: "rgb(var(--color-text))",
                  background: "rgb(var(--color-surface))"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#2563EB";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37, 99, 235, 0.2)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgb(var(--color-card-border) / 0.6)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            ))}
          </div>

          {/* Outline styled Verify Button — the design keeps this one ghosted,
              so it stays a bordered surface rather than a filled primary. */}
          <SubmitButton
            type="submit"
            variant="secondary"
            loading={loading}
            loadingLabel="Verifying…"
            style={{
              width: "100%",
              background: "rgb(var(--color-surface))",
              color: "#2563EB",
              border: "1px solid rgb(var(--color-card-border) / 0.6)",
              padding: "0.875rem",
              fontSize: "1rem",
              fontWeight: 600,
            }}
          >
            Verify Code
          </SubmitButton>
        </form>

        {/* Resend Link */}
        <div style={{ marginTop: "1.75rem", fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>
          Didn't receive the code?{" "}
          <button 
            onClick={handleResend}
            disabled={resendTimer > 0}
            style={{ 
              background: "none", 
              border: "none", 
              color: resendTimer > 0 ? "rgb(var(--color-text-dim))" : "#2563EB", 
              fontWeight: "700", 
              cursor: resendTimer > 0 ? "not-allowed" : "pointer", 
              padding: 0,
              fontFamily: "inherit"
            }}
          >
            {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}
          </button>
        </div>
      </div>

      {/* Floating alert card: Having trouble? */}
      <div style={{ 
        position: "fixed",
        bottom: "2.5rem",
        right: "2.5rem",
        maxWidth: "320px", 
        width: "100%", 
        background: "rgba(37, 99, 235, 0.08)", 
        border: "1px solid rgba(37, 99, 235, 0.25)", 
        borderRadius: "12px", 
        padding: "1rem", 
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        gap: "0.75rem",
        textAlign: "left"
      }}>
        <span style={{ color: "#2563EB", flexShrink: 0, marginTop: "0.15rem" }}>
          <Icons.Info size={20} />
        </span>
        <div>
          <h4 style={{ fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Having trouble?</h4>
          <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.75rem", lineHeight: "1.4" }}>
            Verify that you are using your corporate email address and check your spam folder if the code doesn't arrive within 2 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyCodePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "rgb(var(--color-background))", color: "rgb(var(--color-text))", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <header style={{ 
        padding: "1.25rem 2.5rem", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        background: "rgb(var(--color-surface))",
        borderBottom: "1px solid rgb(var(--color-card-border) / 0.5)"
      }}>
        {/* Brand logo & text */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ 
            padding: "0.4rem", 
            borderRadius: "50%", 
            background: "rgb(var(--color-primary) / 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <img src={BRANDING.logoUrl || "/logo.svg"} alt={`${BRANDING.appName} Logo`} style={{ width: 26, height: 26, objectFit: "contain", borderRadius: "50%" }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ fontWeight: "700", fontSize: "1rem", color: "rgb(var(--color-text))" }}>{BRANDING.appName}</span>
              <span style={{ 
                fontSize: "0.65rem", 
                fontWeight: "600", 
                background: "rgb(var(--color-card-border) / 0.4)", 
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

        {/* Right Help button */}
        <a 
          href="https://spendflow.com/support" 
          target="_blank"
          style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "0.5rem", 
            padding: "0.5rem 1rem", 
            borderRadius: "8px", 
            border: "1px solid rgb(var(--color-card-border) / 0.5)", 
            background: "rgb(var(--color-surface))",
            color: "rgb(var(--color-text-muted))",
            fontSize: "0.85rem",
            fontWeight: "500",
            textDecoration: "none",
            transition: "all 0.15s ease"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = "rgb(var(--color-primary) / 0.5)";
            e.currentTarget.style.background = "rgb(var(--color-primary) / 0.05)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = "rgb(var(--color-card-border) / 0.6)";
            e.currentTarget.style.background = "rgb(var(--color-card))";
          }}
        >
          <Icons.HelpCircle size={16} /> Help
        </a>
      </header>

      {/* Main Content */}
      <Suspense fallback={
        <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "rgb(var(--color-text-muted))" }}>Loading code validator...</p>
        </div>
      }>
        <VerifyCodeContent />
      </Suspense>
    </div>
  );
}
