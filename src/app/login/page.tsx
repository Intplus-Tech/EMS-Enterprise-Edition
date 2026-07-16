"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { BRANDING } from "../../config/branding";

export default function LoginPage() {
  const router = useRouter();

  // State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        // Force refresh session and redirect to root dashboard
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Invalid email or password.");
      }
    } catch (e) {
      setError("Unable to connect to the server. Please check your internet connection.");
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

      {/* Main Form Area */}
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
          <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#0F172A", marginBottom: "0.5rem" }}>Welcome back</h2>
          <p style={{ color: "#64748B", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "2rem" }}>
            Secure access to your expense workflow
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

          <form onSubmit={handleLogin}>
            {/* Company Email / User ID */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "#64748B", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Company Email / User ID
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

            {/* Password */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "#64748B", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            {/* Sign in Button */}
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: "100%", 
                background: "#0A52D6", 
                color: "#FFFFFF", 
                border: "none", 
                borderRadius: "8px", 
                padding: "0.875rem", 
                fontWeight: "600", 
                fontSize: "1rem",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = "#0848BE")}
              onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = "#0A52D6")}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Forgot Password Link */}
          <div style={{ textAlign: "center", marginTop: "1.75rem" }}>
            <a 
              href="/forgot-password" 
              style={{ 
                color: "#64748B", 
                fontSize: "0.85rem", 
                fontWeight: "500", 
                textDecoration: "none",
                transition: "color 0.15s" 
              }}
              onMouseOver={(e) => e.currentTarget.style.color = "#0A52D6"}
              onMouseOut={(e) => e.currentTarget.style.color = "#64748B"}
            >
              Forgot password?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
