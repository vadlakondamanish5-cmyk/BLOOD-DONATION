import React from "react";
import { 
  AlertTriangle, 
  Users, 
  Radio, 
  CheckCircle2, 
  Zap, 
  ArrowRight, 
  Clock, 
  Hospital, 
  ShieldCheck,
  Percent
} from "lucide-react";
import BloodDropIcon from "./BloodDropIcon";

export default function Dashboard({ 
  stats, 
  loading, 
  onInspectRequest, 
  onOpenNewRequestModal, 
  onNavigateToTab 
}) {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-secondary)" }}>
        <div className="pulse-dot-cyan" style={{ margin: "0 auto 16px", width: "16px", height: "16px" }}></div>
        <p>Loading real-time command center telemetry...</p>
      </div>
    );
  }

  const donors = stats?.donors || {};
  const requests = stats?.requests || {};
  const matches = stats?.matches || {};
  const alerts = stats?.alerts || {};
  const bloodInventory = stats?.blood_inventory || [];
  const recentEmergencies = stats?.recent_emergencies || [];

  return (
    <div>
      {/* Critical Emergency Banner if there are critical requests */}
      {parseInt(requests.critical_active_requests || 0, 10) > 0 && (
        <div className="emergency-banner">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="pulse-dot"></span>
            <div>
              <strong style={{ color: "#ff4d6d", fontSize: "0.95rem" }}>
                ACTIVE CRITICAL SOS: {requests.critical_active_requests} Immediate Emergency Request(s)
              </strong>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                HexaVision Multi-Factor Algorithm has pre-matched and ranked compatible donors. Dispatch alerts now.
              </div>
            </div>
          </div>
          <button 
            className="btn btn-outline-danger btn-sm"
            onClick={() => onNavigateToTab("requests")}
          >
            Review Urgent Queue <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Top Telemetry KPI Cards */}
      <div className="grid-4" style={{ marginBottom: "28px" }}>
        {/* Active Emergency Requests */}
        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span className="form-label">Active Blood Demands</span>
            <div style={{ background: "rgba(255, 59, 92, 0.15)", padding: "8px", borderRadius: "8px", color: "#ff3b5c" }}>
              <Radio size={20} />
            </div>
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", letterSpacing: "-1px" }}>
            {requests.active_requests || 0}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "6px", fontSize: "0.8rem" }}>
            <span style={{ color: "#ff4d6d", fontWeight: "700" }}>
              {requests.critical_active_requests || 0} Critical
            </span>
            <span style={{ color: "var(--text-muted)" }}>•</span>
            <span style={{ color: "#fbbf24", fontWeight: "600" }}>
              {requests.urgent_active_requests || 0} Urgent
            </span>
          </div>
        </div>

        {/* Ready Donors */}
        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span className="form-label">Network Donors</span>
            <div style={{ background: "rgba(0, 242, 254, 0.15)", padding: "8px", borderRadius: "8px", color: "#00f2fe" }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", letterSpacing: "-1px" }}>
            {donors.available_donors || 0}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "6px" }}>
            <span style={{ color: "#10b981", fontWeight: "700" }}>100% Consent</span> ({donors.emergency_ready_donors || 0} emergency-ready)
          </div>
        </div>

        {/* Units Needed vs Fulfilled */}
        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span className="form-label">Blood Units Demand</span>
            <div style={{ background: "rgba(16, 185, 129, 0.15)", padding: "8px", borderRadius: "8px", color: "#10b981" }}>
              <BloodDropIcon size={20} color="#10b981" animated />
            </div>
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", letterSpacing: "-1px" }}>
            {requests.total_units_required || 0} <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: "500" }}>Units</span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "6px" }}>
            {requests.fulfilled_requests || 0} requests fulfilled successfully
          </div>
        </div>

        {/* Matching Precision & Alerts */}
        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span className="form-label">Avg Match Score</span>
            <div style={{ background: "rgba(168, 85, 247, 0.15)", padding: "8px", borderRadius: "8px", color: "#c084fc" }}>
              <Percent size={20} />
            </div>
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", letterSpacing: "-1px", color: "#00f2fe" }}>
            {matches.avg_match_score || 93}%
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "6px" }}>
            <span style={{ color: "#c084fc", fontWeight: "700" }}>{alerts.total_alerts_dispatched || 0}</span> alerts dispatched
          </div>
        </div>
      </div>

      {/* Main Section: Blood Inventory Grid & Urgent Queue */}
      <div className="grid-3" style={{ marginBottom: "28px" }}>
        {/* Blood Groups Live Inventory */}
        <div className="glass-card" style={{ gridColumn: "span 1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Available Blood Types</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Active consenting donors by group</p>
            </div>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateToTab("donors")}
            >
              Registry
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            {bloodInventory.map((item) => (
              <div 
                key={item.blood_group}
                style={{
                  background: "rgba(8, 14, 28, 0.7)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 8px",
                  textAlign: "center"
                }}
              >
                <div 
                  className="blood-pill blood-pill-sm" 
                  style={{ margin: "0 auto 8px" }}
                >
                  {item.blood_group}
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: "800" }}>
                  {item.available}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  donors
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "20px", padding: "12px", background: "rgba(0, 242, 254, 0.05)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-active)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "var(--cyan-accent)", fontWeight: "600" }}>
              <ShieldCheck size={16} />
              <span>Universal Donor Safeguard</span>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              O- donors are automatically reserved and prioritized for CRITICAL emergency cross-matches.
            </p>
          </div>
        </div>

        {/* Live Urgent Blood Requests Queue */}
        <div className="glass-card" style={{ gridColumn: "span 2" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Live Emergency Requests</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Ranked by urgency and deadline</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateToTab("requests")}
              >
                View All ({requests.total_requests || 0})
              </button>
              <button 
                className="btn btn-danger btn-sm"
                onClick={onOpenNewRequestModal}
              >
                + New Request
              </button>
            </div>
          </div>

          {recentEmergencies.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              No active emergency requests right now. System on standby.
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hospital</th>
                    <th>Blood</th>
                    <th>Units</th>
                    <th>Urgency</th>
                    <th>Matched</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEmergencies.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <div style={{ fontWeight: "600" }}>{req.hospital_name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Clock size={12} /> {new Date(req.required_by).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <span className="blood-pill blood-pill-sm">{req.blood_group}</span>
                      </td>
                      <td style={{ fontWeight: "700" }}>{req.units_required}</td>
                      <td>
                        <span className={`badge badge-${req.urgency.toLowerCase()}`}>
                          {req.urgency}
                        </span>
                      </td>
                      <td>
                        <span className="score-pill score-med">
                          {req.match_count} donors
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => onInspectRequest(req.id)}
                        >
                          Inspect Matches
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Matching Engine Specs Architecture Footer Card */}
      <div className="glass-card" style={{ background: "rgba(10, 15, 28, 0.9)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <Zap size={20} color="var(--cyan-accent)" />
          <h4 style={{ fontSize: "1rem", fontWeight: "700" }}>HexaVision Multi-Factor Algorithm Active Weights</h4>
        </div>
        <div className="grid-4" style={{ fontSize: "0.82rem" }}>
          <div style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
            <div style={{ color: "var(--text-secondary)", fontWeight: "600" }}>Geodesic Distance (35%)</div>
            <div style={{ color: "var(--cyan-accent)", marginTop: "4px" }}>Haversine proximity mapping &lt; 50km</div>
          </div>
          <div style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
            <div style={{ color: "var(--text-secondary)", fontWeight: "600" }}>ABO/Rh Compatibility (30%)</div>
            <div style={{ color: "#34d399", marginTop: "4px" }}>100% exact match / 85% compatible type</div>
          </div>
          <div style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
            <div style={{ color: "var(--text-secondary)", fontWeight: "600" }}>Donor Availability (20%)</div>
            <div style={{ color: "#fbbf24", marginTop: "4px" }}>Active flag & 90-day donation safety window</div>
          </div>
          <div style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
            <div style={{ color: "var(--text-secondary)", fontWeight: "600" }}>Consent & Reliability (15%)</div>
            <div style={{ color: "#c084fc", marginTop: "4px" }}>Explicit consent & SOS emergency readiness</div>
          </div>
        </div>
      </div>
    </div>
  );
}
