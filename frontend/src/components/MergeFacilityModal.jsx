import React, { useState } from "react";
import { GitMerge, X, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export default function MergeFacilityModal({ isOpen, onClose, facilities = [], initialDuplicate = null, onSuccess }) {
  const [primaryId, setPrimaryId] = useState("");
  const [duplicateId, setDuplicateId] = useState(initialDuplicate ? String(initialDuplicate.id) : "");
  const [reason, setReason] = useState("Consolidation of duplicate facility profile into canonical facility entity");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!primaryId || !duplicateId) {
      setError("Please select both a primary master facility and a duplicate facility.");
      return;
    }
    if (primaryId === duplicateId) {
      setError("Primary and duplicate facility cannot be identical.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";
      const res = await fetch(`${apiBase}/facilities/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_facility_id: parseInt(primaryId, 10),
          duplicate_facility_id: parseInt(duplicateId, 10),
          reason
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to merge facilities");
      }

      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const primaryFacility = facilities.find((f) => String(f.id) === String(primaryId));
  const duplicateFacility = facilities.find((f) => String(f.id) === String(duplicateId));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: "640px" }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ 
              width: "40px", 
              height: "40px", 
              borderRadius: "10px", 
              background: "rgba(180, 0, 255, 0.15)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "#c084fc",
              border: "1px solid rgba(180, 0, 255, 0.3)"
            }}>
              <GitMerge size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700", color: "#fff" }}>
                Merge Duplicate Facilities
              </h3>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Consolidate records, re-point inventory and blood units
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
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
          {/* Duplicate selection */}
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
              Duplicate Facility to Absorb & Soft-Deboard <span style={{ color: "#ff2a55" }}>*</span>
            </label>
            <select
              className="form-control"
              value={duplicateId}
              onChange={(e) => setDuplicateId(e.target.value)}
              required
              style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
            >
              <option value="">Select duplicate facility...</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.facility_name} ({f.facility_code}) {f.possible_duplicate ? "⚠️ [DUPLICATE FLAG]" : ""}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "center", margin: "10px 0", color: "var(--cyan-accent)" }}>
            <div style={{ background: "rgba(0, 242, 254, 0.1)", padding: "6px 14px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem" }}>
              <span>Absorbed Into Master</span>
              <ArrowRight size={14} />
            </div>
          </div>

          {/* Primary master selection */}
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
              Primary Master Facility <span style={{ color: "var(--cyan-accent)" }}>*</span>
            </label>
            <select
              className="form-control"
              value={primaryId}
              onChange={(e) => setPrimaryId(e.target.value)}
              required
              style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
            >
              <option value="">Select canonical master facility...</option>
              {facilities
                .filter((f) => String(f.id) !== String(duplicateId))
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.facility_name} ({f.facility_code}) — {f.area || f.city}
                  </option>
                ))}
            </select>
          </div>

          {/* Reason */}
          <div className="form-group" style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
              Documented Audit Reason
            </label>
            <textarea
              className="form-control"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
            />
          </div>

          {/* Merge Result Explainer */}
          <div style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            padding: "12px",
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            marginBottom: "20px"
          }}>
            <div style={{ fontWeight: "600", color: "var(--text-bright)", marginBottom: "4px" }}>
              Automated Merge Protocol:
            </div>
            <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: "1.5" }}>
              <li>All active and historical blood units are re-assigned to the Primary Master facility.</li>
              <li>Attached blood storage centres are re-parented to the Primary Master facility.</li>
              <li>Duplicate facility is marked as <strong>DEBOARDED</strong> with <code>merged_into_facility_id</code> linked.</li>
              <li>Permanent audit entry is recorded with actor details and timestamp.</li>
            </ul>
          </div>

          {/* Footer Actions */}
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
              disabled={loading || !primaryId || !duplicateId}
              style={{
                background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                color: "#fff",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px"
              }}
            >
              <GitMerge size={16} />
              <span>{loading ? "Merging Facilities..." : "Execute Facility Merge"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
