import React, { useState, useEffect, useMemo } from "react";
import { Users, Search, MapPin, Plus, RefreshCw, Clock, ShieldCheck, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
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

const daysBetween = (start, end) => {
  const startDate = dateValue(start);
  const endDate = dateValue(end);
  if (!startDate || !endDate) return 0;
  const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

export default function DonorNetworkPage({ onNavigateToRegister }) {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bloodFilter, setBloodFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "eligible" | "not_eligible" | "available_only"

  const loadDonors = async () => {
    try {
      setLoading(true);
      const res = await api.getDonors();
      const donorList = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];

      const normalized = donorList.map((donor) => {
        const isEligible = donor.isEligible === true || donor.eligible === true || donor.eligibility_status === "ELIGIBLE";
        const daysRemaining = donor.days_remaining != null
          ? donor.days_remaining
          : (donor.next_eligibility_date && !isEligible ? daysBetween(new Date(), donor.next_eligibility_date) : 0);

        return {
          ...donor,
          isEligible,
          eligible: isEligible,
          eligibility_status: isEligible ? "ELIGIBLE" : "NOT_ELIGIBLE",
          reason: donor.eligibility_reason || donor.reason || (isEligible ? "Verified eligible" : "Donation cycle not completed"),
          days_remaining: daysRemaining,
          is_available: donor.is_available === true || donor.availability === true,
          donation_consent: donor.donation_consent === true || donor.consent === true,
          emergency_contact_consent: donor.emergency_contact_consent === true
        };
      });

      setDonors(normalized);
    } catch (err) {
      console.error("Error loading donors:", err);
      setDonors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonors();
  }, []);

  // Filter based on blood group and search
  const baseFilteredDonors = useMemo(() => {
    return donors.filter((donor) => {
      const matchesBlood = bloodFilter === "ALL" || donor.blood_group === bloodFilter;
      const matchesSearch =
        !searchTerm ||
        donor.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donor.phone?.includes(searchTerm) ||
        donor.email?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesBlood && matchesSearch;
    });
  }, [donors, bloodFilter, searchTerm]);

  // Dynamic counts based on current blood/search filter or total network
  const counts = useMemo(() => {
    const total = baseFilteredDonors.length;
    const eligible = baseFilteredDonors.filter((d) => d.isEligible).length;
    const notEligible = baseFilteredDonors.filter((d) => !d.isEligible).length;
    const availableOnly = baseFilteredDonors.filter((d) => d.isEligible && d.is_available && d.donation_consent).length;
    return { total, eligible, notEligible, availableOnly };
  }, [baseFilteredDonors]);

  // Final list filtered by selected active category filter
  const displayedDonors = useMemo(() => {
    return baseFilteredDonors.filter((donor) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "eligible") return donor.isEligible;
      if (activeFilter === "not_eligible") return !donor.isEligible;
      if (activeFilter === "available_only") {
        return donor.isEligible && donor.is_available && donor.donation_consent;
      }
      return true;
    });
  }, [baseFilteredDonors, activeFilter]);

  const renderCard = (donor) => {
    const isEligible = donor.isEligible;
    const distanceDisplay = donor.distance_km != null ? `${Number(donor.distance_km).toFixed(1)} km` : "Bangalore Zone";
    const nextEligibility = donor.next_eligibility_date ? formatDate(donor.next_eligibility_date) : "Immediate";
    const lastDonation = donor.last_donation_date ? formatDate(donor.last_donation_date) : "Never (First-time donor)";
    const daysRemaining = donor.days_remaining ?? (donor.next_eligibility_date ? daysBetween(new Date(), donor.next_eligibility_date) : 0);

    if (isEligible) {
      return (
        <div
          key={donor.id}
          className="glass-panel"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            padding: "18px",
            border: "1px solid rgba(34, 197, 94, 0.35)",
            background: "linear-gradient(180deg, rgba(8, 14, 28, 0.85) 0%, rgba(13, 30, 22, 0.6) 100%)",
            borderRadius: "14px",
            transition: "all 0.2s ease"
          }}
        >
          {/* Top Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <span>🩸 DONOR #{String(donor.id).padStart(4, "0")}</span>
                <span>•</span>
                <span>{distanceDisplay}</span>
              </div>
              <h3 style={{ margin: "4px 0 0", fontSize: "1.12rem", fontWeight: 800, color: "#f8fafc" }}>
                {donor.full_name}
              </h3>
            </div>
            <span className="blood-badge" style={{ fontSize: "1rem", padding: "4px 10px", minWidth: "42px", textAlign: "center" }}>
              {donor.blood_group}
            </span>
          </div>

          {/* Key Metrics / Attributes */}
          <div style={{ display: "grid", gap: "8px", fontSize: "0.82rem", background: "rgba(15, 23, 42, 0.5)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-muted)" }}>Status</span>
              <strong style={{ color: "#34d399", display: "flex", alignItems: "center", gap: "4px" }}>
                🟢 ELIGIBLE
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-muted)" }}>Last Donation Date</span>
              <strong style={{ color: "#f8fafc" }}>{lastDonation}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-muted)" }}>Next Eligible Date</span>
              <strong style={{ color: "#34d399" }}>{nextEligibility}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-muted)" }}>Availability</span>
              <strong style={{ color: donor.is_available ? "#34d399" : "#f87171" }}>
                {donor.is_available ? "🟢 Available" : "🔴 Unavailable (Busy)"}
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-muted)" }}>Consent Status</span>
              <strong style={{ color: donor.donation_consent ? "#34d399" : "#f87171", display: "flex", alignItems: "center", gap: "4px" }}>
                <ShieldCheck size={14} />
                {donor.donation_consent ? "✓ Consent Verified" : "Pending"}
              </strong>
            </div>

            {donor.medical_conditions && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)" }}>Health Notes</span>
                <span style={{ color: "#cbd5e1", fontSize: "0.75rem", maxWidth: "160px", textAlign: "right" }}>
                  {donor.medical_conditions}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px", fontSize: "0.75rem", color: "var(--text-dim)" }}>
            <span>Phone: {donor.phone}</span>
            <span style={{ color: "#34d399" }}>90-Day Cycle Complete</span>
          </div>
        </div>
      );
    }

    // NOT ELIGIBLE CARD
    const reasonText = donor.reason || "Donation cycle not completed";
    return (
      <div
        key={donor.id}
        className="glass-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          padding: "18px",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          background: "linear-gradient(180deg, rgba(8, 14, 28, 0.85) 0%, rgba(35, 14, 18, 0.6) 100%)",
          borderRadius: "14px",
          transition: "all 0.2s ease"
        }}
      >
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <span>🩸 DONOR #{String(donor.id).padStart(4, "0")}</span>
              <span>•</span>
              <span>{distanceDisplay}</span>
            </div>
            <h3 style={{ margin: "4px 0 0", fontSize: "1.12rem", fontWeight: 800, color: "#f8fafc" }}>
              {donor.full_name}
            </h3>
          </div>
          <span className="blood-badge" style={{ fontSize: "1rem", padding: "4px 10px", minWidth: "42px", textAlign: "center", borderColor: "rgba(239, 68, 68, 0.4)" }}>
            {donor.blood_group}
          </span>
        </div>

        {/* Key Metrics / Attributes */}
        <div style={{ display: "grid", gap: "8px", fontSize: "0.82rem", background: "rgba(15, 23, 42, 0.5)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)" }}>Status</span>
            <strong style={{ color: "#f87171", display: "flex", alignItems: "center", gap: "4px" }}>
              🔴 NOT ELIGIBLE
            </strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)" }}>Last Donation Date</span>
            <strong style={{ color: "#f8fafc" }}>{lastDonation}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)" }}>Next Eligible Date</span>
            <strong style={{ color: "#fbbf24" }}>{nextEligibility}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)" }}>Days Remaining</span>
            <strong style={{ color: "#f87171", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={13} /> {daysRemaining} days
            </strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)" }}>Reason</span>
            <span style={{ color: "#fca5a5", fontWeight: 600, fontSize: "0.78rem" }}>{reasonText}</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px", fontSize: "0.75rem", color: "var(--text-dim)" }}>
          <span>Phone: {donor.phone}</span>
          <span style={{ color: "#f87171" }}>Cooldown in progress</span>
        </div>
      </div>
    );
  };

  const filterButtons = [
    {
      id: "all",
      label: "ALL DONORS",
      count: counts.total,
      icon: null,
      color: "#f8fafc",
      bgActive: "rgba(255, 255, 255, 0.15)",
      borderActive: "rgba(255, 255, 255, 0.4)"
    },
    {
      id: "eligible",
      label: "ELIGIBLE",
      count: counts.eligible,
      icon: "🟢",
      color: "#86efac",
      bgActive: "linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(16, 185, 129, 0.15))",
      borderActive: "rgba(34, 197, 94, 0.6)"
    },
    {
      id: "not_eligible",
      label: "NOT ELIGIBLE",
      count: counts.notEligible,
      icon: "🔴",
      color: "#fca5a5",
      bgActive: "linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(220, 38, 38, 0.15))",
      borderActive: "rgba(239, 68, 68, 0.6)"
    },
    {
      id: "available_only",
      label: "AVAILABLE ONLY",
      count: counts.availableOnly,
      icon: "⚡",
      color: "#67e8f9",
      bgActive: "linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(14, 165, 233, 0.15))",
      borderActive: "rgba(6, 182, 212, 0.6)"
    }
  ];

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
            <Users size={26} color="var(--blood-red)" />
            Consented Donor Network
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Autonomous, consent-verified blood donor directory with live donation cycle cooldown tracking
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary" onClick={loadDonors} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
          </button>
          <button className="btn btn-emergency" onClick={onNavigateToRegister}>
            <Plus size={16} /> Register as Donor
          </button>
        </div>
      </div>

      {/* 4 Interactive Category Filter Blocks */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {filterButtons.map((btn) => {
          const isActive = activeFilter === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => setActiveFilter(btn.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: isActive ? btn.bgActive : "rgba(15, 23, 42, 0.65)",
                border: isActive ? `1.5px solid ${btn.borderActive}` : "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: isActive ? "0 4px 20px rgba(0, 0, 0, 0.35)" : "none",
                transform: isActive ? "translateY(-1px)" : "none"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "0.82rem", color: btn.color }}>
                {btn.icon && <span>{btn.icon}</span>}
                <span>{btn.label}</span>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 800,
                  fontSize: "1.1rem",
                  color: isActive ? "#ffffff" : "var(--text-dim)",
                  background: "rgba(0, 0, 0, 0.3)",
                  padding: "2px 10px",
                  borderRadius: "6px"
                }}
              >
                {btn.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Blood Group Filters */}
      <div className="glass-panel" style={{ padding: "16px 20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
            <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "12px" }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "36px" }}
              placeholder="Search donor by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginRight: "4px" }}>Blood Group:</span>
            {[
              { key: "ALL", label: "All" },
              "O-",
              "O+",
              "A-",
              "A+",
              "B-",
              "B+",
              "AB-",
              "AB+"
            ].map((bg) => {
              const value = typeof bg === "string" ? bg : bg.key;
              const label = typeof bg === "string" ? bg : bg.label;
              const selected = bloodFilter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBloodFilter(value)}
                  className={`btn btn-sm ${selected ? "btn-emergency" : "btn-secondary"}`}
                  style={{ fontSize: "0.75rem", padding: "5px 9px", minWidth: "36px" }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
          <div className="spin" style={{ width: "28px", height: "28px", border: "2px solid rgba(255,42,85,0.2)", borderTopColor: "var(--blood-red)", borderRadius: "50%", margin: "0 auto 12px" }} />
          <p>Loading verified donor records...</p>
        </div>
      ) : displayedDonors.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "60px 20px" }}>
          <AlertTriangle size={32} color="var(--text-dim)" style={{ margin: "0 auto 10px" }} />
          <h3>No donors found in this filter category</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "6px" }}>
            Try selecting a different filter tab, blood group, or clear the search box.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px" }}>
          {displayedDonors.map(renderCard)}
        </div>
      )}
    </div>
  );
}
