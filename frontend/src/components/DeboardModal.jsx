import React, { useState } from "react";
import { AlertTriangle, ShieldAlert, X, Check, Archive, Info } from "lucide-react";

export default function DeboardModal({ isOpen, onClose, facility, onSuccess }) {
  const [reason, setReason] = useState("");
  const [predefinedReason, setPredefinedReason] = useState("");
  const [approvedBy, setApprovedBy] = useState("State Blood Transfusion Council Auditor");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !facility) return null;

  const PRESET_REASONS = [
    "Voluntary cessation of blood bank / hospital transfusion operations",
    "Non-compliance with national cold-chain and serology testing standards",
    "Drug Control Administration / SBTC License expired or revoked",
    "Facility relocated to another district/jurisdiction",
    "Prolonged operational inactivity (> 90 days without telemetry)",
    "Duplicate facility profile - scheduled for decommission",
    "Merger with higher-tier hospital medical college network"
  ];

  const handleSelectPreset = (val) => {
    setPredefinedReason(val);
    setReason(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalReason = reason.trim();
    if (!finalReason) {
      setError("A documented reason is mandatory to deboard a clinical facility.");
      return;
    }
    if (!confirmed) {
      setError("Please check the confirmation box acknowledging soft-deboarding policies.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";
      const res = await fetch(`${apiBase}/facilities/${facility.id}/deboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: finalReason,
          approved_by: approvedBy
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to deboard facility");
      }

      if (onSuccess) onSuccess(data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: "620px", border: "1px solid rgba(255, 42, 85, 0.4)", boxShadow: "0 10px 40px rgba(255, 42, 85, 0.2)" }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ 
              width: "42px", 
              height: "42px", 
              borderRadius: "10px", 
              background: "rgba(255, 42, 85, 0.15)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "#ff2a55",
              border: "1px solid rgba(255, 42, 85, 0.3)"
            }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700", color: "#fff" }}>
                Deboard Facility from Network
              </h3>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Soft-deletion with historical integrity preservation
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        {/* Facility Summary Banner */}
        <div style={{ 
          background: "rgba(255, 255, 255, 0.03)", 
          padding: "14px 16px", 
          borderRadius: "8px", 
          border: "1px solid var(--border-color)",
          marginBottom: "18px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontWeight: "700", color: "var(--text-bright)", fontSize: "1rem" }}>
              {facility.facility_name}
            </span>
            <span className="badge badge-outline" style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
              {facility.facility_code}
            </span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", gap: "16px" }}>
            <span>Type: <strong style={{ color: "var(--text-normal)" }}>{facility.facility_type?.replace(/_/g, " ")}</strong></span>
            <span>Ownership: <strong style={{ color: "var(--text-normal)" }}>{facility.ownership}</strong></span>
            <span>Area: <strong style={{ color: "var(--text-normal)" }}>{facility.area || facility.city}</strong></span>
          </div>
        </div>

        {/* Informative Note on Historical Preservation */}
        <div style={{
          display: "flex",
          gap: "10px",
          background: "rgba(0, 242, 254, 0.05)",
          border: "1px solid rgba(0, 242, 254, 0.2)",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "18px",
          fontSize: "0.82rem",
          color: "var(--cyan-accent)",
          lineHeight: "1.4"
        }}>
          <Info size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong>Network Integrity Guarantee:</strong> Deboarding safely removes this facility from active dispatch matching, search queries, and inventory pools. All past donation logs, emergency requests, cold-chain trackings, and audit events remain permanently archived and verifiable.
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(255, 42, 85, 0.1)",
            border: "1px solid rgba(255, 42, 85, 0.3)",
            borderRadius: "8px",
            padding: "10px 14px",
            color: "#ff6b8b",
            fontSize: "0.84rem",
            marginBottom: "16px"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Predefined Reasons */}
          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "0.84rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
              Regulatory / Operational Reason Template
            </label>
            <select
              className="form-control"
              value={predefinedReason}
              onChange={(e) => handleSelectPreset(e.target.value)}
              style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
            >
              <option value="">Select standard reason or write custom...</option>
              {PRESET_REASONS.map((r, idx) => (
                <option key={idx} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Documented Mandatory Reason */}
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.84rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
              Documented Justification <span style={{ color: "#ff2a55" }}>*</span>
            </label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Detail the mandatory audit rationale for deboarding this facility..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)", resize: "vertical" }}
            />
          </div>

          {/* Authorizing Authority */}
          <div className="form-group" style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "0.84rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
              Authorizing Officer / Council
            </label>
            <input
              type="text"
              className="form-control"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
            />
          </div>

          {/* Confirmation Checkbox */}
          <div style={{ 
            display: "flex", 
            alignItems: "flex-start", 
            gap: "10px", 
            marginBottom: "22px",
            padding: "10px 12px",
            background: "rgba(255, 42, 85, 0.06)",
            borderRadius: "6px",
            border: "1px dashed rgba(255, 42, 85, 0.3)"
          }}>
            <input 
              type="checkbox" 
              id="confirm-deboard"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              style={{ marginTop: "3px", accentColor: "#ff2a55", width: "16px", height: "16px", cursor: "pointer" }}
            />
            <label htmlFor="confirm-deboard" style={{ fontSize: "0.82rem", color: "var(--text-normal)", cursor: "pointer", lineHeight: "1.4" }}>
              I confirm the removal of <strong>{facility.facility_name}</strong> from the HexaVision active dispatch grid. I understand this action is recorded in the immutable audit log and can be reversed via the facility restore protocol.
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn"
              disabled={loading || !confirmed}
              style={{
                background: "linear-gradient(135deg, #ff2a55 0%, #b8002b 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                border: "none",
                fontWeight: "600",
                boxShadow: "0 4px 15px rgba(255, 42, 85, 0.35)",
                opacity: (!confirmed || loading) ? 0.6 : 1,
                cursor: (!confirmed || loading) ? "not-allowed" : "pointer"
              }}
            >
              <Archive size={16} />
              <span>{loading ? "Deboarding Facility..." : "Deboard Facility"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
