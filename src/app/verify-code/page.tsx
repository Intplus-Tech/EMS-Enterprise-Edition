"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as Icons from "lucide-react";
import { BRANDING } from "../../config/branding";

function VerifyCodeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const demoCode = searchParams.get("demo") || "";

  // 6 digit code inputs state
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<HTMLInputElement[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");

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

  // Autofill code if passed via demo param
  useEffect(() => {
    if (demoCode && demoCode.length === 6) {
      setDigits(demoCode.split(""));
    }
  }, [demoCode]);

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
        setResendMessage(`New code generated: ${data.code}`);
        setDigits(Array(6).fill(""));
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
      <div style={{ 
        maxWidth: "480px", 
        width: "100%", 
        background: "#FFFFFF", 
        border: "1px solid #E2E8F0", 
        borderRadius: "16px", 
        padding: "2.5rem", 
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
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
          background: "#EEF2F6", 
          color: "#0A52D6", 
          marginBottom: "1.5rem" 
        }}>
          <Icons.Mail size={32} />
        </div>

        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#0F172A", marginBottom: "0.5rem" }}>Check your email</h2>
        <p style={{ color: "#64748B", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "2rem" }}>
          We have sent a 6-digit verification code to<br />
          <strong>{maskEmail(email)}</strong>.
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
            marginBottom: "1.5rem",
            textAlign: "left"
          }}>
            <Icons.AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {resendMessage && (
          <div style={{ 
            background: "#ECFDF5", 
            border: "1px solid #10B981", 
            borderRadius: "8px", 
            padding: "0.75rem 1rem", 
            color: "#065F46", 
            fontSize: "0.875rem", 
            marginBottom: "1.5rem"
          }}>
            <strong>[Demo Mode]</strong> {resendMessage}
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
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  textAlign: "center",
                  outline: "none",
                  color: "#1F2937",
                  background: "#FFFFFF"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#0A52D6";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(10, 82, 214, 0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#D1D5DB";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            ))}
          </div>

          {/* Outline styled Verify Button */}
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: "100%", 
              background: "#FFFFFF", 
              color: "#0A52D6", 
              border: "1px solid #D1D5DB", 
              borderRadius: "8px", 
              padding: "0.875rem", 
              fontWeight: "600", 
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.background = "#F8FAFC")}
            onMouseOut={(e) => !loading && (e.currentTarget.style.background = "#FFFFFF")}
          >
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </form>

        {/* Resend Link */}
        <div style={{ marginTop: "1.75rem", fontSize: "0.85rem", color: "#64748B" }}>
          Didn't receive the code?{" "}
          <button 
            onClick={handleResend}
            style={{ 
              background: "none", 
              border: "none", 
              color: "#0A52D6", 
              fontWeight: "700", 
              cursor: "pointer", 
              padding: 0,
              fontFamily: "inherit"
            }}
          >
            Resend
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
        background: "#EFF6FF", 
        border: "1px solid #BFDBFE", 
        borderRadius: "12px", 
        padding: "1rem", 
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
        display: "flex",
        gap: "0.75rem",
        textAlign: "left"
      }}>
        <span style={{ color: "#3B82F6", flexShrink: 0, marginTop: "0.15rem" }}>
          <Icons.Info size={20} />
        </span>
        <div>
          <h4 style={{ fontWeight: "700", color: "#1E3A8A", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Having trouble?</h4>
          <p style={{ color: "#1E40AF", fontSize: "0.75rem", lineHeight: "1.4" }}>
            Verify that you are using your corporate email address and check your spam folder if the code doesn't arrive within 2 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyCodePage() {
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

      {/* Main Content */}
      <Suspense fallback={
        <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#64748B" }}>Loading code validator...</p>
        </div>
      }>
        <VerifyCodeContent />
      </Suspense>
    </div>
  );
}
