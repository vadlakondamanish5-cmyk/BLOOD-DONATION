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
  KeyRound,
  RotateCw,
  HeartHandshake
} from "lucide-react";
import BloodDropIcon from "./BloodDropIcon";
import { api } from "../api/api";

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  onNavigateToDonorRegister
}) {
  // Main account category: "medical" | "donor"
  const [accountType, setAccountType] = useState("medical");

  // Medical sub-tab: "login" | "register"
  const [medicalTab, setMedicalTab] = useState("login");

  // Donor sub-tab: "register" | "signin"
  const [donorTab, setDonorTab] = useState("register");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successStep, setSuccessStep] = useState(null); // null | "verifying" | "activating" | "done"
  const [activeUser, setActiveUser] = useState(null);

  // Medical Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("Apollo Hospitals - Bannerghatta");
  const [role, setRole] = useState("Blood Bank Chief");
  const [phone, setPhone] = useState("");
  const [authorizedConsent, setAuthorizedConsent] = useState(true);

  // Donor Login Form states
  const [donorPhone, setDonorPhone] = useState("");
  const [donorOtp, setDonorOtp] = useState("");
  const [donorOtpSent, setDonorOtpSent] = useState(false);
  const [donorOtpCooldown, setDonorOtpCooldown] = useState(0);
  const [donorSendingOtp, setDonorSendingOtp] = useState(false);
  const [donorOtpMsg, setDonorOtpMsg] = useState("");
  const [donorDevOtp, setDonorDevOtp] = useState("");

  // Cooldown timer
  React.useEffect(() => {
    if (donorOtpCooldown <= 0) return undefined;
    const t = setInterval(() => {
      setDonorOtpCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [donorOtpCooldown]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
    setAccountType("medical");
    setMedicalTab("login");
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  };

  const runMedicalActivation = (user, token) => {
    setActiveUser(user);
    setSuccessStep("verifying");

    setTimeout(() => {
      setSuccessStep("activating");
      setTimeout(() => {
        setSuccessStep("done");
        setTimeout(() => {
          onAuthSuccess(user, token, "MEDICAL");
          onClose();
          setSuccessStep(null);
          setLoading(false);
        }, 800);
      }, 900);
    }, 700);
  };

  const handleMedicalLogin = async (e) => {
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
        runMedicalActivation(res.user, res.token);
      } else {
        setError(res.message || "Authentication failed");
        setLoading(false);
      }
    } catch (err) {
      const normEmail = email.trim().toLowerCase();
      const matchedDemo = demoAccounts.find((d) => d.email.toLowerCase() === normEmail);
      if (matchedDemo) {
        const fallbackUser = {
          id: 1,
          full_name: matchedDemo.name,
          email: matchedDemo.email,
          role: matchedDemo.role,
          organization: matchedDemo.org,
          accountType: "MEDICAL"
        };
        const token = `hexavision-session-demo-${Date.now()}`;
        localStorage.setItem("hexavision_auth_user", JSON.stringify(fallbackUser));
        localStorage.setItem("hexavision_session_token", token);
        runMedicalActivation(fallbackUser, token);
        return;
      }
      setError(err.message || "Failed to sign in. Please verify credentials.");
      setLoading(false);
    }
  };

  const handleMedicalRegister = async (e) => {
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
        runMedicalActivation(res.user, res.token);
      } else {
        setError(res.message || "Registration failed");
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || "Registration encountered an error");
      setLoading(false);
    }
  };

  // Donor sign-in: send OTP
  const handleSendDonorLoginOtp = async () => {
    const cleanPhone = donorPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setDonorSendingOtp(true);
    setDonorOtpMsg("");

    try {
      const res = await api.sendDonorLoginOtp(cleanPhone);
      if (res.success) {
        setDonorOtpSent(true);
        setDonorOtpMsg(res.message || `Login OTP sent to +91 ${cleanPhone}`);
        setDonorOtpCooldown(res.cooldown || 30);
        if (res.dev_otp) setDonorDevOtp(res.dev_otp);
      } else {
        setError(res.message || "Failed to send OTP");
      }
    } catch (err) {
      setError(err.message || "No donor account found with this phone. Please register as a donor.");
    } finally {
      setDonorSendingOtp(false);
    }
  };

  // Donor sign-in: verify OTP and log in
  const handleVerifyDonorLogin = async (e) => {
    e?.preventDefault();
    setError("");
    const cleanPhone = donorPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    if (!donorOtp || donorOtp.trim().length < 4) {
      setError("Please enter the received OTP");
      return;
    }

    try {
      setLoading(true);
      const res = await api.verifyDonorLogin(cleanPhone, donorOtp.trim());
      if (res.success) {
        const donorUser = {
          ...(res.donor || res.user),
          accountType: "DONOR",
          role: "DONOR",
          donorRegistered: true
        };
        localStorage.setItem("hexavision_auth_user", JSON.stringify(donorUser));
        localStorage.setItem("hexavision_session_token", res.token);
        localStorage.setItem("hexavision_account_type", "DONOR");
        setLoading(false);
        onClose();
        // Donor login routes directly to Home Page per requirements
        onAuthSuccess(donorUser, res.token, "DONOR");
      } else {
        setError(res.message || "Invalid OTP");
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || "Verification failed. Please check OTP.");
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card auth-modal-card"
        style={{ maxWidth: "580px", width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
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
                <span className={accountType === "medical" ? "auth-badge-medical" : "auth-badge-donor"}>
                  <ShieldCheck size={12} />
                  {accountType === "medical" ? "CLINICAL" : "DONOR"}
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Select account type for emergency blood matching and coordination
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

        {/* PRIMARY ACCOUNT TYPE SELECTOR: MEDICAL vs DONOR */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "16px",
          padding: "4px",
          background: "rgba(11, 20, 38, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "10px"
        }}>
          <button
            type="button"
            id="btn-account-type-medical"
            onClick={() => { setAccountType("medical"); setError(""); }}
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: accountType === "medical" ? "1px solid rgba(0, 242, 254, 0.5)" : "1px solid transparent",
              background: accountType === "medical" ? "rgba(0, 242, 254, 0.12)" : "transparent",
              color: accountType === "medical" ? "var(--cyan-accent)" : "var(--text-muted)",
              fontWeight: accountType === "medical" ? "700" : "500",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <Building2 size={16} />
            <span>A. Medical Account</span>
          </button>

          <button
            type="button"
            id="btn-account-type-donor"
            onClick={() => { setAccountType("donor"); setError(""); }}
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: accountType === "donor" ? "1px solid rgba(255, 42, 85, 0.5)" : "1px solid transparent",
              background: accountType === "donor" ? "rgba(255, 42, 85, 0.15)" : "transparent",
              color: accountType === "donor" ? "#ffffff" : "var(--text-muted)",
              fontWeight: accountType === "donor" ? "700" : "500",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <HeartHandshake size={16} color={accountType === "donor" ? "#ff2a55" : "currentColor"} />
            <span>B. Donor Registration</span>
          </button>
        </div>

        {/* AI Activation Progression Sequence (Clinical Users) */}
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
              {successStep === "verifying" && `Establishing authorized session for ${activeUser?.full_name || "Coordinator"}...`}
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
            {error && (
              <div className="auth-error-banner" style={{ marginBottom: "14px" }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* ==================================================== */}
            {/* OPTION A: MEDICAL ACCOUNT INTERFACE                 */}
            {/* ==================================================== */}
            {accountType === "medical" && (
              <>
                {/* Tabs: Sign In, Register Medical Account, AND Register as Donor placed beside it */}
                <div className="auth-tabs" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                  <button
                    type="button"
                    className={`auth-tab-btn ${medicalTab === "login" ? "active" : ""}`}
                    onClick={() => { setMedicalTab("login"); setError(""); }}
                    style={{ fontSize: "0.78rem", padding: "8px 10px" }}
                  >
                    <KeyRound size={14} />
                    <span>Sign In</span>
                  </button>

                  <button
                    type="button"
                    className={`auth-tab-btn ${medicalTab === "register" ? "active" : ""}`}
                    onClick={() => { setMedicalTab("register"); setError(""); }}
                    style={{ fontSize: "0.78rem", padding: "8px 10px" }}
                  >
                    <User size={14} />
                    <span>Register Medical</span>
                  </button>

                  {/* Register as Donor placed beside Register Medical Account */}
                  <button
                    type="button"
                    id="btn-tab-register-donor"
                    className="auth-tab-btn"
                    onClick={() => {
                      onClose();
                      if (onNavigateToDonorRegister) onNavigateToDonorRegister();
                    }}
                    style={{
                      fontSize: "0.78rem",
                      padding: "8px 10px",
                      borderColor: "rgba(255, 42, 85, 0.4)",
                      color: "#ff4d6d"
                    }}
                    title="Register as a blood donor"
                  >
                    <HeartHandshake size={14} color="#ff2a55" />
                    <span>Register as Donor</span>
                  </button>
                </div>

                {/* Quick Clinical Demo Access Bar */}
                <div className="auth-demo-bar" style={{ marginTop: "12px" }}>
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

                {/* MEDICAL SIGN IN FORM */}
                {medicalTab === "login" && (
                  <form onSubmit={handleMedicalLogin} className="auth-form" style={{ marginTop: "14px" }}>
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
                          <span>Authorizing Clinical Access...</span>
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

                {/* MEDICAL REGISTER FORM */}
                {medicalTab === "register" && (
                  <form onSubmit={handleMedicalRegister} className="auth-form" style={{ marginTop: "14px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
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

                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
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

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
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
                        I confirm medical authorization for emergency transfusion coordination and decision-support.
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

            {/* ==================================================== */}
            {/* OPTION B: DONOR REGISTRATION / DONOR ACCOUNT        */}
            {/* ==================================================== */}
            {accountType === "donor" && (
              <div style={{ marginTop: "6px" }}>
                {/* Donor Sub-tabs */}
                <div className="auth-tabs" style={{ marginBottom: "14px" }}>
                  <button
                    type="button"
                    className={`auth-tab-btn ${donorTab === "register" ? "active" : ""}`}
                    onClick={() => { setDonorTab("register"); setError(""); }}
                  >
                    <HeartHandshake size={15} />
                    <span>Register as Donor (New)</span>
                  </button>
                  <button
                    type="button"
                    className={`auth-tab-btn ${donorTab === "signin" ? "active" : ""}`}
                    onClick={() => { setDonorTab("signin"); setError(""); }}
                  >
                    <KeyRound size={15} />
                    <span>Sign In as Donor</span>
                  </button>
                </div>

                {/* NEW DONOR REGISTRATION OPTION */}
                {donorTab === "register" && (
                  <div style={{
                    background: "rgba(255, 42, 85, 0.08)",
                    border: "1px solid rgba(255, 42, 85, 0.35)",
                    borderRadius: "12px",
                    padding: "20px",
                    textAlign: "center"
                  }}>
                    <div
                      style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "50%",
                        background: "rgba(255, 42, 85, 0.18)",
                        border: "1px solid rgba(255, 42, 85, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 12px",
                        color: "#ff2a55"
                      }}
                    >
                      <BloodDropIcon size={26} color="#ff2a55" variant="filled" />
                    </div>

                    <h4 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff", marginBottom: "6px" }}>
                      Voluntary Blood Donor Registration
                    </h4>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", maxWidth: "420px", margin: "0 auto 18px", lineHeight: "1.5" }}>
                      Join the HexaVision emergency donor network with verified consent, medical pre-screening, and GPS proximity matching.
                    </p>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      gap: "4px",
                      marginBottom: "20px",
                      fontSize: "0.72rem",
                      color: "var(--text-muted)"
                    }}>
                      <div style={{ background: "rgba(255,255,255,0.04)", padding: "6px 2px", borderRadius: "6px" }}>
                        <div style={{ fontWeight: "700", color: "#ff4d6d" }}>1</div> Personal
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.04)", padding: "6px 2px", borderRadius: "6px" }}>
                        <div style={{ fontWeight: "700", color: "#ff4d6d" }}>2</div> Blood & GPS
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.04)", padding: "6px 2px", borderRadius: "6px" }}>
                        <div style={{ fontWeight: "700", color: "#ff4d6d" }}>3</div> Donation
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.04)", padding: "6px 2px", borderRadius: "6px" }}>
                        <div style={{ fontWeight: "700", color: "#ff4d6d" }}>4</div> Screening
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.04)", padding: "6px 2px", borderRadius: "6px" }}>
                        <div style={{ fontWeight: "700", color: "#ff4d6d" }}>5</div> Consent
                      </div>
                    </div>

                    <button
                      type="button"
                      id="btn-modal-register-donor-direct"
                      className="btn btn-emergency"
                      style={{ width: "100%", justifyContent: "center", padding: "12px" }}
                      onClick={() => {
                        onClose();
                        if (onNavigateToDonorRegister) onNavigateToDonorRegister();
                      }}
                    >
                      <HeartHandshake size={18} />
                      <span>Start 5-Step Donor Registration</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                {/* RETURNING DONOR SIGN IN WITH PHONE & OTP */}
                {donorTab === "signin" && (
                  <form onSubmit={handleVerifyDonorLogin} className="auth-form">
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "14px" }}>
                      Sign in using your registered 10-digit mobile phone number to view your donor profile and eligibility status.
                    </p>

                    <div className="auth-field">
                      <label className="auth-label">Registered Mobile Number (10 Digits)</label>
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
                            style={{ paddingLeft: "48px" }}
                            placeholder="9876543210"
                            maxLength={10}
                            value={donorPhone}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setDonorPhone(clean);
                              setDonorOtpSent(false);
                            }}
                            required
                          />
                        </div>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={handleSendDonorLoginOtp}
                          disabled={donorPhone.replace(/\D/g, "").length !== 10 || donorSendingOtp || donorOtpCooldown > 0}
                          style={{ minWidth: "105px", whiteSpace: "nowrap" }}
                        >
                          {donorSendingOtp ? (
                            <RotateCw size={14} className="spin" />
                          ) : donorOtpCooldown > 0 ? (
                            <span>Wait {donorOtpCooldown}s</span>
                          ) : (
                            <span>{donorOtpSent ? "Resend" : "Send OTP"}</span>
                          )}
                        </button>
                      </div>
                    </div>

                    {donorOtpSent && (
                      <div style={{
                        background: "rgba(0, 242, 254, 0.05)",
                        border: "1px solid rgba(0, 242, 254, 0.25)",
                        borderRadius: "8px",
                        padding: "12px",
                        marginTop: "10px"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "0.78rem", color: "var(--cyan-accent)", fontWeight: "600" }}>
                            {donorOtpMsg || `OTP sent to +91 ${donorPhone}`}
                          </span>
                          {donorDevOtp && (
                            <span style={{ fontSize: "0.72rem", background: "rgba(0, 242, 254, 0.15)", padding: "2px 6px", borderRadius: "4px", color: "var(--cyan-accent)", fontFamily: "monospace" }}>
                              Demo OTP: {donorDevOtp}
                            </span>
                          )}
                        </div>

                        <div className="auth-field" style={{ marginBottom: 0 }}>
                          <label className="auth-label">Enter 6-Digit Login OTP</label>
                          <div className="auth-input-wrap">
                            <KeyRound size={16} className="auth-input-icon" />
                            <input
                              type="text"
                              className="auth-input"
                              placeholder="123456"
                              maxLength={6}
                              value={donorOtp}
                              onChange={(e) => setDonorOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              style={{ letterSpacing: "0.2em", fontWeight: "700" }}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="auth-submit-row" style={{ marginTop: "16px" }}>
                      <button
                        type="submit"
                        className="btn btn-emergency auth-submit-btn"
                        disabled={loading || !donorOtpSent || donorOtp.length < 4}
                      >
                        {loading ? (
                          <span>Verifying & Signing In...</span>
                        ) : (
                          <>
                            <span>Sign In to Donor Profile</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
