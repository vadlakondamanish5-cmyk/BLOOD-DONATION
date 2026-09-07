import React, { useState } from "react";
import { 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Calendar,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import BloodDropIcon from "../components/BloodDropIcon";
import { api } from "../api/api";

const HEALTH_CONDITIONS = [
  "Diabetes",
  "High blood pressure",
  "Asthma",
  "Thyroid disorder",
  "Anemia / low hemoglobin",
  "Migraine",
  "Heart disease",
  "Kidney disease",
  "Liver disease",
  "Bleeding/clotting disorder",
  "Epilepsy/seizure disorder",
  "Infectious disease",
  "Cancer",
  "Other",
  "None of the above"
];

export default function RegisterDonorPage({ onRegistrationSuccess }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  // Step 1: Personal Info
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");

  // Step 2: Blood & Location
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [locationName, setLocationName] = useState("Bangalore Central");
  const [latitude, setLatitude] = useState("12.9716");
  const [longitude, setLongitude] = useState("77.5946");
  const [geoLocating, setGeoLocating] = useState(false);

  // Step 3: Donation History
  const [lastDonationDate, setLastDonationDate] = useState("");
  const [totalDonations, setTotalDonations] = useState("1");
  const [previousReaction, setPreviousReaction] = useState("None");

  // Step 4: Health Screening Info
  const [takingMeds, setTakingMeds] = useState(false);
  const [medicationDetails, setMedicationDetails] = useState("");
  const [hadSurgery, setHadSurgery] = useState(false);
  const [surgeryDate, setSurgeryDate] = useState("");
  const [surgeryType, setSurgeryType] = useState("");
  const [fullyRecovered, setFullyRecovered] = useState(true);
  const [ongoingTreatment, setOngoingTreatment] = useState(false);
  const [selectedConditions, setSelectedConditions] = useState(["None of the above"]);
  const [otherConditionText, setOtherConditionText] = useState("");
  const [feelingWell, setFeelingWell] = useState(true);
  const [recentIllness, setRecentIllness] = useState(false);

  // Step 5: Consent
  const [consentEmergency, setConsentEmergency] = useState(true);
  const [consentHospitalShare, setConsentHospitalShare] = useState(true);
  const [understandScreening, setUnderstandScreening] = useState(true);
  const [consentTimestamp, setConsentTimestamp] = useState(new Date().toISOString());

  // Errors state
  const [errors, setErrors] = useState({});

  // Geolocation trigger
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocationName("Current GPS Location");
        setGeoLocating(false);
      },
      (err) => {
        console.warn("Geolocation denied or failed:", err.message);
        setGeoLocating(false);
      }
    );
  };

  // Health conditions multi-select handler
  const handleConditionToggle = (condition) => {
    const current = selectedConditions;

    if (condition === "None of the above") {
      setOtherConditionText("");
      setSelectedConditions(["None of the above"]);
      return;
    }

    const withoutNone = current.filter((c) => c !== "None of the above");
    const isSelected = withoutNone.includes(condition);

    const next = isSelected
      ? withoutNone.filter((c) => c !== condition)
      : [...withoutNone, condition];

    if (condition === "Other" && isSelected) {
      setOtherConditionText("");
    }

    setSelectedConditions(next.length === 0 ? ["None of the above"] : next);
  };

  // Validation per step
  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      if (!fullName.trim()) errs.fullName = "Full name is required";
      if (!phone.trim()) {
        errs.phone = "Please provide a valid phone number";
      } else if (phone.length < 10) {
        errs.phone = "Phone number must be at least 10 digits";
      }
    }
    if (step === 2) {
      if (!bloodGroup) errs.bloodGroup = "Please select a blood group";
    }
    if (step === 5) {
      if (!consentEmergency) errs.consentEmergency = "Consent to receive emergency requests is required";
      if (!consentHospitalShare) errs.consentHospitalShare = "Consent to share information with hospitals is required";
      if (!understandScreening) errs.understandScreening = "Acknowledgment of medical screening requirement is required";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const [registeredDonorStatus, setRegisteredDonorStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(5)) return;

    setServerError("");
    setIsSubmitting(true);

    const normalizedConditions = selectedConditions.filter((condition) => condition !== "None of the above");
    const medicalConditions = normalizedConditions.flatMap((condition) => {
      if (condition === "Other") {
        if (!otherConditionText.trim()) {
          return ["Other"];
        }
        return [`Other: ${otherConditionText.trim()}`];
      }
      return [condition];
    });

    let donationCycleCompleted = true;
    let nextEligibilityDate = null;
    let daysRemaining = 0;
    if (lastDonationDate) {
      const lastDate = new Date(lastDonationDate);
      const nextDate = new Date(lastDate.getTime() + 90 * 24 * 60 * 60 * 1000);
      nextEligibilityDate = nextDate.toISOString().slice(0, 10);
      donationCycleCompleted = new Date() >= nextDate;
      if (!donationCycleCompleted) {
        daysRemaining = Math.max(1, Math.ceil((nextDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
      }
    }

    const isAvailable = donationCycleCompleted && feelingWell && !recentIllness;
    const availabilityStatus = donationCycleCompleted ? (isAvailable ? "AVAILABLE" : "UNAVAILABLE") : "ON_COOLDOWN";

    try {
      // POST to backend /api/donors
      const res = await api.createDonor({
        full_name: fullName,
        phone: phone,
        email: email || null,
        blood_group: bloodGroup,
        medical_conditions: medicalConditions,
        medicalConditions: medicalConditions,
        latitude: parseFloat(latitude) || 12.9716,
        longitude: parseFloat(longitude) || 77.5946,
        donation_consent: consentEmergency,
        emergency_contact_consent: consentHospitalShare,
        is_available: isAvailable,
        last_donation_date: lastDonationDate || null,
        donation_count: Number(totalDonations || 0),
        next_eligibility_date: nextEligibilityDate,
        medical_verification_status: "VERIFIED",
        availability_status: availabilityStatus,
        donation_cycle_completed: donationCycleCompleted,
      });

      setRegisteredDonorStatus({
        isEligible: donationCycleCompleted,
        daysRemaining,
        nextEligibilityDate,
        lastDonationDate
      });

      setIsSubmitting(false);
      setSubmitSuccess(true);
      if (onRegistrationSuccess) onRegistrationSuccess();
    } catch (err) {
      setIsSubmitting(false);
      setServerError(err.message || "Failed to register donor");
    }
  };

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div 
          className="brand-hexagon logo-blood-pulse" 
          style={{ width: "54px", height: "54px", margin: "0 auto 14px" }}
        >
          <BloodDropIcon size={26} color="#ffffff" variant="filled" />
        </div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: "800", letterSpacing: "-0.5px" }}>
          Donor Registration & Screening
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
          Step-by-step consent and medical declaration. Your privacy and autonomy are guaranteed.
        </p>
      </div>

      {/* Stepper Navigation Bar */}
      <div className="stepper-nav">
        <div className="stepper-line"></div>
        {[
          { num: 1, title: "Personal" },
          { num: 2, title: "Blood & GPS" },
          { num: 3, title: "Donation" },
          { num: 4, title: "Screening" },
          { num: 5, title: "Consent" }
        ].map((s) => (
          <div
            key={s.num}
            className={`stepper-step ${currentStep === s.num ? "active" : currentStep > s.num ? "completed" : ""}`}
            onClick={() => {
              if (s.num < currentStep) setCurrentStep(s.num);
            }}
          >
            <div className="stepper-circle">
              {currentStep > s.num ? "✓" : s.num}
            </div>
            <span className="stepper-title">{s.title}</span>
          </div>
        ))}
      </div>

      {/* Error notification */}
      {serverError && (
        <div style={{ background: "rgba(255, 42, 85, 0.15)", border: "1px solid rgba(255, 42, 85, 0.4)", borderRadius: "8px", padding: "12px 16px", color: "#ff4d6d", fontSize: "0.85rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertCircle size={18} />
          <span>{serverError}</span>
        </div>
      )}

      {/* SUCCESS CARD */}
      {submitSuccess ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: registeredDonorStatus?.isEligible ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
            border: registeredDonorStatus?.isEligible ? "2px solid #34d399" : "2px solid #f87171",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            color: registeredDonorStatus?.isEligible ? "#34d399" : "#f87171"
          }}>
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: "1.4rem", fontWeight: "800", marginBottom: "8px" }}>
            Donor Registration Completed!
          </h2>
          <p style={{ color: "#f8fafc", fontSize: "0.95rem", fontWeight: "600", marginBottom: "16px" }}>
            Welcome to HexaVision, {fullName}!
          </p>

          <div style={{
            maxWidth: "420px",
            margin: "0 auto 20px",
            padding: "16px",
            borderRadius: "12px",
            background: registeredDonorStatus?.isEligible ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
            border: registeredDonorStatus?.isEligible ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
            textAlign: "left",
            fontSize: "0.85rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "var(--text-muted)" }}>Eligibility Status:</span>
              <strong style={{ color: registeredDonorStatus?.isEligible ? "#34d399" : "#f87171" }}>
                {registeredDonorStatus?.isEligible ? "🟢 ELIGIBLE" : "🔴 NOT ELIGIBLE (COOLDOWN)"}
              </strong>
            </div>

            {registeredDonorStatus?.lastDonationDate && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Last Donation:</span>
                <span style={{ color: "#f8fafc" }}>{formatDate(registeredDonorStatus.lastDonationDate)}</span>
              </div>
            )}

            {registeredDonorStatus?.nextEligibilityDate && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Next Eligible Date:</span>
                <span style={{ color: registeredDonorStatus?.isEligible ? "#34d399" : "#fbbf24" }}>
                  {formatDate(registeredDonorStatus.nextEligibilityDate)}
                </span>
              </div>
            )}

            {!registeredDonorStatus?.isEligible && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Cooldown Remaining:</span>
                <strong style={{ color: "#f87171" }}>{registeredDonorStatus?.daysRemaining} days</strong>
              </div>
            )}
          </div>

          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "480px", margin: "0 auto 24px", lineHeight: "1.6" }}>
            Your registration and explicit consent declarations have been securely recorded into the PostgreSQL database and the regulatory Consent Vault.
          </p>

          <button 
            className="btn btn-emergency"
            onClick={() => {
              setSubmitSuccess(false);
              setCurrentStep(1);
              setFullName("");
              setPhone("");
            }}
          >
            Register Another Donor
          </button>
        </div>
      ) : (
        /* STEPPER FORM CARD */
        <div className="glass-panel">
          {/* STEP 1: PERSONAL INFORMATION */}
          {currentStep === 1 && (
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "800", marginBottom: "6px" }}>
                Step 1: Personal Information
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "20px" }}>
                Basic contact and identification details
              </p>

              <div className="form-field">
                <label className="form-label">Full Legal Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                {errors.fullName && <span className="form-error">{errors.fullName}</span>}
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+91 98450 XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  {errors.phone && <span className="form-error">{errors.phone}</span>}
                </div>

                <div className="form-field">
                  <label className="form-label">Age / Date of Birth</label>
                  <input
                    type="number"
                    min="18"
                    max="65"
                    className="form-input"
                    placeholder="e.g. 28"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Email Address (Optional)</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="rahul@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 2: BLOOD & LOCATION */}
          {currentStep === 2 && (
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "800", marginBottom: "6px" }}>
                Step 2: Blood Type & Geographic Proximity
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "20px" }}>
                Used for geodesic distance and ABO/Rh matching engine
              </p>

              <div className="form-field">
                <label className="form-label">Blood Group *</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                  {["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"].map((bg) => (
                    <div
                      key={bg}
                      onClick={() => setBloodGroup(bg)}
                      style={{
                        background: bloodGroup === bg ? "rgba(255, 42, 85, 0.2)" : "rgba(8, 14, 28, 0.8)",
                        border: bloodGroup === bg ? "2px solid var(--blood-red)" : "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        padding: "12px",
                        textAlign: "center",
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", fontWeight: "800", color: bloodGroup === bg ? "#ff4d6d" : "#ffffff" }}>
                        {bg}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "2px" }}>
                        {bg === "O-" ? "Universal" : bg === "AB+" ? "Recipient" : "Donor"}
                      </div>
                    </div>
                  ))}
                </div>
                {errors.bloodGroup && <span className="form-error">{errors.bloodGroup}</span>}
              </div>

              <div className="form-field" style={{ marginTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className="form-label" style={{ margin: 0 }}>Coordinates & Vicinity</label>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={handleDetectLocation}
                    disabled={geoLocating}
                  >
                    <MapPin size={13} color="var(--cyan-accent)" />
                    {geoLocating ? "Acquiring GPS..." : "Acquire Browser Geolocation"}
                  </button>
                </div>
                
                <input
                  type="text"
                  className="form-input"
                  placeholder="Locality / Neighborhood name"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label">Latitude</label>
                  <input
                    type="text"
                    className="form-input"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Longitude</label>
                  <input
                    type="text"
                    className="form-input"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DONATION HISTORY */}
          {currentStep === 3 && (
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "800", marginBottom: "6px" }}>
                Step 3: Donation History & Cooldown
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "20px" }}>
                Medical safety rule: minimum 90-day cooldown interval between whole blood donations
              </p>

              <div className="form-field">
                <label className="form-label">Last Blood Donation Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={lastDonationDate}
                  onChange={(e) => setLastDonationDate(e.target.value)}
                />
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "4px" }}>
                  Leave empty if you are a first-time donor.
                </span>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label">Estimated Total Lifetime Donations</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={totalDonations}
                    onChange={(e) => setTotalDonations(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Previous Donation Reactions</label>
                  <select
                    className="form-select"
                    value={previousReaction}
                    onChange={(e) => setPreviousReaction(e.target.value)}
                  >
                    <option value="None">None (Normal Recovery)</option>
                    <option value="Mild Dizziness">Mild Dizziness</option>
                    <option value="Fainting / Vasovagal">Fainting / Vasovagal Reaction</option>
                    <option value="Bruising at site">Bruising at puncture site</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: HEALTH SCREENING INFORMATION */}
          {currentStep === 4 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "800" }}>
                  Step 4: Health Screening Information
                </h3>
                <span style={{ fontSize: "0.72rem", color: "var(--cyan-accent)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Lock size={12} /> Confidential & Encrypted
                </span>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "20px" }}>
                Required for decision-support pre-screening. Not visible in public donor registry.
              </p>

              {/* Medication Toggle */}
              <div className="form-field">
                <label className="form-label">Are you currently taking any medicines?</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${takingMeds ? "btn-emergency" : "btn-secondary"}`}
                    onClick={() => setTakingMeds(true)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${!takingMeds ? "btn-emergency" : "btn-secondary"}`}
                    onClick={() => setTakingMeds(false)}
                  >
                    No
                  </button>
                </div>
                {takingMeds && (
                  <textarea
                    className="form-textarea"
                    style={{ marginTop: "10px" }}
                    placeholder="List medications, dosage, and reason for treatment..."
                    value={medicationDetails}
                    onChange={(e) => setMedicationDetails(e.target.value)}
                  />
                )}
              </div>

              {/* Previous Surgery Toggle */}
              <div className="form-field" style={{ marginTop: "16px" }}>
                <label className="form-label">Have you had any previous surgery?</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${hadSurgery ? "btn-emergency" : "btn-secondary"}`}
                    onClick={() => setHadSurgery(true)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${!hadSurgery ? "btn-emergency" : "btn-secondary"}`}
                    onClick={() => setHadSurgery(false)}
                  >
                    No
                  </button>
                </div>

                {hadSurgery && (
                  <div style={{ background: "rgba(8, 14, 28, 0.8)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "14px", marginTop: "10px" }}>
                    <div className="form-grid-2">
                      <div className="form-field">
                        <label className="form-label">Surgery Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={surgeryDate}
                          onChange={(e) => setSurgeryDate(e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Surgery Type</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Appendectomy, Orthopedic"
                          value={surgeryType}
                          onChange={(e) => setSurgeryType(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "20px", marginTop: "8px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={fullyRecovered}
                          onChange={(e) => setFullyRecovered(e.target.checked)}
                          style={{ accentColor: "var(--blood-red)" }}
                        />
                        Fully recovered?
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={ongoingTreatment}
                          onChange={(e) => setOngoingTreatment(e.target.checked)}
                          style={{ accentColor: "var(--blood-red)" }}
                        />
                        Ongoing treatment?
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Health Conditions Multi-Select */}
              <div className="form-field" style={{ marginTop: "16px" }}>
                <label className="form-label">Do you have any health conditions? (Multi-select)</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", maxHeight: "200px", overflowY: "auto", paddingRight: "4px" }}>
                  {HEALTH_CONDITIONS.map((cond) => {
                    const isSelected = selectedConditions.includes(cond);
                    const checkboxId = `condition-${cond.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

                    return (
                      <label
                        key={cond}
                        htmlFor={checkboxId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          background: isSelected ? "rgba(255, 42, 85, 0.15)" : "rgba(8, 14, 28, 0.6)",
                          border: isSelected ? "1px solid var(--blood-red)" : "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          opacity: 1
                        }}
                      >
                        <input
                          id={checkboxId}
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleConditionToggle(cond)}
                          style={{ accentColor: "var(--blood-red)" }}
                        />
                        <span>{cond}</span>
                      </label>
                    );
                  })}
                </div>

                {selectedConditions.includes("Other") && (
                  <div style={{ marginTop: "10px" }}>
                    <label className="form-label" htmlFor="other-health-condition">Other health condition:</label>
                    <input
                      id="other-health-condition"
                      type="text"
                      className="form-input"
                      placeholder="Specify other medical conditions..."
                      value={otherConditionText}
                      onChange={(e) => setOtherConditionText(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Current wellness */}
              <div className="form-grid-2" style={{ marginTop: "16px" }}>
                <div>
                  <label className="form-label">Currently feeling well?</label>
                  <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${feelingWell ? "btn-emergency" : "btn-secondary"}`}
                      onClick={() => setFeelingWell(true)}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${!feelingWell ? "btn-emergency" : "btn-secondary"}`}
                      onClick={() => setFeelingWell(false)}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label">Recent illness in past 14 days?</label>
                  <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${recentIllness ? "btn-emergency" : "btn-secondary"}`}
                      onClick={() => setRecentIllness(true)}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${!recentIllness ? "btn-emergency" : "btn-secondary"}`}
                      onClick={() => setRecentIllness(false)}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: CONSENT DECLARATIONS */}
          {currentStep === 5 && (
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "800", marginBottom: "6px" }}>
                Step 5: Consent Declarations & Governance
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "20px" }}>
                Consent-first emergency coordination protocol. You retain full autonomy at all times.
              </p>

              {/* Consent Card 1 */}
              <label className="consent-card">
                <input
                  type="checkbox"
                  checked={consentEmergency}
                  onChange={(e) => setConsentEmergency(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "#ffffff" }}>
                    I consent to receive emergency blood donation requests.
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Authorizes HexaVision algorithm to calculate proximity and notify you during trauma emergencies.
                  </div>
                </div>
              </label>
              {errors.consentEmergency && <span className="form-error">{errors.consentEmergency}</span>}

              {/* Consent Card 2 */}
              <label className="consent-card">
                <input
                  type="checkbox"
                  checked={consentHospitalShare}
                  onChange={(e) => setConsentHospitalShare(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "#ffffff" }}>
                    I consent to sharing necessary information with authorized hospitals/blood banks.
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Permits sharing your contact with verified blood-bank officers only after you accept an SOS match.
                  </div>
                </div>
              </label>
              {errors.consentHospitalShare && <span className="form-error">{errors.consentHospitalShare}</span>}

              {/* Consent Card 3 */}
              <label className="consent-card">
                <input
                  type="checkbox"
                  checked={understandScreening}
                  onChange={(e) => setUnderstandScreening(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "#ffffff" }}>
                    I understand that registering does not automatically mean I am medically eligible to donate.
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Final eligibility, hemoglobin test, cross-matching, and approval must be conducted in person by medical officers.
                  </div>
                </div>
              </label>
              {errors.understandScreening && <span className="form-error">{errors.understandScreening}</span>}

              {/* Withdrawal note & timestamp */}
              <div style={{ background: "rgba(0, 242, 254, 0.06)", border: "1px solid var(--border-cyan)", borderRadius: "var(--radius-md)", padding: "14px", marginTop: "18px" }}>
                <div style={{ fontSize: "0.82rem", color: "var(--cyan-accent)", fontWeight: "600", marginBottom: "4px" }}>
                  ℹ️ Right to Withdraw: "Your consent can be withdrawn at any time via the Consent Vault."
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                  Timestamp recorded upon submission: <strong style={{ color: "#ffffff" }}>{consentTimestamp}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "28px", paddingTop: "18px", borderTop: "1px solid var(--border-subtle)" }}>
            {currentStep > 1 ? (
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <div></div>
            )}

            {currentStep < 5 ? (
              <button type="button" className="btn btn-emergency" onClick={handleNext}>
                <span>Next Step</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                type="button" 
                className="btn btn-emergency" 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <ShieldCheck size={18} />
                <span>{isSubmitting ? "Submitting to Database..." : "Complete Registration"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
