import React, { useState, useEffect } from "react";
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  Users, 
  Hospital, 
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import BloodDropIcon from "./BloodDropIcon";
import { api } from "../api/api";

export default function SOSModal({ isOpen, onClose, requests = [], onSuccess }) {
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [stage, setStage] = useState("confirm"); // "confirm", "animating", "complete"
  const [animationStep, setAnimationStep] = useState(0);
  const [dispatchedCount, setDispatchedCount] = useState(0);
  const [error, setError] = useState("");

  // Default to first critical or open request
  useEffect(() => {
    if (requests.length > 0 && !selectedRequestId) {
      const criticalReq = requests.find((r) => r.urgency === "CRITICAL") || requests[0];
      setSelectedRequestId(criticalReq.id);
    }
  }, [requests, selectedRequestId]);

  const selectedReq = requests.find((r) => r.id === parseInt(selectedRequestId, 10));

  const steps = [
    "Searching geo-proximate candidate donors...",
    "Executing ABO/Rh multi-factor ranking engine...",
    "Preparing priority emergency alert payloads...",
    "Transmitting mock SMS alerts to top-ranked network..."
  ];

  const handleBroadcast = async () => {
    if (!selectedReq) return;
    setError("");
    setStage("animating");
    setAnimationStep(0);

    // Run visual animated sequence
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setAnimationStep(currentStep);
      } else {
        clearInterval(interval);
      }
    }, 600);

    try {
      // Call backend broadcast API
      const res = await api.broadcastAlert(selectedReq.id, 5, "SMS");
      setTimeout(() => {
        clearInterval(interval);
        setDispatchedCount(res.count || res.data?.length || 3);
        setStage("complete");
        if (onSuccess) onSuccess();
      }, 2500);
    } catch (err) {
      clearInterval(interval);
      setError(err.message || "Failed to dispatch alerts");
      setStage("confirm");
    }
  };

  const handleReset = () => {
    setStage("confirm");
    setAnimationStep(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleReset}>
      <div className="modal-card" style={{ maxWidth: "580px" }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "rgba(255, 42, 85, 0.2)", padding: "8px", borderRadius: "10px", color: "var(--blood-red)" }}>
              <BloodDropIcon size={22} color="var(--blood-red)" className="logo-blood-pulse" variant="filled" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>Emergency Blood SOS Broadcast</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Decision Support • Direct Donor Mobilization</p>
            </div>
          </div>
          <button className="btn-secondary btn-sm" onClick={handleReset} style={{ padding: "6px" }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ background: "rgba(255, 42, 85, 0.15)", border: "1px solid rgba(255, 42, 85, 0.4)", borderRadius: "8px", padding: "10px 14px", color: "#ff4d6d", fontSize: "0.82rem", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {/* STAGE 1: CONFIRMATION VIEW */}
        {stage === "confirm" && (
          <div>
            <div style={{ marginBottom: "18px" }}>
              <label className="form-label">Select Active Emergency Request to Broadcast</label>
              <select
                className="form-select"
                value={selectedRequestId}
                onChange={(e) => setSelectedRequestId(e.target.value)}
              >
                {requests.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} • [{r.urgency}] {r.blood_group} ({r.units_required} Units) - {r.hospital_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedReq && (
              <div style={{ background: "rgba(8, 14, 28, 0.8)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "18px", marginBottom: "22px" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px" }}>
                  Broadcast Target Parameters
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" }}>
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Blood Group Needed</span>
                    <div style={{ marginTop: "4px" }}>
                      <span className="blood-badge blood-badge-sm">{selectedReq.blood_group}</span>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Units Demanded</span>
                    <div style={{ fontSize: "1.2rem", fontWeight: "800", marginTop: "2px" }}>
                      {selectedReq.units_required} Units
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Hospital Center</span>
                    <div style={{ fontSize: "0.88rem", fontWeight: "700", marginTop: "2px" }}>
                      {selectedReq.hospital_name}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Priority Level</span>
                    <div style={{ marginTop: "4px" }}>
                      <span className={`status-pill status-${selectedReq.urgency.toLowerCase()}`}>
                        {selectedReq.urgency}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Pre-ranked Potential Matches:</span>
                  <span style={{ fontSize: "1rem", fontWeight: "800", color: "var(--cyan-accent)" }}>
                    {selectedReq.matched_donor_count || selectedReq.total_matches || "Top Ranked"} Donors
                  </span>
                </div>
              </div>
            )}

            <div style={{ background: "rgba(255, 42, 85, 0.08)", border: "1px solid rgba(255, 42, 85, 0.25)", borderRadius: "var(--radius-md)", padding: "12px", marginBottom: "22px", fontSize: "0.8rem", color: "#fda4af" }}>
              ⚠️ <strong>Emergency Notice:</strong> Broadcasting triggers instant priority mobile alerts to verified consenting donors in proximity. Only initiate for verified hospital blood demands.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn btn-secondary" onClick={handleReset}>Cancel</button>
              <button className="btn btn-emergency" onClick={handleBroadcast}>
                <BloodDropIcon size={16} color="#ffffff" variant="filled" />
                <span>CONFIRM & BROADCAST SOS</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: ANIMATED DISPATCH SEQUENCE */}
        {stage === "animating" && (
          <div style={{ textAlign: "center", padding: "30px 10px" }}>
            <div 
              className="logo-blood-pulse" 
              style={{ width: "70px", height: "70px", borderRadius: "50%", background: "rgba(255, 42, 85, 0.2)", border: "2px solid var(--blood-red)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", color: "var(--blood-red)" }}
            >
              <BloodDropIcon size={32} color="var(--blood-red)" variant="filled" />
            </div>

            <h4 style={{ fontSize: "1.25rem", fontWeight: "800", marginBottom: "8px" }}>
              Dispatching Emergency Coordinates...
            </h4>

            {/* Stepper text */}
            <div style={{ minHeight: "40px", fontSize: "0.95rem", color: "var(--cyan-accent)", fontWeight: "600" }}>
              {steps[animationStep]}
            </div>

            {/* Progress Bar */}
            <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "4px", overflow: "hidden", marginTop: "24px" }}>
              <div 
                style={{ 
                  width: `${((animationStep + 1) / steps.length) * 100}%`, 
                  height: "100%", 
                  background: "linear-gradient(90deg, #ff2a55, #00f2fe)", 
                  transition: "width 0.5s ease" 
                }}
              />
            </div>
          </div>
        )}

        {/* STAGE 3: COMPLETE CONFIRMATION */}
        {stage === "complete" && (
          <div style={{ textAlign: "center", padding: "20px 10px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.2)", border: "2px solid var(--status-available)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: "var(--status-available)" }}>
              <CheckCircle2 size={36} />
            </div>

            <h4 style={{ fontSize: "1.3rem", fontWeight: "800", marginBottom: "6px" }}>
              Emergency Broadcast Complete
            </h4>
            <p style={{ fontSize: "0.92rem", color: "#34d399", fontWeight: "700" }}>
              🚨 {dispatchedCount} donor alert(s) dispatched successfully!
            </p>

            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "10px", lineHeight: "1.5" }}>
              High-priority mock alerts have been logged and routed to the top compatible donors. Incoming donor responses will update the command center in real time.
            </p>

            <div style={{ marginTop: "24px" }}>
              <button className="btn btn-secondary" onClick={handleReset} style={{ width: "100%" }}>
                Close & Monitor Responses
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
