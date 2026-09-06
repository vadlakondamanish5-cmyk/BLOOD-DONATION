import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Lock, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar, 
  MapPin, 
  Plus, 
  RefreshCw,
  Clock
} from "lucide-react";
import { api } from "../api/api";

export default function DonorNetworkPage({ onNavigateToRegister }) {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bloodFilter, setBloodFilter] = useState("ALL");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadDonors = async () => {
    try {
      setLoading(true);
      const params = {};
      if (bloodFilter !== "ALL") params.blood_group = bloodFilter;
      if (availableOnly) params.is_available = "true";
      if (searchTerm) params.search = searchTerm;

      const res = await api.getDonors(params);
      setDonors(res.data || []);
    } catch (err) {
      console.error("Error loading donors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonors();
  }, [bloodFilter, availableOnly, searchTerm]);

  const calculateDaysAgo = (dateStr) => {
    if (!dateStr) return "Never (First-time eligible)";
    const diff = Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
    return `${diff} days ago`;
  };

  return (
    <div>
      {/* Header */}
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

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: "16px 20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "12px" }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "36px" }}
              placeholder="Search donor by name or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Blood group pills */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
            {["ALL", "O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"].map((bg) => (
              <button
                key={bg}
                className={`btn btn-sm ${bloodFilter === bg ? "btn-emergency" : "btn-secondary"}`}
                onClick={() => setBloodFilter(bg)}
                style={{ fontSize: "0.75rem", padding: "5px 10px" }}
              >
                {bg}
              </button>
            ))}
          </div>

          {/* Availability checkbox */}
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

      {/* Donors Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
          <p>Loading verified donor records...</p>
        </div>
      ) : donors.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "50px 20px" }}>
          <h3>No available donors found nearby</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "6px" }}>
            Try broadening your blood group filter or register as a new donor.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px" }}>
          {donors.map((d) => (
            <div 
              key={d.id} 
              className="glass-panel"
              style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "16px" }}
            >
              {/* Top Row: Blood Group & Availability */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span className="blood-badge">{d.blood_group}</span>
                
                <div style={{ textAlign: "right" }}>
                  <span className={`status-pill ${d.is_available ? "status-available" : "status-normal"}`} style={{ fontSize: "0.68rem" }}>
                    {d.is_available ? "● Available" : "⏳ Cooling Period"}
                  </span>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "4px" }}>
                    ID #{d.id} • Bangalore Metro
                  </div>
                </div>
              </div>

              {/* Middle: Donor Details */}
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff", marginBottom: "4px" }}>
                  {d.full_name}
                </h3>

                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <MapPin size={14} color="var(--text-dim)" />
                    <span>Active in Emergency Radius (2 - 12 km)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Clock size={14} color="var(--text-dim)" />
                    <span>Last donation: <strong>{calculateDaysAgo(d.last_donation_date)}</strong></span>
                  </div>
                </div>
              </div>

              {/* Bottom: Privacy Lock & Potential Match Tag */}
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: "var(--text-dim)" }}>
                  <Lock size={12} color="var(--cyan-accent)" />
                  <span>Private Screening Protected</span>
                </div>

                <span 
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: "700",
                    color: "var(--cyan-accent)",
                    background: "rgba(0, 242, 254, 0.1)",
                    border: "1px solid var(--border-cyan)",
                    padding: "3px 8px",
                    borderRadius: "6px"
                  }}
                >
                  Potential Match
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
