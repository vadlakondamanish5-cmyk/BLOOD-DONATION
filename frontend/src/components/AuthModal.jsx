import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Building2,
  Phone,
  Bot,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  KeyRound
} from "lucide-react";
import BloodDropIcon from "./BloodDropIcon";
import { api } from "../api/api";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [tab, setTab] = useState("login"); // "login" | "register"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successStep, setSuccessStep] = useState(null); // null | "verifying" | "activating" | "done"
  const [activeUser, setActiveUser] = useState(null);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("Apollo Hospitals - Bannerghatta");
  const [role, setRole] = useState("Blood Bank Chief");
  const [phone, setPhone] = useState("");
  const [authorizedConsent, setAuthorizedConsent] = useState(true);

  if (!isOpen) return null;

  const demoAccounts = [
    {
      name: "Dr. Arvind Kumar",
      email: "dr.arvind@apollo.org",
      password: "Apollo123",
      org: "Apollo Hospitals",
      role: "Blood Bank Chief"
    },
    {
      name: "Dr. Sunita Rao",
      email: "emergency@manipal.org",
      password: "Apollo123",
      org: "Manipal Hospital",
      role: "Emergency HOD"
    },
    {
      name: "Trauma Coordinator",
      email: "coordinator@hexavision.demo",
      password: "HexaVision2026",
      org: "HexaVision Trauma Net",
      role: "Emergency Coordinator"
    }
  ];

  const handleSelectDemo = (account) => {
    setTab("login");
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  };

  const runActivationSequence = (user, token) => {
    setActiveUser(user);
    setSuccessStep("verifying");

    setTimeout(() => {
      setSuccessStep("activating");
      setTimeout(() => {
        setSuccessStep("done");
        setTimeout(() => {
          onAuthSuccess(user, token);
          onClose();
          setSuccessStep(null);
          setLoading(false);
        }, 900);
      }, 1000);
    }, 800);
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please provide both email and password");
      return;
    }

    try {
      setLoading(true);
      const res = await api.login({ email, password });
      if (res.success) {
        localStorage.setItem("hexavision_auth_user", JSON.stringify(res.user));
        localStorage.setItem("hexavision_session_token", res.token);
        runActivationSequence(res.user, res.token);
      } else {
        setError(res.message || "Authentication failed");
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || "Failed to sign in. Please verify credentials.");
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid official email address");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!authorizedConsent) {
      setError("You must certify medical authorization for emergency transfusion coordination");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        organization: organization.trim(),
        role,
        phone: phone.trim()
      };

      const res = await api.register(payload);
      if (res.success) {
        localStorage.setItem("hexavision_auth_user", JSON.stringify(res.user));
        localStorage.setItem("hexavision_session_token", res.token);
        runActivationSequence(res.user, res.token);
      } else {
        setError(res.message || "Registration failed");
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || "Registration encountered an error");
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card auth-modal-card"
        style={{ maxWidth: "560px", width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "radial-gradient(circle at 30% 30%, rgba(255, 42, 85, 0.4), rgba(11, 20, 38, 0.9))",
                border: "1px solid rgba(255, 42, 85, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(255, 42, 85, 0.3)"
              }}
            >
              <BloodDropIcon size={24} color="#ff2a55" variant="filled" className="logo-blood-pulse" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ fontSize: "1.22rem", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "0.02em" }}>
                  HEXAVISION ACCESS
                </h3>
                <span className="auth-badge-medical">
                  <ShieldCheck size={12} />
                  CLINICAL
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Consent-First Emergency Blood AI Coordination
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: "6px", borderRadius: "8px" }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* AI Activation Progression Sequence */}
        {successStep ? (
          <div className="auth-activation-screen">
            <div className="auth-activation-glow">
              <Bot size={48} className="auth-bot-pulse" />
            </div>
            <h4 style={{ fontSize: "1.18rem", fontWeight: "800", marginTop: "14px", color: "var(--text-primary)" }}>
              {successStep === "verifying" && "Verifying Clinical Credentials..."}
              {successStep === "activating" && "Syncing Emergency Transfusion Engine..."}
              {successStep === "done" && "🤖 Emergency Blood AI Online & Ready"}
            </h4>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: "400px", margin: "8px auto 20px" }}>
              {successStep === "verifying" && `Establishing authorized cryptographic session for ${activeUser?.full_name || "Coordinator"}...`}
              {successStep === "activating" && "Connecting with 6 hospital blood banks & 1,000 consented donor nodes..."}
              {successStep === "done" && "Identity confirmed. Opening Emergency Blood Command Center."}
            </p>

            <div className="auth-step-indicators">
              <div className={`auth-step-pill ${successStep === "verifying" || successStep === "activating" || successStep === "done" ? "active" : ""}`}>
                <CheckCircle2 size={14} /> 1. Identity Verified
              </div>
              <div className={`auth-step-pill ${successStep === "activating" || successStep === "done" ? "active" : ""}`}>
                <Sparkles size={14} /> 2. AI Initialized
              </div>
              <div className={`auth-step-pill ${successStep === "done" ? "active" : ""}`}>
                <ShieldCheck size={14} /> 3. Command Ready
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab-btn ${tab === "login" ? "active" : ""}`}
                onClick={() => { setTab("login"); setError(""); }}
              >
                <KeyRound size={15} />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${tab === "register" ? "active" : ""}`}
                onClick={() => { setTab("register"); setError(""); }}
              >
                <User size={15} />
                <span>Register Medical Account</span>
              </button>
            </div>

            {/* Quick Demo Access Bar */}
            <div className="auth-demo-bar">
              <div style={{ fontSize: "0.74rem", fontWeight: "700", color: "var(--cyan-accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                ⚡ Quick Clinical Demo Access (1-Click Fill)
              </div>
              <div className="auth-demo-buttons">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    className="auth-demo-pill"
                    onClick={() => handleSelectDemo(account)}
                    title={`Fill as ${account.name} (${account.org})`}
                  >
                    <span className="demo-pill-name">{account.name}</span>
                    <span className="demo-pill-role">{account.role}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="auth-error-banner">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            {tab === "login" && (
              <form onSubmit={handleLogin} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label">Official / Hospital Email</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      type="email"
                      className="auth-input"
                      placeholder="e.g. dr.arvind@apollo.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      type="password"
                      className="auth-input"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="auth-submit-row">
                  <button
                    type="submit"
                    className="btn btn-emergency auth-submit-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <span>Authorizing Access...</span>
                    ) : (
                      <>
                        <span>Authorize & Open Command Center</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* REGISTER FORM */}
            {tab === "register" && (
              <form onSubmit={handleRegister} className="auth-form">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="auth-field">
                    <label className="auth-label">Full Name & Title</label>
                    <div className="auth-input-wrap">
                      <User size={16} className="auth-input-icon" />
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="Dr. Samantha Sen"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">Official Email</label>
                    <div className="auth-input-wrap">
                      <Mail size={16} className="auth-input-icon" />
                      <input
                        type="email"
                        className="auth-input"
                        placeholder="samantha@hospital.org"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                  <div className="auth-field">
                    <label className="auth-label">Hospital / Institution</label>
                    <div className="auth-input-wrap">
                      <Building2 size={16} className="auth-input-icon" />
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="Apollo Hospitals Trauma Unit"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">Clinical Role</label>
                    <select
                      className="auth-select"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="Blood Bank Chief">Blood Bank Chief</option>
                      <option value="Emergency HOD">Emergency HOD</option>
                      <option value="Emergency Coordinator">Emergency Coordinator</option>
                      <option value="Trauma Surgeon">Trauma Surgeon</option>
                      <option value="Transfusion Specialist">Transfusion Specialist</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="auth-field">
                    <label className="auth-label">Password</label>
                    <div className="auth-input-wrap">
                      <Lock size={16} className="auth-input-icon" />
                      <input
                        type="password"
                        className="auth-input"
                        placeholder="Min. 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">Emergency Phone</label>
                    <div className="auth-input-wrap">
                      <Phone size={16} className="auth-input-icon" />
                      <input
                        type="tel"
                        className="auth-input"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <label className="auth-checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={authorizedConsent}
                    onChange={(e) => setAuthorizedConsent(e.target.checked)}
                  />
                  <span>
                    I confirm medical authorization for emergency transfusion coordination and decision-support under institutional protocols.
                  </span>
                </label>

                <div className="auth-submit-row">
                  <button
                    type="submit"
                    className="btn btn-emergency auth-submit-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <span>Registering & Initializing AI...</span>
                    ) : (
                      <>
                        <span>Complete Registration & Activate AI</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
