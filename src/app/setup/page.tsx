"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as Icons from "lucide-react";
import { BRANDING } from "../../config/branding";

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // State
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Validate token and fetch user details on mount
  useEffect(() => {
    if (!token) {
      setError("No invitation token provided. Please check the link in your email.");
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/auth/setup?token=${token}`);
        const data = await res.json();
        
        if (data.success) {
          setEmail(data.email);
          setName(data.name);
          setRole(data.role);
        } else {
          setError(data.error || "The invitation is invalid or has expired.");
        }
      } catch (e) {
        setError("Unable to validate invitation. Please check your internet connection.");
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  // Form submit handler
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        // Force refresh and redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 2000);
      } else {
        setError(data.error || "Failed to activate account.");
      }
    } catch (e) {
      setError("An error occurred during account activation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ 
            border: "3px solid #E2E8F0", 
            borderTop: "3px solid #0A52D6", 
            borderRadius: "50%", 
            width: "40px", 
            height: "40px", 
            margin: "0 auto 1.5rem auto",
            animation: "spin 1s linear infinite"
          }} />
          <p style={{ color: "#64748B", fontSize: "0.95rem" }}>Verifying invitation details...</p>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}} />
        </div>
      </div>
    );
  }

  if (error && !email) {
    return (
      <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ 
          maxWidth: "480px", 
          width: "100%", 
          background: "#FFFFFF", 
          border: "1px solid #FDA4AF", 
          borderRadius: "16px", 
          padding: "2.5rem", 
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
          textAlign: "center"
        }}>
          <div style={{ display: "inline-flex", padding: "0.75rem", borderRadius: "50%", background: "#FFE4E6", color: "#E11D48", marginBottom: "1.5rem" }}>
            <Icons.AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#0F172A", marginBottom: "0.75rem" }}>Invitation Error</h2>
          <p style={{ color: "#64748B", fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "2rem" }}>
            {error}
          </p>
          <button 
            onClick={() => router.push("/")}
            style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "0.5rem",
              background: "#0A52D6", 
              color: "#FFFFFF", 
              border: "none", 
              borderRadius: "8px", 
              padding: "0.75rem 1.5rem", 
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ 
          maxWidth: "480px", 
          width: "100%", 
          background: "#FFFFFF", 
          border: "1px solid #A7F3D0", 
          borderRadius: "16px", 
          padding: "2.5rem", 
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
          textAlign: "center"
        }}>
          <div style={{ display: "inline-flex", padding: "0.75rem", borderRadius: "50%", background: "#D1FAE5", color: "#059669", marginBottom: "1.5rem" }}>
            <Icons.CheckCircle size={32} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#0F172A", marginBottom: "0.75rem" }}>Account Activated!</h2>
          <p style={{ color: "#64748B", fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "2rem" }}>
            Welcome, <strong>{name}</strong>! Your password has been successfully configured. We are signing you in and redirecting to the dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
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
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#0F172A", marginBottom: "0.5rem" }}>Welcome to EMS</h2>
        <p style={{ color: "#64748B", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "2rem" }}>
          Your administrator has invited you to join the Finance Hub. Please set up your secure password to continue.
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

        <form onSubmit={handleActivate}>
          {/* Invited Email Address */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "#64748B", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
              Invited Email Address
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#94A3B8", display: "flex", alignItems: "center" }}>
                <Icons.Mail size={18} />
              </span>
              <input 
                type="text" 
                value={email}
                readOnly
                disabled
                style={{ 
                  width: "100%", 
                  padding: "0.75rem 1rem 0.75rem 2.75rem", 
                  background: "#F8FAFC", 
                  border: "1px solid #E2E8F0", 
                  borderRadius: "8px", 
                  color: "#64748B", 
                  fontSize: "0.95rem",
                  cursor: "not-allowed",
                  outline: "none"
                }} 
              />
            </div>
          </div>

          {/* New Password */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "#64748B", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
              New Password
            </label>
            <div style={{ position: "relative" }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "0.75rem 2.75rem 0.75rem 1rem", 
                  background: "#FFFFFF", 
                  border: "1px solid #D1D5DB", 
                  borderRadius: "8px", 
                  color: "#1F2937", 
                  fontSize: "0.95rem",
                  outline: "none"
                }} 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: "absolute", 
                  right: "1rem", 
                  top: "50%", 
                  transform: "translateY(-50%)", 
                  color: "#94A3B8", 
                  background: "none", 
                  border: "none", 
                  cursor: "pointer", 
                  display: "flex", 
                  alignItems: "center" 
                }}
              >
                {showPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: "2rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "#64748B", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
              Confirm New Password
            </label>
            <div style={{ position: "relative" }}>
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "0.75rem 2.75rem 0.75rem 1rem", 
                  background: "#FFFFFF", 
                  border: "1px solid #D1D5DB", 
                  borderRadius: "8px", 
                  color: "#1F2937", 
                  fontSize: "0.95rem",
                  outline: "none"
                }} 
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ 
                  position: "absolute", 
                  right: "1rem", 
                  top: "50%", 
                  transform: "translateY(-50%)", 
                  color: "#94A3B8", 
                  background: "none", 
                  border: "none", 
                  cursor: "pointer", 
                  display: "flex", 
                  alignItems: "center" 
                }}
              >
                {showConfirmPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Activate Account Button */}
          <button 
            type="submit" 
            disabled={submitting}
            style={{ 
              width: "100%", 
              background: "#0A52D6", 
              color: "#FFFFFF", 
              border: "none", 
              borderRadius: "8px", 
              padding: "0.875rem", 
              fontWeight: "600", 
              fontSize: "1rem",
              cursor: submitting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              opacity: submitting ? 0.7 : 1,
              transition: "background-color 0.2s"
            }}
            onMouseOver={(e) => !submitting && (e.currentTarget.style.backgroundColor = "#0848BE")}
            onMouseOut={(e) => !submitting && (e.currentTarget.style.backgroundColor = "#0A52D6")}
          >
            {submitting ? "Activating Account..." : (
              <>
                Activate Account <Icons.ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SetupPage() {
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

      {/* Main Content wizard */}
      <Suspense fallback={
        <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#64748B" }}>Loading setup form...</p>
        </div>
      }>
        <SetupContent />
      </Suspense>
    </div>
  );
}
