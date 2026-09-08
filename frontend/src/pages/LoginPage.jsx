import React, { useState } from "react";
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RotateCw,
  Phone,
  KeyRound,
  HeartHandshake,
  Building2,
  Sparkles
} from "lucide-react";
import BloodDropIcon from "../components/BloodDropIcon";
import { api } from "../api/api";
import { navigate } from "../utils/router";

export default function LoginPage({ onAuthSuccess }) {
  const [loginMethod, setLoginMethod] = useState("password"); // "password" | "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone OTP state (for registered donors)
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpDevHint, setOtpDevHint] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (otpCooldown <= 0) return undefined;
    const t = setInterval(() => setOtpCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [otpCooldown]);

  // Demo accounts for instant 1-click verification
  const demoAccounts = [
    {
      label: "Donor Demo",
      role: "donor",
      email: "donor@hexavision.demo",
      password: "HexaVision2026",
      desc: "Rahul Varma (O+)",
      icon: HeartHandshake,
      color: "#ff2a55"
    },
    {
      label: "Hospital Demo",
      role: "hospital",
      email: "hospital@apollo.org",
      password: "Apollo123",
      desc: "Apollo Hospitals Desk",
      icon: Building2,
      color: "var(--cyan-accent)"
    },
    {
      label: "Admin Demo",
      role: "admin",
      email: "admin@hexavision.demo",
      password: "HexaVision2026",
      desc: "Trauma Command Lead",
      icon: ShieldCheck,
      color: "#10b981"
    }
  ];

  const handleSelectDemo = (acc) => {
    setLoginMethod("password");
    setEmail(acc.email);
    setPassword(acc.password);
    setError("");
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please provide both email and password");
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({
        email: email.trim().toLowerCase(),
        password
      });

      if (res.success && res.token && res.user) {
        localStorage.setItem("hexavision_session_token", res.token);
        localStorage.setItem("hexavision_auth_user", JSON.stringify(res.user));
        if (onAuthSuccess) onAuthSuccess(res.user, res.token);

        // AUTOMATIC ROLE-BASED REDIRECTION
        const role = String(res.user.role || res.role || "").toLowerCase();
        if (role === "donor") {
          navigate("/donor/dashboard");
        } else if (role === "hospital") {
          navigate("/hospital/dashboard");
        } else {
          navigate("/admin/dashboard");
        }
      } else {
        setError(res.message || "Invalid credentials");
      }
    } catch (err) {
      setError(err.message || "Sign in failed. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setSendingOtp(true);

    try {
      const res = await api.sendDonorLoginOtp(cleanPhone);
      if (res.success) {
        setOtpSent(true);
        setOtpCooldown(res.cooldown || 30);
        if (res.dev_otp) setOtpDevHint(res.dev_otp);
      } else {
        setError(res.message || "Failed to send OTP");
      }
    } catch (err) {
      setError(err.message || "No registered donor found with this phone. Please register.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpLogin = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (!otp || otp.length < 4) {
      setError("Please enter the received OTP");
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyDonorLogin(cleanPhone, otp.trim());
      if (res.success && res.token && res.user) {
        localStorage.setItem("hexavision_session_token", res.token);
        localStorage.setItem("hexavision_auth_user", JSON.stringify(res.user));
        if (onAuthSuccess) onAuthSuccess(res.user, res.token);

        // Donors automatically open Donor Dashboard
        navigate("/donor/dashboard");
      } else {
        setError(res.message || "Invalid OTP code");
      }
    } catch (err) {
      setError(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 16px",
      background: "radial-gradient(circle at 50% 20%, rgba(255, 42, 85, 0.08) 0%, rgba(6, 9, 17, 0.95) 100%)"
    }}>
      <div style={{
        maxWidth: "520px",
        width: "100%",
        background: "rgba(11, 20, 38, 0.85)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "20px",
        padding: "36px",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)"
      }}>
        {/* Header / Brand */}
        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          <div
            onClick={() => navigate("/")}
            style={{
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px"
            }}
          >
            <div className="brand-hexagon logo-blood-pulse" style={{ width: "42px", height: "42px" }}>
              <BloodDropIcon size={22} color="#ffffff" variant="filled" animated />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: "900", letterSpacing: "0.08em", color: "#ffffff" }}>
                HEXAVISION
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--cyan-accent)", letterSpacing: "0.06em", fontWeight: "600" }}>
                EMERGENCY BLOOD AI NETWORK
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#ffffff", marginTop: "8px" }}>
            Sign In
          </h2>
          <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Sign in to your account. Your dashboard will open automatically.
          </p>
        </div>

        {/* Quick Demo Access Bar */}
        <div style={{
          background: "rgba(6, 9, 17, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          padding: "12px",
          marginBottom: "20px"
        }}>
          <div style={{
            fontSize: "0.72rem",
            fontWeight: "700",
            color: "var(--cyan-accent)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}>
            <Sparkles size={13} />
            <span>Quick Demo Role Access</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {demoAccounts.map((acc) => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.role}
                  type="button"
                  id={`demo-pill-${acc.role}`}
                  onClick={() => handleSelectDemo(acc)}
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "8px 6px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  title={acc.desc}
                >
                  <Icon size={16} color={acc.color} style={{ margin: "0 auto 4px" }} />
                  <div style={{ fontSize: "0.76rem", fontWeight: "700", color: "#ffffff" }}>
                    {acc.label}
                  </div>
                  <div style={{ fontSize: "0.66rem", color: "var(--text-muted)" }}>
                    {acc.role.toUpperCase()}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Method Tabs: Password vs Donor OTP */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "18px",
          background: "rgba(6, 9, 17, 0.6)",
          padding: "4px",
          borderRadius: "10px"
        }}>
          <button
            type="button"
            onClick={() => { setLoginMethod("password"); setError(""); }}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: loginMethod === "password" ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid transparent",
              background: loginMethod === "password" ? "rgba(255, 255, 255, 0.08)" : "transparent",
              color: loginMethod === "password" ? "#ffffff" : "var(--text-muted)",
              fontSize: "0.82rem",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Email & Password
          </button>

          <button
            type="button"
            onClick={() => { setLoginMethod("otp"); setError(""); }}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: loginMethod === "otp" ? "1px solid rgba(255, 42, 85, 0.4)" : "1px solid transparent",
              background: loginMethod === "otp" ? "rgba(255, 42, 85, 0.12)" : "transparent",
              color: loginMethod === "otp" ? "#ff4d6d" : "var(--text-muted)",
              fontSize: "0.82rem",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Donor Phone OTP
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: "rgba(255, 42, 85, 0.12)",
            border: "1px solid rgba(255, 42, 85, 0.4)",
            borderRadius: "10px",
            padding: "12px 14px",
            marginBottom: "18px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#ff4d6d",
            fontSize: "0.85rem"
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* PASSWORD LOGIN FORM */}
        {loginMethod === "password" && (
          <form onSubmit={handlePasswordLogin}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                Email Address
              </label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  type="email"
                  id="input-login-email"
                  className="auth-input"
                  placeholder="donor@example.com / bloodbank@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                Password
              </label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type="password"
                  id="input-login-password"
                  className="auth-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-login-submit"
              className="btn btn-emergency"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                fontSize: "0.96rem",
                fontWeight: "700",
                justifyContent: "center",
                borderRadius: "10px"
              }}
            >
              {loading ? (
                <>
                  <RotateCw size={18} className="spin" />
                  <span>Authenticating Role & Opening Dashboard...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* PHONE OTP LOGIN FORM */}
        {loginMethod === "otp" && (
          <form onSubmit={handleOtpLogin}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                Donor Mobile Phone (10 Digits)
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <div className="auth-input-wrap" style={{ flex: 1 }}>
                  <span style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    fontWeight: "700",
                    fontSize: "0.85rem"
                  }}>
                    +91
                  </span>
                  <input
                    type="tel"
                    className="auth-input"
                    style={{ paddingLeft: "46px" }}
                    placeholder="9876543210"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      setOtpSent(false);
                    }}
                    required
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleSendOtp}
                  disabled={phone.replace(/\D/g, "").length !== 10 || sendingOtp || otpCooldown > 0}
                  style={{ minWidth: "105px" }}
                >
                  {sendingOtp ? (
                    <RotateCw size={14} className="spin" />
                  ) : otpCooldown > 0 ? (
                    <span>Wait {otpCooldown}s</span>
                  ) : (
                    <span>{otpSent ? "Resend" : "Send OTP"}</span>
                  )}
                </button>
              </div>
            </div>

            {otpSent && (
              <div style={{
                background: "rgba(0, 242, 254, 0.06)",
                border: "1px solid rgba(0, 242, 254, 0.25)",
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "16px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.76rem", color: "var(--cyan-accent)", fontWeight: "600" }}>
                    OTP sent to +91 {phone}
                  </span>
                  {otpDevHint && (
                    <span style={{
                      fontSize: "0.72rem",
                      background: "rgba(0, 242, 254, 0.15)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      color: "var(--cyan-accent)",
                      fontFamily: "monospace"
                    }}>
                      Demo OTP: {otpDevHint}
                    </span>
                  )}
                </div>

                <div className="auth-input-wrap">
                  <KeyRound size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    style={{ letterSpacing: "0.2em", fontWeight: "700" }}
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-emergency"
              disabled={loading || !otpSent || otp.length < 4}
              style={{
                width: "100%",
                padding: "14px",
                fontSize: "0.96rem",
                fontWeight: "700",
                justifyContent: "center",
                borderRadius: "10px"
              }}
            >
              {loading ? (
                <>
                  <RotateCw size={18} className="spin" />
                  <span>Verifying Donor Session...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Donor</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Link */}
        <div style={{ marginTop: "24px", textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          New to HexaVision?{" "}
          <button
            type="button"
            id="link-to-register"
            onClick={() => navigate("/register")}
            style={{
              background: "none",
              border: "none",
              color: "var(--cyan-accent)",
              fontWeight: "700",
              cursor: "pointer",
              textDecoration: "underline"
            }}
          >
            Register as Donor or Hospital
          </button>
        </div>
      </div>
    </div>
  );
}
