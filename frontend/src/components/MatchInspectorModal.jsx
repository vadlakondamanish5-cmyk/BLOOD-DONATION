import React, { useState, useEffect } from "react";
import { 
  X, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Phone, 
  Radio, 
  Clock, 
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { api } from "../services/api";

export default function MatchInspectorModal({ requestId, onClose, onRefreshData }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);
  const [matching, setMatching] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [error, setError] = useState("");

  const loadDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getRequestById(requestId);
      setData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requestId) {
      loadDetails();
    }
  }, [requestId]);

  const handleBroadcast = async () => {
    try {
      setBroadcasting(true);
      setError("");
      const res = await api.broadcastAlert(requestId, 5, "SMS");
      setActionSuccess(`Broadcasted ${res.count} emergency SMS alert(s) to top ranked donors!`);
      await loadDetails();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBroadcasting(false);
    }
  };

  const handleRerunMatching = async () => {
    try {
      setMatching(true);
      setError("");
      await api.triggerMatch(requestId);
      setActionSuccess("Refreshed matching engine scores and ranks!");
      await loadDetails();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setMatching(false);
    }
  };

  const handleDonorResponse = async (matchId, responseType) => {
    try {
      setError("");
      await api.respondToMatch(matchId, responseType);
      setActionSuccess(`Simulated donor response: ${responseType}`);
      await loadDetails();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!requestId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: "880px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">
              <Radio size={22} color="var(--cyan-accent)" />
              Donor Match & Dispatch Inspector
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Request #{requestId} • Multi-factor compatibility, geodesic distance & dispatch
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Feedback banners */}
        {actionSuccess && (
          <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#34d399", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={16} /> {actionSuccess}
          </div>
        )}
        {error && (
          <div style={{ background: "rgba(255, 59, 92, 0.15)", border: "1px solid rgba(255, 59, 92, 0.3)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#ff4d6d", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading || !data ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-secondary)" }}>
            <div className="pulse-dot-cyan" style={{ margin: "0 auto 12px" }}></div>
            <p>Loading ranked matches...</p>
          </div>
        ) : (
          <div>
            {/* Request Summary Strip */}
            <div 
              style={{ 
                background: "rgba(8, 14, 28, 0.8)", 
                border: "1px solid var(--border-subtle)", 
                borderRadius: "var(--radius-md)", 
                padding: "16px 20px", 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                flexWrap: "wrap", 
                gap: "16px",
                marginBottom: "20px" 
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span className="blood-pill">{data.blood_group}</span>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "1.05rem" }}>{data.hospital_name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Contact: {data.contact_person || data.hospital_phone}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Urgency</div>
                  <span className={`badge badge-${data.urgency.toLowerCase()}`}>{data.urgency}</span>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Units Required</div>
                  <div style={{ fontWeight: "800", fontSize: "1.1rem" }}>{data.units_required}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Status</div>
                  <span className={`badge badge-${data.status.toLowerCase()}`}>{data.status}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ fontSize: "0.9rem", fontWeight: "700" }}>
                Ranked Compatible Donors ({data.matches?.length || 0})
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleRerunMatching}
                  disabled={matching}
                >
                  <RefreshCw size={14} className={matching ? "animate-spin" : ""} /> Re-score Engine
                </button>
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={handleBroadcast}
                  disabled={broadcasting}
                >
                  <Send size={14} /> Broadcast SOS (Top 5)
                </button>
              </div>
            </div>

            {(data.eligible_donors?.length || data.ineligible_donors?.length) > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                <div style={{ background: "rgba(8, 14, 28, 0.7)", border: "1px solid rgba(16, 185, 129, 0.28)", borderRadius: "12px", padding: "14px" }}>
                  <div style={{ color: "#34d399", fontWeight: "700", marginBottom: "10px" }}>🟢 Eligible & Available Donors</div>
                  {data.eligible_donors?.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {data.eligible_donors.slice(0, 5).map((donor) => (
                        <div key={donor.donor_id} style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          <strong style={{ color: "white" }}>{donor.full_name}</strong> • {donor.blood_group} • {donor.distance_km ? `${Number(donor.distance_km).toFixed(1)} km` : "Distance pending"}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>No eligible donors available for this request.</div>
                  )}
                </div>

                <div style={{ background: "rgba(8, 14, 28, 0.7)", border: "1px solid rgba(255, 117, 97, 0.28)", borderRadius: "12px", padding: "14px" }}>
                  <div style={{ color: "#ffb199", fontWeight: "700", marginBottom: "10px" }}>⚠️ Donors Not Eligible For This Request</div>
                  {data.ineligible_donors?.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {data.ineligible_donors.slice(0, 5).map((donor) => (
                        <div key={donor.donor_id} style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          <strong style={{ color: "white" }}>{donor.full_name}</strong> • {donor.reason || "Not eligible"}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>No excluded donors for this request.</div>
                  )}
                </div>
              </div>
            )}

            {/* Matches Table */}
            {data.matches?.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                No compatible donors found within matching criteria.
              </div>
            ) : (
              <div className="data-table-container" style={{ marginBottom: "24px" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Donor Details</th>
                      <th>Group</th>
                      <th>Distance</th>
                      <th>Score Breakdown</th>
                      <th>Total Score</th>
                      <th>Status</th>
                      <th>Simulate Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.matches.map((m) => {
                      const isHigh = parseFloat(m.total_score) >= 90;
                      return (
                        <tr key={m.id}>
                          <td>
                            <span 
                              style={{ 
                                fontWeight: "800", 
                                color: m.rank_position <= 3 ? "var(--cyan-accent)" : "var(--text-secondary)",
                                fontSize: "0.95rem"
                              }}
                            >
                              #{m.rank_position}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: "600" }}>{m.donor_name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              📞 {m.donor_phone}
                            </div>
                          </td>
                          <td>
                            <span className="blood-pill blood-pill-sm">{m.donor_blood_group}</span>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.85rem" }}>
                              <MapPin size={13} color="var(--text-muted)" />
                              <strong>{m.distance_km}</strong> km
                            </div>
                          </td>
                          <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            <div>Compat: <strong>{m.compatibility_score}</strong></div>
                            <div>Avail: <strong>{m.availability_score}</strong></div>
                          </td>
                          <td>
                            <span className={`score-pill ${isHigh ? "score-high" : "score-med"}`}>
                              {m.total_score}%
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${
                              m.status === 'ACCEPTED' ? 'badge-fulfilled' : 
                              m.status === 'NOTIFIED' ? 'badge-urgent' : 
                              m.status === 'DECLINED' ? 'badge-critical' : 'badge-open'
                            }`}>
                              {m.status}
                            </span>
                          </td>
                          <td>
                            {m.status !== 'ACCEPTED' && m.status !== 'DECLINED' ? (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  className="btn btn-sm"
                                  style={{ background: "#10b981", color: "white", padding: "4px 8px", fontSize: "0.75rem" }}
                                  title="Simulate donor accepting"
                                  onClick={() => handleDonorResponse(m.id, "ACCEPTED")}
                                >
                                  Accept
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                  title="Simulate donor declining"
                                  onClick={() => handleDonorResponse(m.id, "DECLINED")}
                                >
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: m.status === 'ACCEPTED' ? '#10b981' : '#ff4d6d' }}>
                                {m.status === 'ACCEPTED' ? 'Confirmed ✓' : 'Declined ✗'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Notifications Sent Audit */}
            {data.notifications?.length > 0 && (
              <div>
                <h4 style={{ fontSize: "0.88rem", fontWeight: "700", marginBottom: "10px", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                  Dispatched Emergency Alerts ({data.notifications.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "150px", overflowY: "auto" }}>
                  {data.notifications.map((n) => (
                    <div 
                      key={n.id}
                      style={{
                        background: "rgba(8, 14, 28, 0.6)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontSize: "0.8rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <strong>{n.donor_name}</strong> ({n.donor_blood_group}) • <span style={{ color: "var(--cyan-accent)" }}>{n.channel}</span>: {n.message}
                      </div>
                      <span className="badge badge-normal" style={{ fontSize: "0.68rem" }}>{n.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
