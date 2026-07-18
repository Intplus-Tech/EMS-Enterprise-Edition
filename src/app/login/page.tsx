"use client";

import { useState, useEffect } from "react";
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

  // Theme state
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

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
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      minHeight: "100vh", 
      background: "rgb(var(--color-background))", 
      color: "rgb(var(--color-text))", 
      fontFamily: "var(--font-sans)",
      transition: "background var(--transition-normal), color var(--transition-normal)"
    }}>
      {/* Header */}
      <header style={{ 
        padding: "1.25rem 2.5rem", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        background: "rgb(var(--color-surface))",
        borderBottom: "1px solid rgba(var(--color-card-border), 0.5)",
        transition: "background var(--transition-normal), border var(--transition-normal)"
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
                background: "rgba(var(--color-card-border), 0.3)", 
                color: "rgb(var(--color-text-muted))", 
                padding: "0.15rem 0.35rem", 
                borderRadius: "4px" 
              }}>
                v1.0
              </span>
            </div>
            <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-dim))", display: "block", marginTop: "1px" }}>Enterprise Edition</span>
          </div>
        </div>

        {/* Right navigation / Help button + Theme switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button 
            type="button"
            onClick={toggleTheme}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              border: "1px solid rgba(var(--color-card-border), 0.6)",
              background: "rgb(var(--color-card))",
              color: "rgb(var(--color-text))",
              cursor: "pointer",
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
            {theme === "light" ? <Icons.Moon size={16} /> : <Icons.Sun size={16} />}
          </button>

          <a 
            href="https://spendflow.com/support" 
            target="_blank"
            style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "0.5rem", 
              padding: "0.5rem 1rem", 
              borderRadius: "8px", 
              border: "1px solid rgba(var(--color-card-border), 0.6)", 
              background: "rgb(var(--color-card))",
              color: "rgb(var(--color-text-muted))",
              fontSize: "0.85rem",
              fontWeight: "500",
              textDecoration: "none",
              transition: "all 0.15s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "rgba(var(--color-primary), 0.5)";
              e.currentTarget.style.background = "rgba(var(--color-primary), 0.05)";
              e.currentTarget.style.color = "rgb(var(--color-text))";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "rgba(var(--color-card-border), 0.6)";
              e.currentTarget.style.background = "rgb(var(--color-card))";
              e.currentTarget.style.color = "rgb(var(--color-text-muted))";
            }}
          >
            <Icons.HelpCircle size={16} /> Help
          </a>
        </div>
      </header>

      {/* Main Form Area */}
      <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ 
          maxWidth: "480px", 
          width: "100%", 
          background: "rgb(var(--color-surface))", 
          border: "1px solid rgba(var(--color-card-border), 0.4)", 
          borderRadius: "16px", 
          padding: "2.5rem", 
          boxShadow: "var(--shadow-lg)",
          transition: "background var(--transition-normal), border var(--transition-normal)"
        }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "rgb(var(--color-text))", marginBottom: "0.5rem" }}>Welcome back</h2>
          <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "2rem" }}>
            Secure access to your expense workflow
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

          <form onSubmit={handleLogin}>
            {/* Company Email / User ID */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "rgb(var(--color-text-muted))", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
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
                  background: "rgb(var(--color-background))", 
                  border: "1px solid rgba(var(--color-card-border), 0.6)", 
                  borderRadius: "8px", 
                  color: "rgb(var(--color-text))", 
                  fontSize: "0.95rem",
                  outline: "none"
                }} 
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "rgb(var(--color-text-muted))", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
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
                    background: "rgb(var(--color-background))", 
                    border: "1px solid rgba(var(--color-card-border), 0.6)", 
                    borderRadius: "8px", 
                    color: "rgb(var(--color-text))", 
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
                    color: "rgb(var(--color-text-dim))", 
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
                  border: "1px solid rgba(var(--color-card-border), 0.6)",
                  background: "rgb(var(--color-background))",
                  cursor: "pointer"
                }} 
              />
              <label htmlFor="rememberDevice" style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", cursor: "pointer" }}>
                Remember this device — trusted for 7 days
              </label>
            </div>

            {/* Sign in Button */}
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: "100%", 
                background: "rgb(var(--color-primary))", 
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
              onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = "rgb(var(--color-primary-hover))")}
              onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = "rgb(var(--color-primary))")}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Forgot Password Link */}
          <div style={{ textAlign: "center", marginTop: "1.75rem" }}>
            <a 
              href="/forgot-password" 
              style={{ 
                color: "rgb(var(--color-text-dim))", 
                fontSize: "0.85rem", 
                fontWeight: "500", 
                textDecoration: "none",
                transition: "color 0.15s" 
              }}
              onMouseOver={(e) => e.currentTarget.style.color = "rgb(var(--color-primary))"}
              onMouseOut={(e) => e.currentTarget.style.color = "rgb(var(--color-text-dim))"}
            >
              Forgot password?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
