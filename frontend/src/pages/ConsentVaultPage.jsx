import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Lock, 
  Clock, 
  Search, 
  RefreshCw, 
  AlertTriangle,
  UserX,
  FileCheck2
} from "lucide-react";
import { api } from "../api/api";

export default function ConsentVaultPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

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

  const handleWithdrawConsent = async (donorId, consentType) => {
    if (!window.confirm(`Are you sure you want to revoke '${consentType}' for this donor?`)) return;
    try {
      await api.recordConsentLog({
        donor_id: donorId,
        consent_type: `${consentType}_REVOKED`,
        consent_given: false
      });
      setActionSuccess(`Consent '${consentType}' successfully revoked and recorded into the audit trail.`);
      loadLogs();
    } catch (err) {
      console.error("Error withdrawing consent:", err);
    }
  };

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
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldCheck size={24} color="var(--blood-red)" />
            Regulatory Consent & Governance Vault
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Immutable, timestamped audit trail of donor consent declarations and emergency data authorizations
          </p>
        </div>

        <button className="btn btn-secondary" onClick={loadLogs}>
          <RefreshCw size={15} /> Refresh Vault
        </button>
      </div>

      {actionSuccess && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "10px 16px", color: "#34d399", fontSize: "0.85rem", marginBottom: "20px" }}>
          {actionSuccess}
        </div>
      )}

      {/* Security Architecture Box */}
      <div 
        className="glass-panel" 
        style={{ 
          marginBottom: "24px", 
          background: "linear-gradient(90deg, rgba(0, 242, 254, 0.08), rgba(255, 42, 85, 0.04))",
          border: "1px solid var(--border-cyan)"
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
          <div style={{ background: "rgba(0, 242, 254, 0.15)", padding: "10px", borderRadius: "10px", color: "var(--cyan-accent)", marginTop: "2px" }}>
            <Lock size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "800", color: "#ffffff", marginBottom: "4px" }}>
              Consent-First Transfusion Governance Standard
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
              HexaVision enforces autonomous opt-in permissions. Every donor registration, emergency broadcast authorization, and acceptance event is cryptographically timestamped into PostgreSQL table <code>consent_logs</code>. Donors can exercise their right to withdraw consent at any time.
            </p>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-panel" style={{ padding: "14px 20px", marginBottom: "20px" }}>
        <div style={{ position: "relative", maxWidth: "420px" }}>
          <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "12px" }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: "36px" }}
            placeholder="Search audit trail by donor, consent type, or hospital..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Audit Trail Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
          <p>Loading regulatory consent records...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "50px", color: "var(--text-muted)" }}>
          <p>No consent audit logs found matching criteria.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "rgba(8, 14, 28, 0.9)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "14px 18px", color: "var(--text-dim)", fontWeight: "700", textTransform: "uppercase", fontSize: "0.72rem" }}>Log ID</th>
                  <th style={{ padding: "14px 18px", color: "var(--text-dim)", fontWeight: "700", textTransform: "uppercase", fontSize: "0.72rem" }}>Timestamp</th>
                  <th style={{ padding: "14px 18px", color: "var(--text-dim)", fontWeight: "700", textTransform: "uppercase", fontSize: "0.72rem" }}>Donor Name</th>
                  <th style={{ padding: "14px 18px", color: "var(--text-dim)", fontWeight: "700", textTransform: "uppercase", fontSize: "0.72rem" }}>Blood</th>
                  <th style={{ padding: "14px 18px", color: "var(--text-dim)", fontWeight: "700", textTransform: "uppercase", fontSize: "0.72rem" }}>Consent Event</th>
                  <th style={{ padding: "14px 18px", color: "var(--text-dim)", fontWeight: "700", textTransform: "uppercase", fontSize: "0.72rem" }}>Authorization</th>
                  <th style={{ padding: "14px 18px", color: "var(--text-dim)", fontWeight: "700", textTransform: "uppercase", fontSize: "0.72rem" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>
                      #{log.id}
                    </td>
                    <td style={{ padding: "14px 18px", color: "var(--text-muted)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Clock size={12} color="var(--text-dim)" />
                        {new Date(log.consent_time).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: "14px 18px", fontWeight: "700", color: "#ffffff" }}>
                      {log.donor_name}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span className="blood-badge blood-badge-sm">{log.donor_blood_group}</span>
                    </td>
                    <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--cyan-accent)" }}>
                      {log.consent_type}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span className={`status-pill ${log.consent_given ? "status-available" : "status-critical"}`}>
                        {log.consent_given ? "✓ GRANTED" : "✗ REVOKED"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      {log.consent_given && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: "0.72rem", padding: "4px 8px" }}
                          onClick={() => handleWithdrawConsent(log.donor_id, log.consent_type)}
                        >
                          Withdraw
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
