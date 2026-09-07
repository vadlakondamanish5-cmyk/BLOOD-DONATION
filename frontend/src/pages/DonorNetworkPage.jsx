import React, { useState, useEffect } from "react";
import { Users, Search, Lock, MapPin, Plus, RefreshCw, Clock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { api } from "../api/api";

const DEFAULT_FILTER = "eligible";

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
  if (!startDate || !endDate) return null;
  const diff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

const getEligibilityState = (donor) => {
  const summary = donor?.eligibility_status || donor?.eligibilityReason || donor?.reason || "ELIGIBLE";
  const status = String(summary).toUpperCase();

  if (status === "ELIGIBLE" || donor?.eligible === true) return "eligible";
  if (status === "PRELIMINARY_ELIGIBILITY_REACHED") return "preliminary";
  return "not_eligible";
};

export default function DonorNetworkPage({ onNavigateToRegister }) {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bloodFilter, setBloodFilter] = useState("ALL");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState(DEFAULT_FILTER);

  const loadDonors = async () => {
    try {
      setLoading(true);
      const params = {};
      if (bloodFilter !== "ALL") params.blood_group = bloodFilter;
      if (availableOnly) params.is_available = "true";
      if (searchTerm) params.search = searchTerm;

      const res = await api.getDonors(params);
      const donorList = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
      setDonors(donorList.map((donor) => ({
        ...donor,
        eligibility_status: donor.eligibility_status || (donor.eligible ? "ELIGIBLE" : "NOT_ELIGIBLE"),
        reason: donor.eligibility_reason || donor.reason || (donor.eligible ? "Verified eligible" : "Donation cycle not completed"),
        days_remaining: donor.days_remaining ?? (donor.next_eligibility_date && !donor.eligible ? daysBetween(new Date(), donor.next_eligibility_date) : 0)
      })));
    } catch (err) {
      console.error("Error loading donors:", err);
      setDonors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonors();
  }, [bloodFilter, availableOnly, searchTerm]);

  const processedDonors = donors.filter((donor) => {
    const donorState = getEligibilityState(donor);
    const selectedState = activeFilter === "eligible" ? "eligible" : "not_eligible";
    const categoryMatches = donorState === selectedState || (selectedState === "not_eligible" && donorState !== "eligible");
    const matchesSearch = !searchTerm || donor.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || donor.phone?.includes(searchTerm);
    return categoryMatches && matchesSearch;
  });

  const eligibleCount = donors.filter((d) => getEligibilityState(d) === "eligible").length;
  const notEligibleCount = donors.filter((d) => getEligibilityState(d) !== "eligible").length;

  const calculateDaysAgo = (dateStr) => {
    if (!dateStr) return "Never (First-time eligible)";
    const diff = Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
    return `${diff} days ago`;
  };

  const renderCard = (donor) => {
    const isEligible = getEligibilityState(donor) === "eligible";
    const isPreliminary = donor.eligibility_status === "PRELIMINARY_ELIGIBILITY_REACHED" || donor.medical_verification_status === "PENDING";
    const donorDistance = donor.distance_km != null ? `${Number(donor.distance_km).toFixed(1)} km` : "Distance pending";
    const nextEligibility = donor.next_eligibility_date ? formatDate(donor.next_eligibility_date) : "—";
    const daysRemaining = donor.days_remaining ?? (donor.next_eligibility_date ? daysBetween(new Date(), donor.next_eligibility_date) : 0);

    if (isEligible) {
      return (
        <div key={donor.id} className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "18px", border: "1px solid rgba(34, 197, 94, 0.32)", transform: "translateY(0)", transition: "all 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ color: "#f8fafc", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7 }}>🩸 Donor</div>
              <h3 style={{ margin: "6px 0 0", fontSize: "1.15rem", fontWeight: 800 }}>{donor.full_name}</h3>
            </div>
            <span className="blood-badge">{donor.blood_group}</span>
          </div>

          <div style={{ display: "grid", gap: "8px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>📍 Distance</span><strong style={{ color: "#f8fafc" }}>{donorDistance}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>🟢 Availability</span><strong style={{ color: "#34d399" }}>{donor.is_available || donor.availability_status === "AVAILABLE" ? "Available" : "Unavailable"}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Last Donation</span><strong style={{ color: "#f8fafc" }}>{formatDate(donor.last_donation_date) || "Never"}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Next Preliminary Eligibility</span><strong style={{ color: "#f8fafc" }}>{nextEligibility}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Donation Cycle</span><strong style={{ color: "#34d399" }}>✓ COMPLETED</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Medical Verification</span><strong style={{ color: "#34d399" }}>✓ VERIFIED</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}><span>Status</span><strong style={{ color: "#34d399" }}>🟢 ELIGIBLE</strong></div>
          </div>

          <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
            <CheckCircle2 size={15} /> View Details
          </button>
        </div>
      );
    }

    const reasonText = donor.eligibility_reason || donor.reason || "Donation cycle not completed";
    const pendingTone = isPreliminary ? { border: "1px solid rgba(250, 204, 21, 0.32)", badge: "#facc15", label: "🟡 PRELIMINARY ELIGIBILITY REACHED" } : { border: "1px solid rgba(239, 68, 68, 0.28)", badge: "#f87171", label: "🔴 NOT ELIGIBLE" };
    return (
      <div key={donor.id} className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "18px", border: pendingTone.border, transform: "translateY(0)", transition: "all 0.2s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: "#f8fafc", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7 }}>🩸 Donor</div>
            <h3 style={{ margin: "6px 0 0", fontSize: "1.15rem", fontWeight: 800 }}>{donor.full_name}</h3>
          </div>
          <span className="blood-badge">{donor.blood_group}</span>
        </div>

        <div style={{ display: "grid", gap: "8px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>📍 Distance</span><strong style={{ color: "#f8fafc" }}>{donorDistance}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>🟢 Availability</span><strong style={{ color: donor.is_available || donor.availability_status === "AVAILABLE" ? "#34d399" : "#f87171" }}>{donor.is_available || donor.availability_status === "AVAILABLE" ? "Available" : "Unavailable"}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Last Donation</span><strong style={{ color: "#f8fafc" }}>{formatDate(donor.last_donation_date) || "Never"}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Next Preliminary Eligibility</span><strong style={{ color: "#f8fafc" }}>{nextEligibility}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Donation Cycle</span><strong style={{ color: isPreliminary ? "#facc15" : "#f87171" }}>{isPreliminary ? "🟡 PRELIMINARY" : "❌ NOT COMPLETED"}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Status</span><strong style={{ color: pendingTone.badge }}>{pendingTone.label}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Reason</span><strong style={{ color: "#f8fafc" }}>{reasonText}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Eligible in</span><strong style={{ color: "#fbbf24" }}>{daysRemaining != null ? `${daysRemaining} days` : "Check pending"}</strong></div>
        </div>

        <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
          <CheckCircle2 size={15} /> View Details
        </button>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
            <Users size={24} color="var(--blood-red)" />
            Consented Donor Network
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Autonomous, consent-verified blood donor directory with protected health records
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary" onClick={loadDonors}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-emergency" onClick={onNavigateToRegister}>
            <Plus size={16} /> Register as Donor
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "16px 20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "12px" }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "36px" }}
              placeholder="Search donor by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[{ key: "eligible", label: "Eligible", tone: "green" }, { key: "not_eligible", label: "Not Eligible", tone: "red" }].map((filterOption) => {
              const isActive = activeFilter === filterOption.key;
              const count = filterOption.key === "eligible" ? eligibleCount : notEligibleCount;
              return (
                <button
                  key={filterOption.key}
                  type="button"
                  onClick={() => setActiveFilter(filterOption.key)}
                  style={{
                    border: isActive ? "1px solid transparent" : "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                    padding: "12px 18px",
                    minWidth: "180px",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    letterSpacing: "0.02em",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    background: isActive
                      ? filterOption.tone === "green"
                        ? "linear-gradient(135deg, rgba(34, 197, 94, 0.22), rgba(16, 185, 129, 0.15))"
                        : "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(248, 113, 113, 0.12))"
                      : "rgba(15, 23, 42, 0.6)",
                    color: filterOption.tone === "green" ? "#bbf7d0" : "#fecaca",
                    boxShadow: isActive ? "0 0 18px rgba(255,255,255,0.08)" : "none",
                    transform: isActive ? "translateY(-1px)" : "none",
                  }}
                >
                  {filterOption.tone === "green" ? "🟢" : "🔴"} {filterOption.label} ({count})
                </button>
              );
            })}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "600" }}>
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "var(--blood-red)" }}
            />
            Available Only
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "18px" }}>
        {[
          { key: "ALL", label: "All Blood Groups" },
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
              style={{ fontSize: "0.75rem", padding: "6px 10px" }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
          <p>Loading verified donor records...</p>
        </div>
      ) : processedDonors.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "50px 20px" }}>
          <h3>No donors match this category</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "6px" }}>
            Try another filter or search term.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px" }}>
          {processedDonors.map(renderCard)}
        </div>
      )}
    </div>
  );
}
