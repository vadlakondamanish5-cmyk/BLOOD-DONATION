import React, { useState, useEffect } from "react";
import { 
  Smartphone, 
  Bell, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  Hospital,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import BloodDropIcon from "./BloodDropIcon";
import { api } from "../services/api";

export default function DonorSimulator({ onRefreshData }) {
  const [donors, setDonors] = useState([]);
  const [selectedDonorId, setSelectedDonorId] = useState("");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [respondingId, setRespondingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  // Load donors
  useEffect(() => {
    api.getDonors()
      .then((res) => {
        const list = res.data || [];
        setDonors(list);
        if (list.length > 0 && !selectedDonorId) {
          setSelectedDonorId(list[0].id);
        }
      })
      .catch((err) => console.error("Error loading donors:", err));
  }, []);

  // Load matches for the selected donor
  const loadDonorMatches = async (donorId) => {
    if (!donorId) return;
    try {
      setLoading(true);
      const res = await api.getMatches({ donor_id: donorId });
      setMatches(res.data || []);
    } catch (err) {
      console.error("Error loading donor matches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDonorId) {
      loadDonorMatches(selectedDonorId);
    }
  }, [selectedDonorId]);

  const handleRespond = async (matchId, responseType) => {
    try {
      setRespondingId(matchId);
      setStatusMessage("");
      await api.respondToMatch(matchId, responseType);
      
      setStatusMessage(
        responseType === "ACCEPTED"
          ? "🎉 Donation Accepted! Your confirmation has been dispatched to the hospital blood bank and logged in the Consent Vault."
          : "Response Recorded: You have declined this request."
      );

      await loadDonorMatches(selectedDonorId);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setRespondingId(null);
    }
  };

  const selectedDonor = donors.find((d) => d.id === parseInt(selectedDonorId, 10));

  return (
    <div>
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "800", letterSpacing: "-0.5px" }}>Donor Notification & Response Simulator</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Experience the real-time mobile interface received by donors during hospital emergency broadcasts.
          </p>
        </div>

        {/* Donor Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: "600" }}>Simulate As:</span>
          <select
            className="form-select"
            style={{ width: "240px", fontSize: "0.88rem" }}
            value={selectedDonorId}
            onChange={(e) => {
              setSelectedDonorId(e.target.value);
              setStatusMessage("");
            }}
          >
            {donors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name} ({d.blood_group})
              </option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => loadDonorMatches(selectedDonorId)}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main Grid: Phone simulator on left, Match records on right */}
      <div className="grid-2" style={{ alignItems: "flex-start" }}>
        {/* Mobile Device Frame */}
        <div>
          <div className="simulator-frame">
            <div className="phone-notch"></div>

            <div className="phone-screen">
              {/* Phone Top Header */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  <span>09:41</span>
                  <span>5G 📶 100%</span>
                </div>

                {/* Donor Header Info */}
                {selectedDonor && (
                  <div style={{ background: "rgba(255, 255, 255, 0.05)", borderRadius: "12px", padding: "10px 14px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>{selectedDonor.full_name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        ID #{selectedDonor.id} • {selectedDonor.phone}
                      </div>
                    </div>
                    <span className="blood-pill blood-pill-sm">{selectedDonor.blood_group}</span>
                  </div>
                )}

                {/* Status Message toast */}
                {statusMessage && (
                  <div style={{ background: "rgba(16, 185, 129, 0.2)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: "10px", padding: "10px", marginBottom: "14px", fontSize: "0.78rem", color: "#34d399", lineHeight: "1.4" }}>
                    {statusMessage}
                  </div>
                )}

                {/* Emergency Notifications Feed */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                  <Bell size={13} color="var(--cyan-accent)" /> Active Emergency Alerts ({matches.length})
                </div>

                {loading ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    Checking emergency dispatch network...
                  </div>
                ) : matches.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    <BloodDropIcon size={36} color="var(--border-subtle)" className="blood-drop-empty-state" style={{ margin: "0 auto 10px" }} />
                    <p>No pending alerts for your blood type.</p>
                    <p style={{ fontSize: "0.75rem", marginTop: "4px" }}>You will be notified immediately when a hospital triggers a match.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "360px", overflowY: "auto", paddingRight: "4px" }}>
                    {matches.map((m) => {
                      const isCritical = m.urgency === "CRITICAL";
                      const isPending = m.status === "PENDING" || m.status === "NOTIFIED";
                      return (
                        <div
                          key={m.id}
                          style={{
                            background: isCritical ? "rgba(255, 59, 92, 0.12)" : "rgba(15, 23, 42, 0.8)",
                            border: isCritical ? "1px solid rgba(255, 59, 92, 0.4)" : "1px solid var(--border-subtle)",
                            borderRadius: "14px",
                            padding: "12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span className={`badge badge-${m.urgency.toLowerCase()}`} style={{ fontSize: "0.65rem", padding: "2px 6px" }}>
                                {m.urgency}
                              </span>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                Match #{m.rank_position}
                              </span>
                            </div>
                            <span className="score-pill score-high" style={{ fontSize: "0.72rem" }}>
                              {m.total_score}% Match
                            </span>
                          </div>

                          <div style={{ fontWeight: "700", fontSize: "0.9rem" }}>
                            {m.hospital_name}
                          </div>

                          <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", display: "flex", gap: "10px" }}>
                            <span>Needed: <strong>{m.req_blood_group}</strong> ({m.units_required} unit)</span>
                            <span>•</span>
                            <span>Distance: <strong>{m.distance_km} km</strong></span>
                          </div>

                          {/* Response Actions */}
                          {isPending ? (
                            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                              <button
                                className="btn btn-sm"
                                style={{ flex: 1, background: "#10b981", color: "white", padding: "6px", fontSize: "0.78rem" }}
                                onClick={() => handleRespond(m.id, "ACCEPTED")}
                                disabled={respondingId === m.id}
                              >
                                {respondingId === m.id ? "Processing..." : "Accept to Donate"}
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ flex: 1, padding: "6px", fontSize: "0.78rem" }}
                                onClick={() => handleRespond(m.id, "DECLINED")}
                                disabled={respondingId === m.id}
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <div style={{ marginTop: "4px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
                              {m.status === "ACCEPTED" ? (
                                <span style={{ color: "#10b981", fontWeight: "700" }}>✓ Confirmed & Dispatched</span>
                              ) : (
                                <span style={{ color: "#ff4d6d", fontWeight: "600" }}>Declined by you</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Phone Footer */}
              <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid var(--border-subtle)", textAlign: "center", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                🛡️ HexaVision Consent-First Verification Active
              </div>
            </div>
          </div>
        </div>

        {/* Right Info: Protocol & Consent Explanation */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="glass-card">
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <ShieldCheck size={20} color="var(--cyan-accent)" />
              Consent-First Donor Safeguard Protocol
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
              Unlike traditional broadcast systems that blast unsolicited requests to all registered donors, HexaVision operates on a strict consent-first model:
            </p>
            <ul style={{ paddingLeft: "18px", marginTop: "12px", fontSize: "0.84rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li><strong>Autonomous Opt-in:</strong> Donors explicitly declare willingness for regular donation and high-urgency trauma alerts.</li>
              <li><strong>Multi-Factor Eligibility:</strong> Donors are verified against the 90-day minimum gap safety window before inclusion in active matching.</li>
              <li><strong>Zero-Fatigue Ranking:</strong> Alerts are dispatched strictly in order of rank score, preventing alert exhaustion.</li>
              <li><strong>Immutable Audit:</strong> Every response is cryptographically logged into the regulatory consent audit vault.</li>
            </ul>
          </div>

          <div className="glass-card">
            <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "8px" }}>Interactive Testing Guide</h4>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              1. Choose a donor from the top right selector (e.g. <strong>Lavanya Prasad (O-)</strong> or <strong>Rahul Sharma (O-)</strong>).<br />
              2. Review their active alerts on the smartphone screen.<br />
              3. Click <strong>"Accept to Donate"</strong>.<br />
              4. Notice how the request immediately updates towards fulfillment and the donor's cooling period is automatically enforced!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
