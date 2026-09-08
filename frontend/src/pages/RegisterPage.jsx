import React, { useState } from "react";
import {
  HeartHandshake,
  Building2,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  RotateCw,
  Droplet,
  CheckCircle2,
  Check,
  Heart,
  Calendar
} from "lucide-react";
import BloodDropIcon from "../components/BloodDropIcon";
import { api } from "../api/api";
import { navigate } from "../utils/router";

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

const DONOR_STEPS = [
  { step: 1, label: "Personal", name: "Personal Details" },
  { step: 2, label: "Contact", name: "Contact & Location" },
  { step: 3, label: "Blood & Donation", name: "Blood & Donation Details" },
  { step: 4, label: "Consent", name: "Consent & Health Declaration" },
  { step: 5, label: "Review", name: "Account & Review" }
];

export default function RegisterPage({ onAuthSuccess }) {
  // Role Selection: "donor" or "hospital"
  const [selectedRole, setSelectedRole] = useState("donor");

  // Donor 5-Step Wizard State
  const [donorStep, setDonorStep] = useState(1);

  // Common / Shared fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Donor-specific fields: Step 1 (Personal)
  const [donorName, setDonorName] = useState("");
  const [donorAge, setDonorAge] = useState("26");
  const [donorGender, setDonorGender] = useState("Male");

  // Donor-specific fields: Step 2 (Contact & Location)
  const [donorCity, setDonorCity] = useState("Hyderabad");
  const [donorArea, setDonorArea] = useState("Central");

  // Donor-specific fields: Step 3 (Blood & Donation)
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [isAvailable, setIsAvailable] = useState(true);
  const [hasDonatedBefore, setHasDonatedBefore] = useState(false);
  const [lastDonationPeriod, setLastDonationPeriod] = useState("Never");

  // Donor-specific fields: Step 4 (Consent & Health)
  const [emergencyConsent, setEmergencyConsent] = useState(true);
  const [healthDeclaration, setHealthDeclaration] = useState(true);
  const [eligibilityConfirmed, setEligibilityConfirmed] = useState(true);

  // Hospital-specific fields
  const [hospitalName, setHospitalName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [hospitalCity, setHospitalCity] = useState("Bangalore");
  const [licenseNumber, setLicenseNumber] = useState("");

  // Coordinates
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);

  // Status & Error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError("");
  };

  const handleNextStep = (e) => {
    if (e) e.preventDefault();
    setError("");

    if (donorStep === 1) {
      if (!donorName.trim() || donorName.trim().length < 2) {
        setError("Please enter your full legal name (minimum 2 characters).");
        return;
      }
    } else if (donorStep === 2) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length !== 10) {
        setError("Mobile phone number must be exactly 10 digits.");
        return;
      }
      if (email.trim() && !/\S+@\S+\.\S+/.test(email.trim())) {
        setError("Please enter a valid email address, or leave it blank.");
        return;
      }
      if (!donorCity.trim()) {
        setError("Please enter your city or town.");
        return;
      }
      if (!donorArea.trim()) {
        setError("Please enter your area or locality.");
        return;
      }
    } else if (donorStep === 3) {
      if (!bloodGroup) {
        setError("Please select your blood group.");
        return;
      }
    } else if (donorStep === 4) {
      if (!emergencyConsent) {
        setError("Please consent to receive emergency SOS transfusion requests.");
        return;
      }
      if (!healthDeclaration) {
        setError("Please confirm the health declaration to proceed.");
        return;
      }
    }

    setDonorStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    setError("");
    setDonorStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (selectedRole === "donor" && donorStep !== 5) {
      handleNextStep();
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      if (selectedRole === "donor") {
        const cleanPhone = phone.replace(/\D/g, "");
        if (cleanPhone.length !== 10) {
          setError("Mobile phone number must be exactly 10 digits");
          setLoading(false);
          return;
        }

        const payload = {
          role: "donor",
          full_name: donorName.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: cleanPhone,
          blood_group: bloodGroup,
          location_name: `${donorArea.trim()}, ${donorCity.trim()}`,
          latitude,
          longitude,
          is_available: isAvailable,
          donation_consent: emergencyConsent,
          emergency_contact_consent: emergencyConsent,
          medical_conditions: healthDeclaration ? null : "Declares pre-existing condition"
        };

        const res = await api.register(payload);
        if (res.success && res.token && res.user) {
          localStorage.setItem("hexavision_session_token", res.token);
          localStorage.setItem("hexavision_auth_user", JSON.stringify(res.user));
          if (onAuthSuccess) onAuthSuccess(res.user, res.token);
          // Automatically navigate to Donor Dashboard
          navigate("/donor/dashboard");
        } else {
          setError(res.message || "Donor registration failed");
        }
      } else {
        // Hospital registration
        if (!hospitalName.trim()) {
          setError("Please enter the hospital / institution name");
          setLoading(false);
          return;
        }

        const payload = {
          role: "hospital",
          hospital_name: hospitalName.trim(),
          contact_person: contactPerson.trim() || hospitalName.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim() || "+91 80 2000 0000",
          address: `${hospitalAddress}, ${hospitalCity}`,
          latitude,
          longitude,
          verified: true
        };

        const res = await api.register(payload);
        if (res.success && res.token && res.user) {
          localStorage.setItem("hexavision_session_token", res.token);
          localStorage.setItem("hexavision_auth_user", JSON.stringify(res.user));
          if (onAuthSuccess) onAuthSuccess(res.user, res.token);
          // Automatically navigate to Hospital Dashboard
          navigate("/hospital/dashboard");
        } else {
          setError(res.message || "Hospital registration failed");
        }
      }
    } catch (err) {
      setError(err.message || "Registration failed. Please check your details.");
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
        maxWidth: "640px",
        width: "100%",
        background: "rgba(11, 20, 38, 0.85)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "20px",
        padding: "36px",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)"
      }}>
        {/* Header / Brand */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
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

          <h2 style={{ fontSize: "1.6rem", fontWeight: "800", color: "#ffffff", marginTop: "8px" }}>
            Create Account
          </h2>
          <p style={{ fontSize: "0.86rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Select your role to connect to the intelligent emergency blood network
          </p>
        </div>

        {/* ==================================================== */}
        {/* ROLE SELECTION UI (DONOR vs HOSPITAL)                */}
        {/* ==================================================== */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{
            fontSize: "0.82rem",
            fontWeight: "700",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "10px",
            textAlign: "center"
          }}>
            I am registering as:
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            padding: "6px",
            background: "rgba(6, 9, 17, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px"
          }}>
            <button
              type="button"
              id="role-btn-donor"
              onClick={() => handleRoleChange("donor")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "16px 12px",
                borderRadius: "10px",
                border: selectedRole === "donor" ? "2px solid #ff2a55" : "1px solid transparent",
                background: selectedRole === "donor" ? "rgba(255, 42, 85, 0.16)" : "transparent",
                color: selectedRole === "donor" ? "#ffffff" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              <HeartHandshake size={24} color={selectedRole === "donor" ? "#ff2a55" : "currentColor"} />
              <div style={{ fontWeight: "800", fontSize: "0.98rem" }}>DONOR</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Voluntary Blood Donor
              </div>
            </button>

            <button
              type="button"
              id="role-btn-hospital"
              onClick={() => handleRoleChange("hospital")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "16px 12px",
                borderRadius: "10px",
                border: selectedRole === "hospital" ? "2px solid var(--cyan-accent)" : "1px solid transparent",
                background: selectedRole === "hospital" ? "rgba(0, 242, 254, 0.14)" : "transparent",
                color: selectedRole === "hospital" ? "#ffffff" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              <Building2 size={24} color={selectedRole === "hospital" ? "var(--cyan-accent)" : "currentColor"} />
              <div style={{ fontWeight: "800", fontSize: "0.98rem" }}>HOSPITAL</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Blood Bank / Medical Center
              </div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: "rgba(255, 42, 85, 0.12)",
            border: "1px solid rgba(255, 42, 85, 0.4)",
            borderRadius: "10px",
            padding: "12px 14px",
            marginBottom: "20px",
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

        {/* ==================================================== */}
        {/* REGISTRATION FORM                                    */}
        {/* ==================================================== */}
        <form onSubmit={handleSubmit}>
          {/* ==================================================== */}
          {/* DONOR 5-STEP WIZARD PROGRESS BAR                     */}
          {/* ==================================================== */}
          {selectedRole === "donor" && (
            <div style={{ marginBottom: "24px" }}>
              {/* Stepper Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ fontSize: "0.74rem", fontWeight: "800", color: "#ff4d6d", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  DONOR REGISTRATION WIZARD
                </div>
                <div style={{ fontSize: "0.74rem", fontWeight: "700", color: "var(--text-muted)" }}>
                  Step {donorStep} of 5: <span style={{ color: "#ffffff" }}>{DONOR_STEPS[donorStep - 1].name}</span>
                </div>
              </div>

              {/* Progress Indicator Bar */}
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                position: "relative",
                padding: "0 6px"
              }}>
                {/* Connector Line Background */}
                <div style={{
                  position: "absolute",
                  top: "16px",
                  left: "20px",
                  right: "20px",
                  height: "2px",
                  background: "rgba(255, 255, 255, 0.08)",
                  zIndex: 1
                }} />
                {/* Active Filled Connector Line */}
                <div style={{
                  position: "absolute",
                  top: "16px",
                  left: "20px",
                  width: `${((donorStep - 1) / 4) * 88}%`,
                  height: "2px",
                  background: "linear-gradient(90deg, #ff2a55, #ff7e40)",
                  zIndex: 2,
                  transition: "width 0.3s ease"
                }} />

                {DONOR_STEPS.map((s) => {
                  const isCurrent = s.step === donorStep;
                  const isCompleted = s.step < donorStep;
                  const isUpcoming = s.step > donorStep;

                  return (
                    <div
                      key={s.step}
                      id={`donor-step-indicator-${s.step}`}
                      onClick={() => {
                        if (isCompleted) setDonorStep(s.step);
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        position: "relative",
                        zIndex: 3,
                        cursor: isCompleted ? "pointer" : "default",
                        minWidth: "56px"
                      }}
                    >
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "800",
                        fontSize: "0.82rem",
                        background: isCurrent
                          ? "linear-gradient(135deg, #ff2a55 0%, #b91c1c 100%)"
                          : isCompleted
                          ? "#10b981"
                          : "rgba(15, 23, 42, 0.9)",
                        color: isCurrent || isCompleted ? "#ffffff" : "var(--text-muted)",
                        border: isCurrent
                          ? "2px solid #ff4d6d"
                          : isCompleted
                          ? "2px solid #10b981"
                          : "2px solid rgba(255, 255, 255, 0.15)",
                        boxShadow: isCurrent ? "0 0 12px rgba(255, 42, 85, 0.6)" : isCompleted ? "0 0 8px rgba(16, 185, 129, 0.3)" : "none",
                        transition: "all 0.25s ease"
                      }}>
                        {isCompleted ? <Check size={16} strokeWidth={3} /> : s.step}
                      </div>
                      <span style={{
                        fontSize: "0.72rem",
                        fontWeight: isCurrent ? "800" : "600",
                        color: isCurrent ? "#ffffff" : isCompleted ? "#10b981" : "var(--text-muted)",
                        marginTop: "6px",
                        textAlign: "center"
                      }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 1: PERSONAL DETAILS                             */}
          {/* ==================================================== */}
          {selectedRole === "donor" && donorStep === 1 && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", fontWeight: "800", color: "#ffffff" }}>
                  Step 1: Personal Details
                </h3>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Enter your official legal identity for verified emergency blood donation.
                </p>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                  Full Legal Name *
                </label>
                <div className="auth-input-wrap">
                  <User size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Rahul Varma"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Age (18 – 65)
                  </label>
                  <div className="auth-input-wrap">
                    <Calendar size={16} className="auth-input-icon" />
                    <input
                      type="number"
                      min={18}
                      max={65}
                      className="auth-input"
                      placeholder="26"
                      value={donorAge}
                      onChange={(e) => setDonorAge(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Biological Gender
                  </label>
                  <div className="auth-input-wrap">
                    <Heart size={16} className="auth-input-icon" color="#ff2a55" />
                    <select
                      className="auth-select"
                      style={{ paddingLeft: "38px" }}
                      value={donorGender}
                      onChange={(e) => setDonorGender(e.target.value)}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other / Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 2: CONTACT & LOCATION                           */}
          {/* ==================================================== */}
          {selectedRole === "donor" && donorStep === 2 && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", fontWeight: "800", color: "#ffffff" }}>
                  Step 2: Contact & Location
                </h3>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  How emergency dispatch coordinators will reach you during critical matches.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    10-Digit Mobile Phone *
                  </label>
                  <div className="auth-input-wrap">
                    <Phone size={16} className="auth-input-icon" />
                    <input
                      type="tel"
                      className="auth-input"
                      placeholder="9876543210"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Email Address (Optional)
                  </label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      type="email"
                      className="auth-input"
                      placeholder="rahul@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    City / Town *
                  </label>
                  <div className="auth-input-wrap">
                    <MapPin size={16} className="auth-input-icon" />
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="e.g. Hyderabad"
                      value={donorCity}
                      onChange={(e) => setDonorCity(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Area / Locality *
                  </label>
                  <div className="auth-input-wrap">
                    <MapPin size={16} className="auth-input-icon" />
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="e.g. Banjara Hills / Hitec City"
                      value={donorArea}
                      onChange={(e) => setDonorArea(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 3: BLOOD & DONATION DETAILS                     */}
          {/* ==================================================== */}
          {selectedRole === "donor" && donorStep === 3 && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", fontWeight: "800", color: "#ffffff" }}>
                  Step 3: Blood & Donation Details
                </h3>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Select your blood group and declare your readiness to donate.
                </p>
              </div>

              {/* Blood Group Selection Grid */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Select Blood Group *
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                  {BLOOD_GROUPS.map((bg) => {
                    const isSelected = bloodGroup === bg;
                    return (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => setBloodGroup(bg)}
                        style={{
                          padding: "12px 6px",
                          borderRadius: "8px",
                          border: isSelected ? "2px solid #ff2a55" : "1px solid rgba(255, 255, 255, 0.1)",
                          background: isSelected ? "rgba(255, 42, 85, 0.2)" : "rgba(15, 23, 42, 0.6)",
                          color: isSelected ? "#ffffff" : "var(--text-muted)",
                          fontWeight: "800",
                          fontSize: "1rem",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {bg}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Initial Availability Toggle */}
              <div style={{
                background: "rgba(255, 42, 85, 0.05)",
                border: "1px solid rgba(255, 42, 85, 0.25)",
                borderRadius: "10px",
                padding: "14px",
                marginBottom: "16px"
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                  />
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#ffffff", fontWeight: "700" }}>
                      Initial Status: Available for Immediate Blood Donation
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      You can toggle availability off anytime from your donor dashboard.
                    </div>
                  </div>
                </label>
              </div>

              {/* Donation History */}
              <div style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                padding: "14px"
              }}>
                <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Have you donated blood before?
                </div>
                <div style={{ display: "flex", gap: "10px", marginBottom: hasDonatedBefore ? "10px" : "0" }}>
                  <button
                    type="button"
                    onClick={() => setHasDonatedBefore(false)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: !hasDonatedBefore ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.1)",
                      background: !hasDonatedBefore ? "rgba(16, 185, 129, 0.15)" : "transparent",
                      color: !hasDonatedBefore ? "#ffffff" : "var(--text-muted)",
                      fontSize: "0.8rem",
                      fontWeight: "700",
                      cursor: "pointer"
                    }}
                  >
                    First-Time Donor
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasDonatedBefore(true)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: hasDonatedBefore ? "1px solid var(--cyan-accent)" : "1px solid rgba(255,255,255,0.1)",
                      background: hasDonatedBefore ? "rgba(0, 242, 254, 0.15)" : "transparent",
                      color: hasDonatedBefore ? "#ffffff" : "var(--text-muted)",
                      fontSize: "0.8rem",
                      fontWeight: "700",
                      cursor: "pointer"
                    }}
                  >
                    Previous Donor
                  </button>
                </div>

                {hasDonatedBefore && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                      When was your last donation?
                    </label>
                    <select
                      className="auth-select"
                      value={lastDonationPeriod}
                      onChange={(e) => setLastDonationPeriod(e.target.value)}
                    >
                      <option value="Over 6 months ago">Over 6 months ago (Eligible)</option>
                      <option value="3 - 6 months ago">3 to 6 months ago (Eligible)</option>
                      <option value="Less than 3 months ago">Less than 3 months ago (Waiting period)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 4: CONSENT & HEALTH DECLARATION                 */}
          {/* ==================================================== */}
          {selectedRole === "donor" && donorStep === 4 && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", fontWeight: "800", color: "#ffffff" }}>
                  Step 4: Consent & Health Declaration
                </h3>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Required declarations to ensure patient safety and autonomous donor rights.
                </p>
              </div>

              {/* Consent 1: Emergency SOS */}
              <div style={{
                background: "rgba(255, 42, 85, 0.05)",
                border: "1px solid rgba(255, 42, 85, 0.25)",
                borderRadius: "10px",
                padding: "14px",
                marginBottom: "12px"
              }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={emergencyConsent}
                    onChange={(e) => setEmergencyConsent(e.target.checked)}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#ffffff", fontWeight: "700" }}>
                      Consent to receive emergency SOS transfusion requests *
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px", lineHeight: 1.4 }}>
                      I agree to be notified via phone and SMS when a verified hospital in my locality needs my matching blood group for a life-saving emergency.
                    </div>
                  </div>
                </label>
              </div>

              {/* Declaration 2: Health declaration */}
              <div style={{
                background: "rgba(16, 185, 129, 0.05)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "10px",
                padding: "14px",
                marginBottom: "12px"
              }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={healthDeclaration}
                    onChange={(e) => setHealthDeclaration(e.target.checked)}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#ffffff", fontWeight: "700" }}>
                      Health Declaration *
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px", lineHeight: 1.4 }}>
                      "I declare I am feeling healthy, well, and free of recent acute infections."
                    </div>
                  </div>
                </label>
              </div>

              {/* Declaration 3: Minimum weight & safety */}
              <div style={{
                background: "rgba(0, 242, 254, 0.05)",
                border: "1px solid rgba(0, 242, 254, 0.25)",
                borderRadius: "10px",
                padding: "14px"
              }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={eligibilityConfirmed}
                    onChange={(e) => setEligibilityConfirmed(e.target.checked)}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#ffffff", fontWeight: "700" }}>
                      Standard Eligibility Confirmation
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px", lineHeight: 1.4 }}>
                      I confirm I weigh at least 50 kg, have no active hepatitis or HIV, and have not had a major surgical operation or tattoo in the past 6 months.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 5: ACCOUNT & REVIEW                             */}
          {/* ==================================================== */}
          {selectedRole === "donor" && donorStep === 5 && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", fontWeight: "800", color: "#ffffff" }}>
                  Step 5: Account & Review
                </h3>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Set your portal password and review all entered donor details before final registration.
                </p>
              </div>

              {/* Password Inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Password *
                  </label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      type="password"
                      className="auth-input"
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Confirm Password *
                  </label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      type="password"
                      className="auth-input"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Complete Registration Summary / Review */}
              <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(0, 242, 254, 0.35)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "16px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: "800", color: "var(--cyan-accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Donor Profile Summary Review
                  </div>
                  <button
                    type="button"
                    onClick={() => setDonorStep(1)}
                    style={{ background: "none", border: "none", color: "var(--cyan-accent)", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline" }}
                  >
                    Edit Details
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.82rem" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Full Legal Name:</span>{" "}
                    <strong style={{ color: "#ffffff" }}>{donorName || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Blood Group:</span>{" "}
                    <strong style={{ color: "#ff4d6d", background: "rgba(255,42,85,0.15)", padding: "1px 6px", borderRadius: "4px" }}>
                      {bloodGroup}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Mobile Phone:</span>{" "}
                    <strong style={{ color: "#ffffff" }}>+91 {phone || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Email:</span>{" "}
                    <strong style={{ color: "#ffffff" }}>{email || "Not specified"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Location:</span>{" "}
                    <strong style={{ color: "#ffffff" }}>{donorArea}, {donorCity}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Initial Status:</span>{" "}
                    <strong style={{ color: isAvailable ? "var(--status-available)" : "#64748b" }}>
                      {isAvailable ? "Available to Donate" : "Standby"}
                    </strong>
                  </div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "6px", color: "#10b981", fontSize: "0.76rem", fontWeight: "700", marginTop: "4px" }}>
                    <CheckCircle2 size={14} /> Emergency SOS Transfusion Notifications: Granted
                  </div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "6px", color: "#10b981", fontSize: "0.76rem", fontWeight: "700" }}>
                    <CheckCircle2 size={14} /> Health Declaration: Declared healthy & infection-free
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* HOSPITAL REGISTRATION FIELDS (UNCHANGED)             */}
          {/* ==================================================== */}
          {selectedRole === "hospital" && (
            <>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                  Hospital / Institution Name *
                </label>
                <div className="auth-input-wrap">
                  <Building2 size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Apollo Hospitals - Bannerghatta"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Contact Person / HOD *
                  </label>
                  <div className="auth-input-wrap">
                    <User size={16} className="auth-input-icon" />
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="Dr. Blood Bank Chief"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Hospital Phone *
                  </label>
                  <div className="auth-input-wrap">
                    <Phone size={16} className="auth-input-icon" />
                    <input
                      type="tel"
                      className="auth-input"
                      placeholder="+91 80 2630 4050"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Hospital Email (Login ID) *
                  </label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      type="email"
                      className="auth-input"
                      placeholder="bloodbank@hospital.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    License / NABH Reg. Number
                  </label>
                  <div className="auth-input-wrap">
                    <ShieldCheck size={16} className="auth-input-icon" />
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="NABH-BB-2024-089"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Password *
                  </label>
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

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Confirm Password *
                  </label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      type="password"
                      className="auth-input"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Street Address *
                  </label>
                  <div className="auth-input-wrap">
                    <MapPin size={16} className="auth-input-icon" />
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="154/11 Bannerghatta Road"
                      value={hospitalAddress}
                      onChange={(e) => setHospitalAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    City
                  </label>
                  <div className="auth-input-wrap">
                    <MapPin size={16} className="auth-input-icon" />
                    <input
                      type="text"
                      className="auth-input"
                      value={hospitalCity}
                      onChange={(e) => setHospitalCity(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ==================================================== */}
          {/* WIZARD BUTTONS & ACTION CONTROLS                     */}
          {/* ==================================================== */}
          {selectedRole === "donor" ? (
            <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
              {donorStep > 1 && (
                <button
                  type="button"
                  id="btn-donor-back"
                  className="btn btn-secondary"
                  onClick={handlePrevStep}
                  style={{
                    flex: 1,
                    padding: "13px",
                    justifyContent: "center",
                    fontWeight: "700",
                    borderRadius: "10px"
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
              )}

              {donorStep < 5 ? (
                <button
                  type="button"
                  id="btn-donor-next"
                  className="btn btn-emergency"
                  onClick={handleNextStep}
                  style={{
                    flex: donorStep > 1 ? 2 : 1,
                    width: "100%",
                    padding: "13px",
                    justifyContent: "center",
                    fontWeight: "700",
                    borderRadius: "10px"
                  }}
                >
                  <span>Next: {DONOR_STEPS[donorStep].label}</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  id="btn-register-submit"
                  className="btn btn-emergency"
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: "13px",
                    justifyContent: "center",
                    fontWeight: "700",
                    borderRadius: "10px"
                  }}
                >
                  {loading ? (
                    <>
                      <RotateCw size={18} className="spin" />
                      <span>Creating Donor Account...</span>
                    </>
                  ) : (
                    <>
                      <span>REGISTER AS DONOR</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div style={{ marginTop: "24px" }}>
              <button
                type="submit"
                id="btn-register-submit"
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
                    <span>Creating HOSPITAL Account...</span>
                  </>
                ) : (
                  <>
                    <span>Register as HOSPITAL</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}
        </form>

        {/* Footer Link */}
        <div style={{ marginTop: "24px", textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Already registered?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
              background: "none",
              border: "none",
              color: "var(--cyan-accent)",
              fontWeight: "700",
              cursor: "pointer",
              textDecoration: "underline"
            }}
          >
            Sign In to your Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
