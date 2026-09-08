import React, { useState, useEffect } from "react";
import { 
  FileText, 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  Calendar, 
  User, 
  Archive, 
  RotateCcw, 
  GitMerge, 
  ChevronRight,
  Clock
} from "lucide-react";
import { api } from "../api/api";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        action: actionFilter || undefined,
        search: search || undefined,
        limit: 100
      });
      setLogs(res.data || []);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const getActionBadge = (action) => {
    if (action.includes("DEBOARD")) {
      return <span className="badge" style={{ background: "rgba(255, 42, 85, 0.2)", color: "#ff2a55", border: "1px solid #ff2a55" }}>{action}</span>;
    }
    if (action.includes("RESTORE")) {
      return <span className="badge" style={{ background: "rgba(56, 239, 125, 0.2)", color: "#38ef7d", border: "1px solid #38ef7d" }}>{action}</span>;
    }
    if (action.includes("MERGE")) {
      return <span className="badge" style={{ background: "rgba(180, 0, 255, 0.2)", color: "#c084fc", border: "1px solid #c084fc" }}>{action}</span>;
    }
    if (action.includes("ONBOARD")) {
      return <span className="badge" style={{ background: "rgba(0, 242, 254, 0.2)", color: "var(--cyan-accent)", border: "1px solid var(--cyan-accent)" }}>{action}</span>;
    }
    return <span className="badge" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#fff" }}>{action}</span>;
  };

  return (
    <div className="dashboard-content" style={{ padding: "24px", maxWidth: "1520px", margin: "0 auto" }}>
      {/* Breadcrumbs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "var(--cyan-accent)", marginBottom: "6px" }}>
            <span>HexaVision</span>
            <ChevronRight size={14} />
            <span>Governance</span>
            <ChevronRight size={14} />
            <span style={{ color: "var(--text-bright)", fontWeight: "600" }}>Immutable Audit Trail</span>
          </div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: "800", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={28} style={{ color: "var(--cyan-accent)" }} />
            <span>Network Administrative Audit Trail</span>
          </h1>
          <div style={{ fontSize: "0.86rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Immutable log of all facility onboardings, deboardings, restoration events, and duplicate merges
          </div>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={fetchLogs}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div style={{ 
        background: "rgba(18, 22, 36, 0.7)", 
        border: "1px solid var(--border-color)", 
        borderRadius: "12px", 
        padding: "16px 20px", 
        marginBottom: "20px" 
      }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: "14px", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by reason, actor name, or entity ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", paddingLeft: "36px", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
            />
          </div>

          <select
            className="form-control"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
          >
            <option value="">All Action Types</option>
            <option value="FACILITY_ONBOARDED">Facility Onboarded</option>
            <option value="FACILITY_DEBOARDED">Facility Deboarded</option>
            <option value="FACILITY_RESTORED">Facility Restored</option>
            <option value="FACILITY_MERGED">Facility Merged</option>
            <option value="FACILITY_VERIFIED">Facility Verified</option>
          </select>

          <button type="submit" className="btn btn-primary" style={{ padding: "8px 20px" }}>
            Filter
          </button>
        </form>
      </div>

      {/* Logs Table */}
      <div style={{ 
        background: "rgba(18, 22, 36, 0.75)", 
        border: "1px solid var(--border-color)", 
        borderRadius: "14px", 
        overflowX: "auto" 
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ background: "rgba(255, 255, 255, 0.04)", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
              <th style={{ padding: "14px 18px", color: "var(--text-muted)" }}>Timestamp</th>
              <th style={{ padding: "14px", color: "var(--text-muted)" }}>Action Type</th>
              <th style={{ padding: "14px", color: "var(--text-muted)" }}>Entity</th>
              <th style={{ padding: "14px", color: "var(--text-muted)" }}>Actor / Authorizer</th>
              <th style={{ padding: "14px 18px", color: "var(--text-muted)" }}>Documented Reason & Metadata</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
                  <RefreshCw size={24} className="spin" style={{ color: "var(--cyan-accent)", marginBottom: "8px" }} />
                  <div>Loading Audit Records...</div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
                  No audit log entries found matching criteria.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                  {/* Timestamp */}
                  <td style={{ padding: "14px 18px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Clock size={13} style={{ color: "var(--cyan-accent)" }} />
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  </td>

                  {/* Action */}
                  <td style={{ padding: "14px" }}>
                    {getActionBadge(log.action)}
                  </td>

                  {/* Entity */}
                  <td style={{ padding: "14px" }}>
                    <span style={{ color: "var(--text-bright)", fontWeight: "600" }}>{log.entity_type}</span>
                    <span style={{ color: "var(--cyan-accent)", marginLeft: "6px", fontFamily: "monospace" }}>#{log.entity_id}</span>
                  </td>

                  {/* Actor */}
                  <td style={{ padding: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <User size={13} style={{ color: "var(--text-dim)" }} />
                      <span style={{ color: "#fff", fontWeight: "600" }}>{log.actor_name}</span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginLeft: "19px" }}>
                      Role: {log.actor_role || "ADMIN"}
                    </div>
                  </td>

                  {/* Reason & Metadata */}
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ color: "var(--text-normal)", marginBottom: "4px" }}>
                      {log.reason || "No documented reason provided"}
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                        {JSON.stringify(log.metadata)}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
