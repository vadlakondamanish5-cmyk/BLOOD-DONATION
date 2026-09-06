import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, Clock, Search, RefreshCw, FileText } from "lucide-react";
import { api } from "../services/api";

export default function ConsentVault() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getConsentLogs();
      setLogs(res.data || []);
    } catch (err) {
      console.error("Error loading consent logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (log.donor_name || "").toLowerCase();
    const type = (log.consent_type || "").toLowerCase();
    const hosp = (log.hospital_name || "").toLowerCase();
    return name.includes(q) || type.includes(q) || hosp.includes(q);
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "800", letterSpacing: "-0.5px" }}>Consent & Regulatory Audit Vault</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Immutable audit trail of donor consent declarations, emergency dispatch authorizations, and status updates.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadLogs}>
          <RefreshCw size={16} /> Refresh Audit Trail
        </button>
      </div>

      {/* Compliance Information Card */}
      <div className="glass-card" style={{ marginBottom: "24px", background: "linear-gradient(90deg, rgba(0, 242, 254, 0.08), rgba(16, 185, 129, 0.04))", border: "1px solid var(--border-active)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div style={{ background: "rgba(0, 242, 254, 0.15)", padding: "10px", borderRadius: "10px", color: "var(--cyan-accent)" }}>
            <Lock size={22} />
          </div>
          <div>
            <h4 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "4px" }}>
              Regulatory Compliance & Autonomy Standards
            </h4>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Every donor action — from registration to accepting an emergency SOS call — is recorded with an unmodifiable timestamp and consent hash. This guarantees patient privacy, prevents unsolicited notifications, and complies with national transfusion governance guidelines.
            </p>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-card" style={{ padding: "14px 20px", marginBottom: "20px" }}>
        <div style={{ position: "relative", maxWidth: "400px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "12px", color: "var(--text-muted)" }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: "36px" }}
            placeholder="Search by donor, consent type, or hospital..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
          <div className="pulse-dot-cyan" style={{ margin: "0 auto 12px" }}></div>
          <p>Loading consent audit records...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "var(--text-muted)" }}>No consent audit logs found matching criteria.</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Timestamp</th>
                <th>Donor Name</th>
                <th>Blood Type</th>
                <th>Consent Event / Action</th>
                <th>Authorization Status</th>
                <th>Associated Hospital</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    #{log.id}
                  </td>
                  <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Clock size={12} color="var(--text-muted)" />
                      {new Date(log.consent_time).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ fontWeight: "700" }}>
                    {log.donor_name}
                  </td>
                  <td>
                    <span className="blood-pill blood-pill-sm">{log.donor_blood_group}</span>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--cyan-accent)" }}>
                    {log.consent_type}
                  </td>
                  <td>
                    <span className={`badge ${log.consent_given ? "badge-normal" : "badge-critical"}`}>
                      {log.consent_given ? "✓ GRANTED" : "✗ REVOKED / DECLINED"}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {log.hospital_name ? (
                      <span>{log.hospital_name} (Req #{log.request_id})</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>Platform Level</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
