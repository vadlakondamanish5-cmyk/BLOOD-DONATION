import React, { useState, useEffect, useMemo } from "react";
import { 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Calendar,
  ArrowRight,
  ArrowLeft,
  Phone,
  KeyRound,
  RotateCw,
  Clock,
  Check,
  Users
} from "lucide-react";
import BloodDropIcon from "../components/BloodDropIcon";
import { api } from "../api/api";

const dateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = dateValue(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

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

export default function RegisterDonorPage({ onRegistrationSuccess, onNavigateToHome }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  // Step 1: Personal Info
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [otpError, setOtpError] = useState("");
  const [devOtpHint, setDevOtpHint] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [phoneExpiry, setPhoneExpiry] = useState(300);

  // Email state (Optional with OTP)
  const [email, setEmail] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpMessage, setEmailOtpMessage] = useState("");
  const [emailOtpError, setEmailOtpError] = useState("");
  const [emailDevOtpHint, setEmailDevOtpHint] = useState("");
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [emailExpiry, setEmailExpiry] = useState(300);

  const [age, setAge] = useState("");

  // Step 2: Blood & Location
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [stateName, setStateName] = useState("Karnataka");
  const [cityName, setCityName] = useState("Bangalore");
  const [areaName, setAreaName] = useState("Central");
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
  const [consentTimestamp] = useState(new Date().toISOString());

  // Errors state
  const [errors, setErrors] = useState({});
  const [registeredDonorStatus, setRegisteredDonorStatus] = useState(null);

  // Phone OTP cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Phone OTP 5-minute expiration countdown
  useEffect(() => {
    if (!otpSent || isPhoneVerified || phoneExpiry <= 0) return undefined;
    const timer = setInterval(() => {
      setPhoneExpiry((p) => {
        if (p <= 1) {
          setOtpError("OTP expired (5-minute validity). Please request a new OTP.");
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSent, isPhoneVerified, phoneExpiry]);

  // Email OTP cooldown timer
  useEffect(() => {
    if (emailCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setEmailCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [emailCooldown]);

  // Email OTP 5-minute expiration countdown
  useEffect(() => {
    if (!emailOtpSent || isEmailVerified || emailExpiry <= 0) return undefined;
    const timer = setInterval(() => {
      setEmailExpiry((e) => {
        if (e <= 1) {
          setEmailOtpError("Email OTP expired. Please request a new OTP.");
          return 0;
        }
        return e - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [emailOtpSent, isEmailVerified, emailExpiry]);

  // Phone number input handler: exactly numeric characters, max 10 digits
  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    const clean = raw.replace(/\D/g, "").slice(0, 10);
    setPhone(clean);

    if (isPhoneVerified) {
      setIsPhoneVerified(false);
      setOtpSent(false);
      setOtp("");
      setOtpMessage("");
      setDevOtpHint("");
    }

    if (clean.length > 0 && clean.length < 10) {
      setErrors((prev) => ({
        ...prev,
        phone: `Phone number must be exactly 10 digits (${clean.length}/10 entered)`
      }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  };

  // Email change handler: resets verification if changed
  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);

    if (isEmailVerified) {
      setIsEmailVerified(false);
      setEmailOtpSent(false);
      setEmailOtp("");
      setEmailOtpMessage("");
      setEmailDevOtpHint("");
    }

    const trimmed = val.trim();
    if (trimmed.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        setErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email format"
        }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.email;
          return next;
        });
      }
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    }
  };

  // OTP Send handler
  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      setErrors((prev) => ({
        ...prev,
        phone: "Please enter a valid 10-digit Indian mobile number"
      }));
      return;
    }
    if (cooldown > 0) return;

    setOtpError("");
    setOtpMessage("");
    setIsSendingOtp(true);

    try {
      const res = await api.sendOtp(phone, false);
      if (res.success) {
        setOtpSent(true);
        setPhoneExpiry(res.expiresIn || 300);
        setOtpMessage(res.message || `OTP sent to +91 ${phone.slice(0, 5)} ${phone.slice(5)}`);
        setCooldown(res.cooldown || 30);
        if (res.dev_otp) {
          setDevOtpHint(res.dev_otp);
        }
      } else {
        setOtpError(res.message || "Failed to send OTP. Please try again.");
        if (res.is_registered) {
          setErrors((prev) => ({
            ...prev,
            phone: "This phone number is already registered as a donor. Please sign in instead."
          }));
        }
        if (res.cooldown) setCooldown(res.cooldown);
      }
    } catch (err) {
      const msg = err.message || "Failed to send OTP.";
      setOtpError(msg);
      if (msg.includes("already registered")) {
        setErrors((prev) => ({
          ...prev,
          phone: "This phone number is already registered as a donor. Please sign in instead."
        }));
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  // OTP Verify handler
  const handleVerifyOtp = async () => {
    if (!otp || otp.trim().length === 0) {
      setOtpError("Please enter the OTP received");
      return;
    }

    setOtpError("");
    setIsVerifyingOtp(true);

    try {
      const res = await api.verifyOtp(phone, otp.trim());
      if (res.success) {
        setIsPhoneVerified(true);
        setOtpError("");
        setOtpMessage(`✓ Mobile number +91 ${phone} verified successfully`);
        setErrors((prev) => {
          const next = { ...prev };
          delete next.phone;
          return next;
        });
      } else {
        setOtpError(res.message || "Invalid or expired OTP");
      }
    } catch (err) {
      setOtpError(err.message || "OTP verification failed. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Email OTP Send handler
  const handleSendEmailOtp = async () => {
    const norm = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(norm)) {
      setErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address before requesting OTP"
      }));
      return;
    }
    if (emailCooldown > 0) return;

    setEmailOtpError("");
    setEmailOtpMessage("");
    setIsSendingEmailOtp(true);

    try {
      const res = await api.sendEmailOtp(norm);
      if (res.success) {
        setEmailOtpSent(true);
        setEmailExpiry(res.expiresIn || 300);
        setEmailOtpMessage(res.message || `Email OTP sent to ${norm}`);
        setEmailCooldown(res.cooldown || 30);
        if (res.dev_otp) setEmailDevOtpHint(res.dev_otp);
      } else {
        setEmailOtpError(res.message || "Failed to send email OTP");
      }
    } catch (err) {
      setEmailOtpError(err.message || "Failed to send email OTP");
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  // Email OTP Verify handler
  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.trim().length === 0) {
      setEmailOtpError("Please enter the email OTP received");
      return;
    }
    setEmailOtpError("");
    setIsVerifyingEmailOtp(true);

    try {
      const res = await api.verifyEmailOtp(email.trim().toLowerCase(), emailOtp.trim());
      if (res.success) {
        setIsEmailVerified(true);
        setEmailOtpError("");
        setEmailOtpMessage("✓ Email verified successfully");
        setErrors((prev) => {
          const next = { ...prev };
          delete next.email;
          return next;
        });
      } else {
        setEmailOtpError(res.message || "Invalid or expired email OTP");
      }
    } catch (err) {
      setEmailOtpError(err.message || "Email OTP verification failed");
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };

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
        setLocationName(`${areaName || "Current GPS"}, ${cityName || "Bangalore"}, ${stateName || "Karnataka"}`);
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

  // Step 3 Live calculation of next eligible donation date based on 90-day waiting period
  const donationEligibilityPreview = useMemo(() => {
    if (!lastDonationDate) {
      return {
        isEligible: true,
        label: "Eligible Immediately",
        statusText: "🟢 First-Time Donor",
        message: "First-time donors have completed donation cycle and are eligible immediately upon registration.",
        nextEligibleDate: "Ready Now",
        daysRemaining: 0
      };
    }
    const lastDate = new Date(lastDonationDate);
    if (Number.isNaN(lastDate.getTime())) {
      return null;
    }
    const nextDate = new Date(lastDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDateStart = new Date(nextDate);
    nextDateStart.setHours(0, 0, 0, 0);

    const isEligible = today >= nextDateStart;
    const diffDays = Math.ceil((nextDateStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = isEligible ? 0 : Math.max(1, diffDays);

    return {
      isEligible,
      label: isEligible ? "90-Day Waiting Period Completed" : "Cooldown Active",
      statusText: isEligible ? "🟢 Ready to Donate" : `🟡 Cooldown: ${daysRemaining} Days Remaining`,
      message: isEligible
        ? "The mandatory 90-day whole blood interval has elapsed. Donor is eligible for emergency matching."
        : `Minimum 90-day waiting period active. Eligible on ${formatDate(nextDate.toISOString().slice(0, 10))}.`,
      nextEligibleDate: nextDate.toISOString().slice(0, 10),
      daysRemaining
    };
  }, [lastDonationDate]);

  // Step 4 Live pre-screening assessment
  const screeningAssessment = useMemo(() => {
    const isWell = feelingWell && !recentIllness;
    const conditions = selectedConditions.filter((c) => c !== "None of the above");
    const hasConditions = conditions.length > 0;

    return {
      isEligible: isWell,
      statusText: isWell ? "🟢 Pre-Screening: Eligible" : "🟡 Temporary Deferral (14-Day Waiting Period)",
      reason: isWell
        ? "Standard health declaration passed. Donor declared feeling healthy and free of recent acute illness."
        : "Recent acute illness in the last 14 days or currently feeling unwell. Temporary clinical deferral applies.",
      hasConditions,
      conditions
    };
  }, [feelingWell, recentIllness, selectedConditions]);

  // Validation per step
  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      if (!fullName.trim()) errs.fullName = "Full legal name is required";
      if (!phone.trim()) {
        errs.phone = "10-digit mobile number is required";
      } else if (phone.length !== 10) {
        errs.phone = `Phone number must be exactly 10 digits (${phone.length}/10 entered)`;
      } else if (!isPhoneVerified) {
        errs.phone = "Please verify your mobile number with OTP before continuing";
      }
    }
    if (step === 2) {
      if (!bloodGroup) errs.bloodGroup = "Please select a blood group";
      if (!stateName.trim()) errs.stateName = "State is required";
      if (!cityName.trim()) errs.cityName = "City is required";
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
    const fullLocation = [areaName, cityName, stateName].filter(Boolean).join(", ") || locationName || "Bangalore, Karnataka";

    try {
      const res = await api.createDonor({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        blood_group: bloodGroup,
        medical_conditions: medicalConditions,
        medicalConditions: medicalConditions,
        latitude: parseFloat(latitude) || 12.9716,
        longitude: parseFloat(longitude) || 77.5946,
        location_name: fullLocation,
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

      const donorData = res?.donor || res?.data || {};
      const calculatedEligible = donorData.isEligible ?? donorData.eligible ?? donationCycleCompleted;
      const calculatedReason = donorData.reason || donorData.eligibility_reason || (calculatedEligible ? "Verified eligible" : "Donation cycle not completed");

      setRegisteredDonorStatus({
        isEligible: calculatedEligible,
        reason: calculatedReason,
        daysRemaining,
        nextEligibilityDate,
        lastDonationDate
      });

      setIsSubmitting(false);
      setSubmitSuccess(true);

      if (onRegistrationSuccess) {
        onRegistrationSuccess();
      }
    } catch (err) {
      setIsSubmitting(false);
      setServerError(err.message || "Failed to register donor");
    }
  };

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", paddingBottom: "40px" }}>
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
          Step-by-step verified consent and medical declaration. Your privacy and autonomy are guaranteed.
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

      {/* Server Error notification */}
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
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            background: registeredDonorStatus?.isEligible ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
            border: registeredDonorStatus?.isEligible ? "2px solid #34d399" : "2px solid #f87171",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            color: registeredDonorStatus?.isEligible ? "#34d399" : "#f87171",
            boxShadow: registeredDonorStatus?.isEligible ? "0 0 25px rgba(52, 211, 153, 0.3)" : "0 0 25px rgba(248, 113, 113, 0.3)"
          }}>
            <CheckCircle2 size={38} />
          </div>

          <h2 style={{ fontSize: "1.45rem", fontWeight: "800", marginBottom: "6px" }}>
            Donor Registration Completed!
          </h2>
          <p style={{ color: "#f8fafc", fontSize: "0.95rem", fontWeight: "600", marginBottom: "16px" }}>
            Welcome to HexaVision Emergency Donor Network, {fullName}!
          </p>

          <div style={{
            maxWidth: "460px",
            margin: "0 auto 20px",
            padding: "18px",
            borderRadius: "12px",
            background: registeredDonorStatus?.isEligible ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
            border: registeredDonorStatus?.isEligible ? "1px solid rgba(34, 197, 94, 0.35)" : "1px solid rgba(239, 68, 68, 0.35)",
            textAlign: "left",
            fontSize: "0.85rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ color: "var(--text-muted)" }}>Eligibility Status:</span>
              <span style={{
                fontWeight: "800",
                fontSize: "0.88rem",
                color: registeredDonorStatus?.isEligible ? "#34d399" : "#f87171"
              }}>
                {registeredDonorStatus?.isEligible ? "🟢 ELIGIBLE" : "🔴 NOT ELIGIBLE (COOLDOWN)"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "var(--text-muted)" }}>Eligibility Reason:</span>
              <span style={{ color: "#f8fafc", fontWeight: "600", textAlign: "right", maxWidth: "260px" }}>
                {registeredDonorStatus?.reason || (registeredDonorStatus?.isEligible ? "Verified eligible" : "Donation cycle not completed")}
              </span>
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
                <span style={{ color: registeredDonorStatus?.isEligible ? "#34d399" : "#fbbf24", fontWeight: "700" }}>
                  {formatDate(registeredDonorStatus.nextEligibilityDate)}
                </span>
              </div>
            )}

            {!registeredDonorStatus?.isEligible && registeredDonorStatus?.daysRemaining > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", paddingTop: "8px", borderTop: "1px dashed rgba(255, 255, 255, 0.1)" }}>
                <span style={{ color: "var(--text-muted)" }}>Cooldown Remaining:</span>
                <strong style={{ color: "#f87171" }}>{registeredDonorStatus.daysRemaining} days</strong>
              </div>
            )}
          </div>

          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", maxWidth: "480px", margin: "0 auto 24px", lineHeight: "1.6" }}>
            Your registration, verified phone credentials, and explicit consent declarations have been recorded into the PostgreSQL database and the regulatory Consent Vault.
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            {onNavigateToHome ? (
              <button 
                type="button"
                className="btn btn-emergency"
                onClick={() => onNavigateToHome()}
              >
                <Users size={16} />
                <span>Back to Home</span>
              </button>
            ) : null}
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSubmitSuccess(false);
                setCurrentStep(1);
                setFullName("");
                setPhone("");
                setIsPhoneVerified(false);
                setOtpSent(false);
                setOtp("");
              }}
            >
              Register Another Donor
            </button>
          </div>
        </div>
      ) : (
        /* STEPPER FORM CARD */
        <div className="glass-panel">
          {/* STEP 1: PERSONAL INFORMATION & PHONE OTP */}
          {currentStep === 1 && (
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "800", marginBottom: "6px" }}>
                Step 1: Personal Information
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "20px" }}>
                Basic contact and mandatory 10-digit mobile phone OTP verification
              </p>

              {/* Full Legal Name */}
              <div className="form-field">
                <label className="form-label">Full Legal Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                {errors.fullName && <span className="form-error">{errors.fullName}</span>}
              </div>

              {/* Phone Number & OTP Verification */}
              <div className="form-field" style={{ marginTop: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label className="form-label" style={{ margin: 0 }}>Phone Number (10 Digits) *</label>
                  {isPhoneVerified ? (
                    <span style={{ fontSize: "0.74rem", color: "#34d399", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Check size={14} /> Mobile Number Verified
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                      {phone.length}/10 digits
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <span style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      fontWeight: "700",
                      fontSize: "0.88rem"
                    }}>
                      +91
                    </span>
                    <input
                      type="tel"
                      className="form-input"
                      style={{ paddingLeft: "48px" }}
                      placeholder="9876543210"
                      value={phone}
                      onChange={handlePhoneChange}
                      maxLength={10}
                    />
                  </div>

                  {!isPhoneVerified && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleSendOtp}
                      disabled={phone.length !== 10 || isSendingOtp || cooldown > 0}
                      style={{ height: "42px", minWidth: "110px", whiteSpace: "nowrap" }}
                    >
                      {isSendingOtp ? (
                        <RotateCw size={14} className="spin" />
                      ) : cooldown > 0 ? (
                        <span>Wait {cooldown}s</span>
                      ) : (
                        <>
                          <KeyRound size={14} />
                          <span>{otpSent ? "Resend" : "Send OTP"}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {errors.phone && <span className="form-error">{errors.phone}</span>}

                {/* OTP Verification UI Box */}
                {otpSent && !isPhoneVerified && (
                  <div style={{
                    marginTop: "12px",
                    padding: "14px 16px",
                    background: "rgba(0, 242, 254, 0.05)",
                    border: "1px solid rgba(0, 242, 254, 0.25)",
                    borderRadius: "10px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--cyan-accent)", fontWeight: "600" }}>
                        OTP sent to +91 {phone.slice(0, 5)} {phone.slice(5)}
                      </span>
                      {devOtpHint && (
                        <span style={{ fontSize: "0.72rem", background: "rgba(0, 242, 254, 0.15)", padding: "2px 6px", borderRadius: "4px", color: "var(--cyan-accent)", fontFamily: "monospace" }}>
                          Demo OTP: {devOtpHint}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        maxLength={6}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        style={{ maxWidth: "180px", letterSpacing: "0.2em", fontWeight: "700" }}
                      />
                      <button
                        type="button"
                        className="btn btn-emergency btn-sm"
                        onClick={handleVerifyOtp}
                        disabled={isVerifyingOtp || otp.length < 4}
                        style={{ height: "42px" }}
                      >
                        {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleSendOtp}
                        disabled={cooldown > 0 || isSendingOtp}
                        style={{ height: "42px" }}
                      >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                      </button>
                    </div>

                    {otpError && (
                      <div style={{ color: "#ff4d6d", fontSize: "0.78rem", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <AlertCircle size={14} />
                        <span>{otpError}</span>
                      </div>
                    )}
                  </div>
                )}

                {isPhoneVerified && (
                  <div style={{
                    marginTop: "8px",
                    padding: "8px 12px",
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    borderRadius: "8px",
                    color: "#34d399",
                    fontSize: "0.8rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <CheckCircle2 size={16} />
                    <span>Mobile number verified for emergency clinical coordination.</span>
                  </div>
                )}
              </div>

              {/* Age and Email */}
              <div className="form-grid-2" style={{ marginTop: "14px" }}>
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
            </div>
          )}

          {/* STEP 2: BLOOD TYPE & GEOGRAPHIC LOCATION */}
          {currentStep === 2 && (
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "800", marginBottom: "6px" }}>
                Step 2: Blood Type & Geographic Location
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "20px" }}>
                Used for geodesic proximity calculation and trauma ABO/Rh matching engine
              </p>

              {/* Blood Group Selection */}
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
                        cursor: "pointer",
                        transition: "all 0.2s ease"
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

              {/* Geographic Hierarchy: State, City, Area */}
              <div style={{ marginTop: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className="form-label" style={{ margin: 0 }}>Current Location & GPS *</label>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={handleDetectLocation}
                    disabled={geoLocating}
                  >
                    <MapPin size={13} color="var(--cyan-accent)" />
                    <span>{geoLocating ? "Acquiring GPS..." : "Acquire Browser Geolocation"}</span>
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "10px", marginBottom: "12px" }}>
                  <div className="form-field">
                    <label className="form-label">State *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Karnataka"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      required
                    />
                    {errors.stateName && <span className="form-error">{errors.stateName}</span>}
                  </div>

                  <div className="form-field">
                    <label className="form-label">City *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Bangalore"
                      value={cityName}
                      onChange={(e) => setCityName(e.target.value)}
                      required
                    />
                    {errors.cityName && <span className="form-error">{errors.cityName}</span>}
                  </div>

                  <div className="form-field">
                    <label className="form-label">Area / Locality</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Indiranagar / Central"
                      value={areaName}
                      onChange={(e) => setAreaName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Latitude Coordinates</label>
                    <input
                      type="text"
                      className="form-input"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Longitude Coordinates</label>
                    <input
                      type="text"
                      className="form-input"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DONATION HISTORY & ELIGIBILITY CALCULATION */}
          {currentStep === 3 && (
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "800", marginBottom: "6px" }}>
                Step 3: Donation History & Eligibility Cycle
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
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "4px", display: "block" }}>
                  Leave empty if this is your very first blood donation.
                </span>
              </div>

              {/* Dynamic Next Eligible Donation Date Preview */}
              {donationEligibilityPreview && (
                <div style={{
                  marginTop: "12px",
                  padding: "14px",
                  borderRadius: "10px",
                  background: donationEligibilityPreview.isEligible ? "rgba(16, 185, 129, 0.08)" : "rgba(251, 191, 36, 0.08)",
                  border: donationEligibilityPreview.isEligible ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(251, 191, 36, 0.3)",
                  marginBottom: "16px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: "700", color: donationEligibilityPreview.isEligible ? "#34d399" : "#fbbf24" }}>
                      {donationEligibilityPreview.statusText}
                    </span>
                    <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                      Next Eligible: <strong style={{ color: "#ffffff" }}>{donationEligibilityPreview.nextEligibleDate === "Ready Now" ? "Ready Now" : formatDate(donationEligibilityPreview.nextEligibleDate)}</strong>
                    </span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
                    {donationEligibilityPreview.message}
                  </p>
                </div>
              )}

              <div className="form-grid-2" style={{ marginTop: "16px" }}>
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
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                Required for pre-screening decision support. Declared conditions are reviewed by clinicians and not auto-rejected.
              </p>

              {/* Live Pre-Screening Eligibility Status Banner */}
              <div style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: screeningAssessment.isEligible ? "rgba(16, 185, 129, 0.08)" : "rgba(251, 191, 36, 0.08)",
                border: screeningAssessment.isEligible ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(251, 191, 36, 0.3)",
                marginBottom: "20px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "700", fontSize: "0.84rem", color: screeningAssessment.isEligible ? "#34d399" : "#fbbf24" }}>
                    {screeningAssessment.statusText}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                    Rule: Institutional Protocol v2.4
                  </span>
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
                  {screeningAssessment.reason}
                </p>
                {screeningAssessment.hasConditions && (
                  <div style={{ marginTop: "6px", fontSize: "0.74rem", color: "var(--cyan-accent)" }}>
                    ℹ️ Declared conditions ({screeningAssessment.conditions.join(", ")}): Stored for medical verification. System does not automatically reject.
                  </div>
                )}
              </div>

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
                    <label className="form-label" htmlFor="other-health-condition">Other health condition details:</label>
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

              {/* Registration Summary Card */}
              <div style={{
                background: "rgba(11, 20, 38, 0.8)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "14px 16px",
                marginBottom: "20px"
              }}>
                <div style={{ fontSize: "0.76rem", fontWeight: "700", color: "var(--cyan-accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                  Registration Overview Summary
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.82rem" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Full Name: </span>
                    <strong style={{ color: "#ffffff" }}>{fullName}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Phone (Verified): </span>
                    <strong style={{ color: "#34d399" }}>+91 {phone} ✓</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Blood Group: </span>
                    <strong style={{ color: "#ff4d6d" }}>{bloodGroup}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Location: </span>
                    <strong style={{ color: "#ffffff" }}>{cityName}, {stateName}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Donation Cycle: </span>
                    <span style={{ color: donationEligibilityPreview?.isEligible ? "#34d399" : "#fbbf24", fontWeight: "700" }}>
                      {donationEligibilityPreview?.label || "Ready"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Screening: </span>
                    <span style={{ color: screeningAssessment?.isEligible ? "#34d399" : "#fbbf24", fontWeight: "700" }}>
                      {screeningAssessment?.statusText || "Pre-Screened"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Consent Card 1 */}
              <label className="consent-card">
                <input
                  type="checkbox"
                  checked={consentEmergency}
                  onChange={(e) => setConsentEmergency(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "#ffffff" }}>
                    I consent to blood donation and receiving emergency requests. *
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
                    I consent to sharing necessary information with verified hospitals/blood banks. *
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Permits sharing your verified contact with accredited blood-bank officers only after you accept an SOS match.
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
                    I understand that registering does not automatically mean I am medically eligible to donate. *
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
                <span>{isSubmitting ? "Registering & Recording Consent..." : "Complete Registration"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
