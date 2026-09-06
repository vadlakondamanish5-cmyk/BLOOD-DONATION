import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Radio, 
  Clock, 
  MapPin, 
  Hospital, 
  CheckCircle2, 
  AlertOctagon,
  Users,
  ChevronRight,
  RefreshCw
} from "lucide-react";

export default function BloodRequests({ 
  requests, 
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
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "800", letterSpacing: "-0.5px" }}>Blood Requests & SOS Hub</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Real-time emergency blood requests and algorithm-matched donor pipelines.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary" onClick={onRefresh}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-danger btn-pulse" onClick={onOpenNewRequestModal}>
            <Plus size={18} strokeWidth={3} /> Post Blood Request
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: "16px 20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          {/* Search input */}
          <div style={{ position: "relative", flex: "1", minWidth: "220px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "12px", color: "var(--text-muted)" }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "36px" }}
              placeholder="Search by hospital name or blood group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Urgency Filter Pills */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>Urgency:</span>
            {["ALL", "CRITICAL", "URGENT", "NORMAL"].map((u) => (
              <button
                key={u}
                className={`btn btn-sm ${urgencyFilter === u ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setUrgencyFilter(u)}
                style={{ fontSize: "0.75rem", padding: "4px 10px" }}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Blood Group Filter Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>Blood:</span>
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

      {/* Requests Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
          <div className="pulse-dot-cyan" style={{ margin: "0 auto 12px" }}></div>
          <p>Loading blood requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <AlertOctagon size={40} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
          <h3>No blood requests match your filters</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "6px" }}>
            Try resetting your filters or post a new blood request.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filteredRequests.map((req) => {
            const isCritical = req.urgency === "CRITICAL";
            return (
              <div
                key={req.id}
                className="glass-card"
                style={{
                  borderLeft: isCritical ? "4px solid #ff3b5c" : req.urgency === "URGENT" ? "4px solid #f59e0b" : "4px solid #10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "20px"
                }}
              >
                {/* Left section: Hospital & Urgency */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: "280px" }}>
                  <div className={`blood-pill ${isCritical ? "" : "blood-pill-cyan"}`} style={{ width: "52px", height: "52px", fontSize: "1.25rem" }}>
                    {req.blood_group}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className={`badge badge-${req.urgency.toLowerCase()}`}>
                        {req.urgency}
                      </span>
                      <span className={`badge badge-${req.status.toLowerCase()}`}>
                        {req.status}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        #{req.id}
                      </span>
                    </div>
                    <div style={{ fontSize: "1.05rem", fontWeight: "700" }}>
                      {req.hospital_name}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "12px", marginTop: "3px" }}>
                      <span>📞 {req.hospital_phone}</span>
                      <span>•</span>
                      <span>Needed by: {new Date(req.required_by).toLocaleDateString()} {new Date(req.required_by).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Middle: Units & Match Stats */}
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Units Needed</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: "800" }}>
                      {req.units_required} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>units</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Ranked Matches</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Users size={16} color="var(--cyan-accent)" />
                      <span style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--cyan-accent)" }}>
                        {req.total_matches || 0}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        ({req.accepted_matches || 0} accepted)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => onInspectRequest(req.id)}
                  >
                    Inspect Matches <ChevronRight size={16} />
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
