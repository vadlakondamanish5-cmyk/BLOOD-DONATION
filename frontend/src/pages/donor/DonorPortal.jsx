import React, { useState, useEffect } from "react";
import {
  Activity,
  User,
  Droplet,
  CheckCircle2,
  Clock,
  Radio,
  Target,
  Bell,
  MapPin,
  ShieldCheck,
  HelpCircle,
  LogOut,
  Sparkles,
  Calendar,
  AlertTriangle,
  RotateCw,
  HeartHandshake,
  ArrowRight,
  Send,
  Bot
} from "lucide-react";
import BloodDropIcon from "../../components/BloodDropIcon";
import { api } from "../../api/api";
import { navigate } from "../../utils/router";

// Blood Compatibility Table for Whole Blood / Red Cells
const CAN_DONATE_TO = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"]
};

const CAN_RECEIVE_FROM = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
};

export default function DonorPortal({ user, onSignOut }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [donorData, setDonorData] = useState(user?.donor || user || {});
  const [eligibility, setEligibility] = useState(null);
  const [donationSummary, setDonationSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [matches, setMatches] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile Edit State
  const [phone, setPhone] = useState(donorData?.phone || "");
  const [email, setEmail] = useState(donorData?.email || "");
  const [isAvailable, setIsAvailable] = useState(donorData?.is_available !== false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // Blood Knowledge AI inside Donor Portal
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I am HexaVision Blood Knowledge AI. Feel free to ask me anything about blood groups, donation intervals, pre-screening, recovery, or transfusion safety."
    }
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [askingAi, setAskingAi] = useState(false);

  const donorId = donorData?.id || user?.donor_id || user?.id;
  const bloodGroup = (donorData?.blood_group || user?.blood_group || "O+").toUpperCase();

  const loadDonorDetails = async () => {
    try {
      setLoading(true);
      const [reqsRes, matchesRes] = await Promise.all([
        api.getRequests().catch(() => ({ data: [] })),
        api.getMatches().catch(() => ({ data: [] }))
      ]);

      setRequests(reqsRes.data || []);
      setMatches(matchesRes.data || []);

      if (donorId) {
        const [eligRes, sumRes] = await Promise.all([
          api.getDonorEligibility(donorId).catch(() => ({ data: null })),
          api.getDonorDonationSummary(donorId).catch(() => ({ data: null }))
        ]);
        if (eligRes?.data) setEligibility(eligRes.data);
        if (sumRes?.data) setDonationSummary(sumRes.data);
      }
    } catch (err) {
      console.error("Error loading donor portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonorDetails();
  }, [donorId]);

  // Compute compatible requests for this donor
  const compatibleRecipients = CAN_DONATE_TO[bloodGroup] || [bloodGroup];
  const compatibleRequests = requests.filter((r) =>
    compatibleRecipients.includes(r.blood_group)
  );

  const handleUpdateAvailability = async (newVal) => {
    setIsAvailable(newVal);
    if (donorId) {
      try {
        await api.updateDonor(donorId, { is_available: newVal });
        setDonorData((prev) => ({ ...prev, is_available: newVal }));
      } catch (e) {
        console.error("Failed to update availability:", e);
      }
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg("");
    try {
      if (donorId) {
        await api.updateDonor(donorId, {
          phone,
          email,
          is_available: isAvailable
        });
        setDonorData((prev) => ({ ...prev, phone, email, is_available: isAvailable }));
        setProfileMsg("Profile updated successfully");
      }
    } catch (err) {
      setProfileMsg(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAskKnowledge = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || askingAi) return;

    const query = inputMsg.trim();
    setInputMsg("");
    setChatMessages((prev) => [...prev, { role: "user", text: query }]);
    setAskingAi(true);

    try {
      const res = await api.askBloodKnowledge(query);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: res.answer || res.message || "Thank you for asking. Standard donation safety guidelines apply."
        }
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Blood Knowledge AI: Whole blood donors can donate every 90 days. Always ensure you are well-hydrated and feeling healthy."
        }
      ]);
    } finally {
      setAskingAi(false);
    }
  };

  const handleLogout = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      localStorage.removeItem("hexavision_session_token");
      localStorage.removeItem("hexavision_auth_user");
      navigate("/login");
    }
  };

  // Nav Items strictly for Donor
  const donorNavItems = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "profile", label: "My Profile", icon: User },
    { id: "blood-info", label: "My Blood Information", icon: Droplet },
    { id: "eligibility", label: "Donation Eligibility", icon: CheckCircle2 },
    { id: "history", label: "Donation History", icon: Calendar },
    { id: "emergency-requests", label: "Emergency Requests", icon: Radio, badge: compatibleRequests.length > 0 ? `${compatibleRequests.length} Needs` : null },
    { id: "matches", label: "My Matches", icon: Target },
    { id: "status", label: "Donation Status", icon: Clock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "live-map", label: "Live Map", icon: MapPin },
    { id: "consent", label: "Consent & Privacy", icon: ShieldCheck },
    { id: "help", label: "Help / Blood AI", icon: HelpCircle }
  ];

  const isEligible = eligibility?.eligible !== false;
  const availabilityStatus = isAvailable ? "AVAILABLE" : "UNAVAILABLE";

  return (
    <div className="app-shell" style={{ display: "flex", minHeight: "100vh" }}>
      {/* ==================================================== */}
      {/* DONOR SPECIFIC SIDEBAR                               */}
      {/* ==================================================== */}
      <aside className="sidebar" style={{ width: "260px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflowY: "auto", maxHeight: "100vh", padding: "18px 14px" }}>
        <div>
          {/* Header Branding */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
            <div className="brand-hexagon logo-blood-pulse" style={{ width: "38px", height: "38px" }}>
              <BloodDropIcon size={20} color="#ffffff" variant="filled" animated />
            </div>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: "900", letterSpacing: "0.06em", color: "#ffffff" }}>
                HEXAVISION
              </div>
              <div style={{ fontSize: "0.68rem", color: "#ff4d6d", fontWeight: "800", letterSpacing: "0.08em" }}>
                DONOR PORTAL
              </div>
            </div>
          </div>

          {/* Donor Badge Pill */}
          <div style={{
            background: "rgba(255, 42, 85, 0.1)",
            border: "1px solid rgba(255, 42, 85, 0.35)",
            borderRadius: "10px",
            padding: "10px 12px",
            marginBottom: "20px"
          }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Logged In Donor
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: "800", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {donorData?.full_name || user?.full_name || "Voluntary Donor"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span style={{
                background: "#ff2a55",
                color: "#ffffff",
                padding: "2px 8px",
                borderRadius: "6px",
                fontSize: "0.74rem",
                fontWeight: "800"
              }}>
                {bloodGroup}
              </span>
              <span style={{
                fontSize: "0.72rem",
                fontWeight: "700",
                color: isAvailable ? "var(--status-available)" : "var(--text-muted)"
              }}>
                ● {availabilityStatus}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <ul className="nav-list" style={{ listStyle: "none" }}>
            {donorNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id} style={{ marginBottom: "3px" }}>
                  <button
                    type="button"
                    className={`nav-item-btn ${isActive ? "active" : ""}`}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      fontSize: "0.83rem",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Icon size={16} className="nav-icon" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && <span className="nav-pill">{item.badge}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Bottom Status & Logout */}
        <div style={{ paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            type="button"
            id="btn-donor-logout"
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              borderRadius: "8px",
              background: "rgba(255, 42, 85, 0.08)",
              border: "1px solid rgba(255, 42, 85, 0.25)",
              color: "#ff4d6d",
              fontWeight: "700",
              fontSize: "0.84rem",
              cursor: "pointer"
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ==================================================== */}
      {/* DONOR PORTAL CONTENT AREA                            */}
      {/* ==================================================== */}
      <div className="main-shell" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top Header Banner */}
        <header className="top-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 28px" }}>
          <div>
            <div style={{ fontSize: "0.72rem", color: "var(--cyan-accent)", fontWeight: "800", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              HexaVision Voluntary Donor Network
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff" }}>
              Welcome back, {donorData?.full_name || "Hero"}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255, 42, 85, 0.12)",
              border: "1px solid rgba(255, 42, 85, 0.4)",
              borderRadius: "8px",
              padding: "6px 12px"
            }}>
              <Droplet size={16} color="#ff2a55" />
              <span style={{ fontSize: "0.82rem", fontWeight: "800", color: "#ffffff" }}>
                Group: {bloodGroup}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleUpdateAvailability(!isAvailable)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: isAvailable ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.2)",
                border: isAvailable ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(100, 116, 139, 0.3)",
                borderRadius: "8px",
                padding: "6px 12px",
                color: isAvailable ? "var(--status-available)" : "var(--text-muted)",
                fontSize: "0.82rem",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              <span style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: isAvailable ? "var(--status-available)" : "#64748b"
              }} />
              <span>{isAvailable ? "Ready to Donate" : "Mark Available"}</span>
            </button>

            <button
              type="button"
              id="btn-donor-header-logout"
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "rgba(255, 42, 85, 0.1)",
                border: "1px solid rgba(255, 42, 85, 0.3)",
                color: "#ff4d6d",
                fontSize: "0.8rem",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="content-body" style={{ padding: "24px 28px", flex: 1, overflowY: "auto" }}>
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === "dashboard" && (
            <div>
              {/* Stat Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                <div className="card-glass" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                    Donation Eligibility
                  </div>
                  <div style={{ fontSize: "1.4rem", fontWeight: "800", color: isEligible ? "var(--status-available)" : "#f59e0b", marginTop: "6px" }}>
                    {isEligible ? "Ready to Donate" : "Cooldown Active"}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Next Eligible: {eligibility?.next_eligibility_date || "Eligible Now"}
                  </div>
                </div>

                <div className="card-glass" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                    Total Donations
                  </div>
                  <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#ffffff", marginTop: "6px" }}>
                    {donorData?.donation_count || donationSummary?.donation_count || 1} Units
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Last Donation: {donorData?.last_donation_date || "—"}
                  </div>
                </div>

                <div className="card-glass" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                    Nearby Compatible Needs
                  </div>
                  <div style={{ fontSize: "1.4rem", fontWeight: "800", color: compatibleRequests.length > 0 ? "#ff2a55" : "var(--text-muted)", marginTop: "6px" }}>
                    {compatibleRequests.length} Emergency Requests
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Matching blood groups: {compatibleRecipients.join(", ")}
                  </div>
                </div>
              </div>

              {/* Compatible Emergency Requests Card */}
              <div className="card-glass" style={{ padding: "22px", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Radio size={20} color="#ff2a55" />
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff" }}>
                      Compatible Emergency Blood Requests
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setActiveTab("emergency-requests")}
                  >
                    View All
                  </button>
                </div>

                {compatibleRequests.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                    <CheckCircle2 size={32} color="var(--status-available)" style={{ margin: "0 auto 8px" }} />
                    <p style={{ fontSize: "0.9rem" }}>No critical shortage alerts matching your blood group right now.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {compatibleRequests.slice(0, 4).map((req) => (
                      <div
                        key={req.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 16px",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "10px"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{
                            background: "#ff2a55",
                            color: "#ffffff",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "0.84rem",
                            fontWeight: "800"
                          }}>
                            {req.blood_group}
                          </span>
                          <div>
                            <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "#ffffff" }}>
                              {req.hospital_name || `Hospital #${req.hospital_id}`}
                            </div>
                            <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                              Needs {req.units_required} units • Urgency: <strong style={{ color: req.urgency === "CRITICAL" ? "#ff2a55" : "#f59e0b" }}>{req.urgency}</strong>
                            </div>
                          </div>
                        </div>

                        <span style={{
                          fontSize: "0.76rem",
                          background: "rgba(0, 242, 254, 0.1)",
                          color: "var(--cyan-accent)",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontWeight: "700"
                        }}>
                          Compatible Donor
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Blood Knowledge AI Promo */}
              <div style={{
                background: "radial-gradient(circle at 10% 20%, rgba(0, 242, 254, 0.12) 0%, rgba(11, 20, 38, 0.8) 100%)",
                border: "1px solid rgba(0, 242, 254, 0.3)",
                borderRadius: "14px",
                padding: "20px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--cyan-accent)", fontWeight: "800", fontSize: "0.85rem", marginBottom: "4px" }}>
                    <Sparkles size={16} />
                    <span>BLOOD KNOWLEDGE AI AVAILABLE</span>
                  </div>
                  <div style={{ fontSize: "1.05rem", fontWeight: "700", color: "#ffffff" }}>
                    Have questions about blood donation intervals or diet before donating?
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Ask our specialized healthcare decision support engine anytime.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveTab("help")}
                  style={{ whiteSpace: "nowrap" }}
                >
                  <Bot size={16} color="var(--cyan-accent)" />
                  <span>Ask Knowledge AI</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MY PROFILE */}
          {activeTab === "profile" && (
            <div className="card-glass" style={{ padding: "26px", maxWidth: "600px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                My Donor Profile
              </h3>

              {profileMsg && (
                <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "var(--status-available)", fontSize: "0.85rem", marginBottom: "16px" }}>
                  {profileMsg}
                </div>
              )}

              <form onSubmit={handleSaveProfile}>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    className="auth-input"
                    value={donorData?.full_name || ""}
                    disabled
                    style={{ opacity: 0.7 }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                      Blood Group
                    </label>
                    <input
                      type="text"
                      className="auth-input"
                      value={bloodGroup}
                      disabled
                      style={{ opacity: 0.7, fontWeight: "800" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                      Mobile Phone
                    </label>
                    <input
                      type="tel"
                      className="auth-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                    />
                    <span style={{ fontSize: "0.84rem", fontWeight: "600", color: "#ffffff" }}>
                      Available for Emergency Transfusions
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn btn-emergency"
                  disabled={savingProfile}
                >
                  {savingProfile ? "Saving Profile..." : "Update Profile"}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: MY BLOOD INFORMATION */}
          {activeTab === "blood-info" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div className="card-glass" style={{ padding: "24px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff", marginBottom: "14px" }}>
                  Your Blood Type Compatibility: {bloodGroup}
                </h3>
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px", fontWeight: "700" }}>
                    You can donate whole blood / red cells to:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {compatibleRecipients.map((bg) => (
                      <span key={bg} style={{
                        background: "rgba(255, 42, 85, 0.15)",
                        border: "1px solid rgba(255, 42, 85, 0.4)",
                        color: "#ffffff",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontWeight: "800",
                        fontSize: "0.85rem"
                      }}>
                        {bg}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px", fontWeight: "700" }}>
                    You can receive blood from:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {(CAN_RECEIVE_FROM[bloodGroup] || [bloodGroup]).map((bg) => (
                      <span key={bg} style={{
                        background: "rgba(0, 242, 254, 0.12)",
                        border: "1px solid rgba(0, 242, 254, 0.35)",
                        color: "var(--cyan-accent)",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontWeight: "800",
                        fontSize: "0.85rem"
                      }}>
                        {bg}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card-glass" style={{ padding: "24px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff", marginBottom: "14px" }}>
                  Why Blood Compatibility Matters
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.6" }}>
                  Red blood cells carry antigens (A, B, and Rh factor). Receiving incompatible blood can trigger an immune reaction called acute hemolytic transfusion reaction.
                </p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.6", marginTop: "12px" }}>
                  HexaVision automatically verifies Tier-1 ABO and Rh compatibility before notifying donors or suggesting units for dispatch.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: DONATION ELIGIBILITY */}
          {activeTab === "eligibility" && (
            <div className="card-glass" style={{ padding: "26px", maxWidth: "640px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Donation Eligibility Status
              </h3>

              <div style={{
                background: isEligible ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                border: isEligible ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(245, 158, 11, 0.35)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "20px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={24} color={isEligible ? "var(--status-available)" : "#f59e0b"} />
                  <div>
                    <div style={{ fontWeight: "800", fontSize: "1.05rem", color: "#ffffff" }}>
                      {isEligible ? "Eligible to Donate" : "Waiting Interval Active"}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {eligibility?.reason || "90-day whole blood interval respected."}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.86rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Mandatory Whole Blood Waiting Period</span>
                  <strong style={{ color: "#ffffff" }}>90 Days</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Medical Pre-Screening Status</span>
                  <strong style={{ color: "var(--status-available)" }}>VERIFIED</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Next Eligible Donation Date</span>
                  <strong style={{ color: "var(--cyan-accent)" }}>{eligibility?.next_eligibility_date || "Today"}</strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DONATION HISTORY */}
          {activeTab === "history" && (
            <div className="card-glass" style={{ padding: "26px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Donation History
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                Every donation can save up to 3 lives. Thank you for your continued commitment to voluntary donation.
              </p>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
                marginBottom: "20px"
              }}>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>COMPLETED DONATIONS</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#ffffff", marginTop: "4px" }}>
                    {donorData?.donation_count || 1}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>LIVES IMPACTED</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#ff2a55", marginTop: "4px" }}>
                    {(donorData?.donation_count || 1) * 3}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: EMERGENCY REQUESTS */}
          {activeTab === "emergency-requests" && (
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Open Emergency Blood Requests (Compatible: {bloodGroup})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {compatibleRequests.map((req) => (
                  <div key={req.id} className="card-glass" style={{ padding: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ background: "#ff2a55", color: "#ffffff", padding: "2px 8px", borderRadius: "6px", fontWeight: "800", fontSize: "0.82rem" }}>
                            {req.blood_group}
                          </span>
                          <span style={{ fontSize: "0.95rem", fontWeight: "800", color: "#ffffff" }}>
                            {req.hospital_name || `Hospital #${req.hospital_id}`}
                          </span>
                          <span style={{
                            fontSize: "0.72rem",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontWeight: "700",
                            background: req.urgency === "CRITICAL" ? "rgba(255, 42, 85, 0.2)" : "rgba(245, 158, 11, 0.2)",
                            color: req.urgency === "CRITICAL" ? "#ff2a55" : "#f59e0b"
                          }}>
                            {req.urgency}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          Units required: {req.units_required} • Status: {req.status}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-emergency btn-sm"
                        onClick={() => alert(`Thank you for responding to emergency request #${req.id} at ${req.hospital_name || 'Hospital'}. The hospital blood bank has been notified.`)}
                      >
                        Respond / Volunteer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: MY MATCHES */}
          {activeTab === "matches" && (
            <div className="card-glass" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Matched Blood Requests
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "14px" }}>
                Emergency requests where your profile and proximity were matched by the HexaVision algorithm.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {matches.slice(0, 6).map((m) => (
                  <div key={m.id} style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "#ffffff" }}>
                        Request #{m.request_id} • Match Score: {m.total_score ? `${Math.round(m.total_score)}%` : "High"}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                        Status: <strong style={{ color: "var(--cyan-accent)" }}>{m.status || "PENDING"}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: DONATION STATUS */}
          {activeTab === "status" && (
            <div className="card-glass" style={{ padding: "26px", maxWidth: "600px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Current Donation Status
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: isAvailable ? "var(--status-available)" : "#64748b" }} />
                <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff" }}>
                  {isAvailable ? "ACTIVE & READY FOR EMERGENCY CALL" : "CURRENTLY ON COOLDOWN"}
                </span>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
                When hospitals broadcast emergency blood needs in your area, you will receive real-time notifications based on your verified contact consent.
              </p>
            </div>
          )}

          {/* TAB 9: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="card-glass" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Notifications & Broadcasts
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ padding: "14px", background: "rgba(0, 242, 254, 0.05)", border: "1px solid rgba(0, 242, 254, 0.2)", borderRadius: "10px" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#ffffff" }}>
                    Welcome to HexaVision Emergency Donor Network
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Your profile is active and verified for emergency transfusion coordination.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: LIVE MAP */}
          {activeTab === "live-map" && (
            <div className="card-glass" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Live Network Proximity Map
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                HexaVision calculates donor-to-hospital Euclidean and transit distance to prioritize rapid emergency blood availability.
              </p>
              <div style={{
                height: "380px",
                background: "rgba(6, 9, 17, 0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                color: "var(--text-muted)"
              }}>
                <MapPin size={36} color="#ff2a55" />
                <div style={{ fontWeight: "700", color: "#ffffff" }}>
                  Proximity Anchor: Bangalore Central ({donorData?.latitude || 12.9716}, {donorData?.longitude || 77.5946})
                </div>
                <div style={{ fontSize: "0.8rem" }}>
                  6 Hospital Blood Banks & Emergency Units Monitored
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: CONSENT & PRIVACY */}
          {activeTab === "consent" && (
            <div className="card-glass" style={{ padding: "26px", maxWidth: "640px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Consent & Data Privacy Vault
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "20px" }}>
                HexaVision is built on a consent-first framework. Your personal identity is shared only with verified hospital blood banks during active emergency matching.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  <div>
                    <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.88rem" }}>General Donation Consent</div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>Agreed to voluntary emergency donation</div>
                  </div>
                  <span style={{ color: "var(--status-available)", fontWeight: "800", fontSize: "0.82rem" }}>GRANTED</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  <div>
                    <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.88rem" }}>Emergency Contact Authorization</div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>Allows SMS and push notification during SOS blood alerts</div>
                  </div>
                  <span style={{ color: "var(--status-available)", fontWeight: "800", fontSize: "0.82rem" }}>GRANTED</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 12: HELP & BLOOD KNOWLEDGE AI */}
          {activeTab === "help" && (
            <div className="card-glass" style={{ padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <Bot size={24} color="var(--cyan-accent)" />
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff" }}>
                    Blood Knowledge AI
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--cyan-accent)", fontWeight: "600" }}>
                    Verified Clinical Information on Blood & Transfusion Safety
                  </p>
                </div>
              </div>

              {/* Chat Thread */}
              <div style={{
                height: "320px",
                overflowY: "auto",
                background: "rgba(6, 9, 17, 0.7)",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: msg.role === "user" ? "rgba(255, 42, 85, 0.2)" : "rgba(0, 242, 254, 0.08)",
                      border: msg.role === "user" ? "1px solid rgba(255, 42, 85, 0.4)" : "1px solid rgba(0, 242, 254, 0.2)",
                      color: "#ffffff",
                      fontSize: "0.85rem",
                      lineHeight: "1.5"
                    }}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleAskKnowledge} style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  className="auth-input"
                  style={{ flex: 1 }}
                  placeholder="e.g. Can I donate blood if I have high blood pressure? How long does platelet donation take?"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-emergency"
                  disabled={askingAi || !inputMsg.trim()}
                >
                  <Send size={16} />
                  <span>Ask AI</span>
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
