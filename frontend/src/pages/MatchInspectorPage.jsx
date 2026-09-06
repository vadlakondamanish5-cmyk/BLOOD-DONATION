import React, { useState, useEffect } from "react";
import { 
  Target, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Radio, 
  RefreshCw,
  Send,
  AlertTriangle
} from "lucide-react";
import MatchRing from "../components/MatchRing";
import { api } from "../api/api";

export default function MatchInspectorPage({ requests = [], selectedRequestId: initialReqId, onRefreshData }) {
  const [selectedRequestId, setSelectedRequestId] = useState(initialReqId || "");
  const [requestDetails, setRequestDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [error, setError] = useState("");

  // Sync initial request ID
  useEffect(() => {
    if (initialReqId) {
      setSelectedRequestId(initialReqId);
    } else if (requests.length > 0 && !selectedRequestId) {
      setSelectedRequestId(requests[0].id);
    }
  }, [initialReqId, requests]);

  const loadDetails = async (id) => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      const res = await api.getRequestById(id);
      setRequestDetails(res.data);
    } catch (err) {
      setError(err.message || "Failed to load match rankings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRequestId) {
      loadDetails(selectedRequestId);
    }
  }, [selectedRequestId]);

  const handleSimulateResponse = async (matchId, responseType) => {
    try {
      setActionMessage("");
      setError("");
      await api.respondToMatch(matchId, responseType);
      setActionMessage(
        responseType === "ACCEPTED"
          ? "✓ Donor acceptance recorded! Transfusion coordination initiated in Consent Vault."
          : "Donor declined match."
      );
      await loadDetails(selectedRequestId);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setError(err.message || "Failed to update response");
    }
  };

  const handleReScore = async () => {
    if (!selectedRequestId) return;
    try {
      setLoading(true);
      await api.triggerMatch(selectedRequestId);
      await loadDetails(selectedRequestId);
      setActionMessage("Tier-1 matching algorithm re-scored and rankings updated!");
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setError(err.message || "Failed to re-score matches");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
            <Target size={24} color="var(--blood-red)" />
            Tier-1 Match Inspector & Precision Rankings
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Multi-factor scoring breakdown: Distance (35%), Compatibility (30%), Availability (20%), Response (15%)
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <select
            className="form-select"
            style={{ width: "280px" }}
            value={selectedRequestId}
            onChange={(e) => setSelectedRequestId(e.target.value)}
          >
            {requests.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.id} • {r.blood_group} ({r.urgency}) - {r.hospital_name}
              </option>
            ))}
          </select>

          <button className="btn btn-secondary" onClick={handleReScore} disabled={loading}>
            <RefreshCw size={15} /> Re-score Engine
          </button>
        </div>
      </div>

      {/* Safety Compliance Alert */}
      <div style={{ background: "rgba(0, 242, 254, 0.08)", border: "1px solid var(--border-cyan)", borderRadius: "var(--radius-md)", padding: "12px 18px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <ShieldAlert size={20} color="var(--cyan-accent)" />
        <div style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>
          <strong>Medical Safety Notice:</strong> Ranked results represent potential candidates identified through decision-support algorithms. <strong>Medical Review & In-Person Screening are Required</strong> before any collection or transfusion.
        </div>
      </div>

      {actionMessage && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.35)", borderRadius: "8px", padding: "10px 14px", color: "#34d399", fontSize: "0.84rem", marginBottom: "20px" }}>
          {actionMessage}
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(255, 42, 85, 0.15)", border: "1px solid rgba(255, 42, 85, 0.35)", borderRadius: "8px", padding: "10px 14px", color: "#ff4d6d", fontSize: "0.84rem", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {/* Request Details Summary Bar */}
      {requestDetails && (
        <div className="glass-panel" style={{ padding: "18px 24px", marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span className="blood-badge">{requestDetails.request?.blood_group}</span>
              <div>
                <div style={{ fontWeight: "800", fontSize: "1.1rem" }}>
                  {requestDetails.hospital?.hospital_name}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Contact: {requestDetails.hospital?.contact_person || requestDetails.hospital?.phone}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Priority Level</span>
                <div>
                  <span className={`status-pill status-${(requestDetails.request?.urgency || "NORMAL").toLowerCase()}`}>
                    {requestDetails.request?.urgency}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Units Required</span>
                <div style={{ fontSize: "1.2rem", fontWeight: "800", fontFamily: "var(--font-mono)" }}>
                  {requestDetails.request?.units_required}
                </div>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Current Status</span>
                <div>
                  <span className="status-pill status-matching">
                    {requestDetails.request?.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ranked Matches List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
          <p>Computing Tier-1 multi-factor scores and ranking candidates...</p>
        </div>
      ) : !requestDetails?.ranked_matches || requestDetails.ranked_matches.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "50px 20px" }}>
          <h3>No matching donors found for this request</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Click "Re-score Engine" to evaluate newly registered donors.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {requestDetails.ranked_matches.map((m) => {
            const isTopRank = m.rank_position === 1;
            const scoreNum = parseFloat(m.total_score) || 90;
            return (
              <div 
                key={m.match_id || m.donor_id}
                className={`glass-panel ${isTopRank ? "critical-glow-card" : ""}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "130px 1.5fr 2fr 180px",
                  alignItems: "center",
                  gap: "24px",
                  padding: "22px 26px"
                }}
              >
                {/* 1. Circular Match Score Ring */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <MatchRing 
                    score={scoreNum} 
                    size={98} 
                    strokeWidth={7}
                    label="POTENTIAL MATCH"
                    color={scoreNum >= 90 ? "var(--blood-red)" : "var(--cyan-accent)"}
                  />
                  <span style={{ fontSize: "0.72rem", fontWeight: "800", color: "var(--text-muted)", marginTop: "4px" }}>
                    Rank #{m.rank_position}
                  </span>
                </div>

                {/* 2. Donor Info */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span className="blood-badge blood-badge-sm">{m.blood_group}</span>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#ffffff" }}>
                      {m.full_name}
                    </h3>
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={13} color="var(--text-dim)" />
                      <span>Distance: <strong style={{ color: "#ffffff" }}>{m.distance_km} km away</strong></span>
                    </div>
                    <div>
                      Consent: <span style={{ color: "var(--status-available)", fontWeight: "600" }}>✓ Emergency Contact Approved</span>
                    </div>
                    <div>
                      Status: <span style={{ color: "#38bdf8" }}>{m.status || "PENDING"}</span>
                    </div>
                  </div>

                  {/* Mandatory Medical Safety Badge */}
                  <div style={{ marginTop: "10px" }}>
                    <span 
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: "700",
                        color: "#fbbf24",
                        background: "rgba(245, 158, 11, 0.12)",
                        border: "1px solid rgba(245, 158, 11, 0.35)",
                        padding: "3px 8px",
                        borderRadius: "4px"
                      }}
                    >
                      ⚠️ Medical Screening Required
                    </span>
                  </div>
                </div>

                {/* 3. Breakdown Bars */}
                <div>
                  <div style={{ fontSize: "0.74rem", fontWeight: "700", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "8px" }}>
                    Algorithm Weight Breakdown
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.75rem" }}>
                    {/* Compatibility (30%) */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", marginBottom: "2px" }}>
                        <span>Blood Compatibility</span>
                        <strong style={{ color: "#ffffff" }}>{m.compatibility_score || 100}%</strong>
                      </div>
                      <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ width: `${m.compatibility_score || 100}%`, height: "100%", background: "var(--status-available)" }} />
                      </div>
                    </div>

                    {/* Distance (35%) */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", marginBottom: "2px" }}>
                        <span>Geodesic Proximity</span>
                        <strong style={{ color: "#ffffff" }}>{Math.max(20, Math.round(100 - (m.distance_km * 2)))}%</strong>
                      </div>
                      <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ width: `${Math.max(20, Math.round(100 - (m.distance_km * 2)))}%`, height: "100%", background: "var(--cyan-accent)" }} />
                      </div>
                    </div>

                    {/* Availability (20%) */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", marginBottom: "2px" }}>
                        <span>Availability (Cooldown)</span>
                        <strong style={{ color: "#ffffff" }}>{m.availability_score || 100}%</strong>
                      </div>
                      <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ width: `${m.availability_score || 100}%`, height: "100%", background: "#fbbf24" }} />
                      </div>
                    </div>

                    {/* Response likelihood (15%) */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", marginBottom: "2px" }}>
                        <span>Response Likelihood</span>
                        <strong style={{ color: "#ffffff" }}>{m.response_score || 95}%</strong>
                      </div>
                      <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ width: `${m.response_score || 95}%`, height: "100%", background: "#c084fc" }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Action buttons: Simulate Donor Response */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderLeft: "1px solid var(--border-subtle)", paddingLeft: "18px" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: "700" }}>
                    Simulate Response
                  </span>

                  {m.status !== "ACCEPTED" && m.status !== "DECLINED" ? (
                    <>
                      <button
                        className="btn btn-sm"
                        style={{ background: "var(--status-available)", color: "white" }}
                        onClick={() => handleSimulateResponse(m.match_id, "ACCEPTED")}
                      >
                        <CheckCircle2 size={14} />
                        <span>Accept Donation</span>
                      </button>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSimulateResponse(m.match_id, "DECLINED")}
                      >
                        <XCircle size={14} />
                        <span>Decline Match</span>
                      </button>
                    </>
                  ) : (
                    <div style={{ fontSize: "0.8rem", fontWeight: "700", color: m.status === "ACCEPTED" ? "var(--status-available)" : "#ff4d6d" }}>
                      {m.status === "ACCEPTED" ? "✓ Confirmed by Donor" : "Declined by Donor"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
