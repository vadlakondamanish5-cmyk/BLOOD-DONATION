import React, { useState } from "react";
import { 
  Search, 
  Clock, 
  MapPin, 
  Hospital, 
  Plus, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  Filter
} from "lucide-react";
import BloodDropIcon from "../components/BloodDropIcon";

export default function EmergencyRequestsPage({ 
  requests = [], 
  loading, 
  onInspectRequest, 
  onOpenNewRequestModal,
  onRefresh
}) {
  const [urgencyFilter, setUrgencyFilter] = useState("ALL");
  const [bloodFilter, setBloodFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRequests = requests.filter((r) => {
    if (urgencyFilter !== "ALL" && r.urgency !== urgencyFilter) return false;
    if (bloodFilter !== "ALL" && r.blood_group !== bloodFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const hosp = (r.hospital_name || "").toLowerCase();
      const bg = (r.blood_group || "").toLowerCase();
      if (!hosp.includes(q) && !bg.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Top Title & Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
            <BloodDropIcon size={24} color="var(--blood-red)" className="logo-blood-pulse" />
            Emergency Blood Demands
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Verified hospital emergency requests ranked by trauma severity and transfusion deadline
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary" onClick={onRefresh}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-emergency" onClick={onOpenNewRequestModal}>
            <Plus size={16} /> Post Emergency Request
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel" style={{ padding: "16px 20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "12px" }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "36px" }}
              placeholder="Filter by hospital name, blood group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Urgency Filter Pills */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: "700", textTransform: "uppercase" }}>Urgency:</span>
            {["ALL", "CRITICAL", "URGENT", "NORMAL"].map((u) => (
              <button
                key={u}
                className={`btn btn-sm ${urgencyFilter === u ? "btn-emergency" : "btn-secondary"}`}
                onClick={() => setUrgencyFilter(u)}
                style={{ fontSize: "0.75rem", padding: "4px 10px" }}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Blood Type Filter Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: "700", textTransform: "uppercase" }}>Blood:</span>
            <select
              className="form-select"
              style={{ width: "100px", padding: "6px 10px", fontSize: "0.85rem" }}
              value={bloodFilter}
              onChange={(e) => setBloodFilter(e.target.value)}
            >
              <option value="ALL">All</option>
              {["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Requests Feed */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ color: "var(--blood-red)", margin: "0 auto 12px" }}>
            <BloodDropIcon size={32} color="var(--blood-red)" className="logo-blood-pulse" />
          </div>
          <p style={{ color: "var(--text-muted)" }}>Loading emergency blood queue...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "50px 20px" }}>
          <AlertCircle size={40} color="var(--text-dim)" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>No blood requests found</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Try resetting your filters or create a new blood request.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filteredRequests.map((req) => {
            const isCritical = req.urgency === "CRITICAL";
            return (
              <div
                key={req.id}
                className={`glass-panel ${isCritical ? "critical-glow-card" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "20px"
                }}
              >
                {/* Left: Blood Group, Hospital, Urgency */}
                <div style={{ display: "flex", alignItems: "center", gap: "18px", minWidth: "280px" }}>
                  <div className="blood-badge" style={{ width: "54px", height: "54px", fontSize: "1.3rem" }}>
                    {req.blood_group}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className={`status-pill status-${req.urgency.toLowerCase()}`}>
                        {isCritical ? "🚨 CRITICAL" : req.urgency}
                      </span>
                      <span className="status-pill status-matching">
                        {req.status}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                        Request #{req.id}
                      </span>
                    </div>
                    <div style={{ fontWeight: "800", fontSize: "1.1rem" }}>
                      {req.hospital_name}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "12px", marginTop: "3px" }}>
                      <span>📞 {req.hospital_phone}</span>
                      <span>•</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} /> Needed by {new Date(req.required_by).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(req.required_by).toLocaleDateString()})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle: Units & Matches count */}
                <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Units Demanded</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: "800", fontFamily: "var(--font-mono)" }}>
                      {req.units_required} <span style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontWeight: "500" }}>Bags</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Ranked Candidates</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "var(--cyan-accent)", fontFamily: "var(--font-mono)" }}>
                      {req.matched_donor_count ?? req.total_matches ?? 4}
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "4px", fontWeight: "500" }}>
                        Potential Matches
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    className="btn btn-cyan"
                    onClick={() => onInspectRequest(req.id)}
                  >
                    <span>Inspect Matches</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
