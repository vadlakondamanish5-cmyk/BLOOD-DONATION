import React, { useState, useEffect } from "react";
import { 
  Droplet, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  RefreshCw, 
  Building2, 
  Search, 
  TrendingDown, 
  ShieldAlert 
} from "lucide-react";
import { api } from "../api/api";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENTS = ["RBC", "WHOLE_BLOOD", "PLASMA", "PLATELETS"];

export default function BloodInventoryPage({ onSelectFacility, onNavigateToDirectory }) {
  const [networkMatrix, setNetworkMatrix] = useState([]);
  const [groupTotals, setGroupTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("");

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.getNetworkInventorySummary();
      setNetworkMatrix(res.networkMatrix || []);
      setGroupTotals(res.groupTotals || {});
    } catch (err) {
      console.error("Error fetching network blood inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Compute overall network metrics
  let totalNetworkUnits = 0;
  let totalAvailableUnits = 0;
  let totalExpiringSoon = 0;
  let shortageGroupsCount = 0;

  Object.values(groupTotals).forEach(g => {
    totalNetworkUnits += g.total || 0;
    totalAvailableUnits += g.available || 0;
    totalExpiringSoon += g.expiring_soon || 0;
    if (g.is_shortage) shortageGroupsCount++;
  });

  // Construct lookup matrix: [bg][comp]
  const matrixMap = {};
  BLOOD_GROUPS.forEach(bg => {
    matrixMap[bg] = {};
    COMPONENTS.forEach(c => {
      matrixMap[bg][c] = { available: 0, total: 0, expiring: 0 };
    });
  });

  networkMatrix.forEach(item => {
    if (matrixMap[item.blood_group]) {
      const c = COMPONENTS.includes(item.component) ? item.component : "WHOLE_BLOOD";
      matrixMap[item.blood_group][c] = {
        available: Number(item.available_units || 0),
        total: Number(item.total_units || 0),
        expiring: Number(item.expiring_soon_units || 0)
      };
    }
  });

  return (
    <div className="dashboard-content" style={{ padding: "24px", maxWidth: "1520px", margin: "0 auto" }}>
      {/* Breadcrumbs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "var(--cyan-accent)", marginBottom: "6px" }}>
            <span>India</span>
            <ChevronRight size={14} />
            <span>Telangana</span>
            <ChevronRight size={14} />
            <span>Hyderabad District</span>
            <ChevronRight size={14} />
            <span style={{ color: "var(--text-bright)", fontWeight: "600" }}>Command Board Blood Inventory</span>
          </div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: "800", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <Droplet size={28} style={{ color: "#ff2a55" }} />
            <span>Network-Wide Blood Inventory</span>
          </h1>
          <div style={{ fontSize: "0.86rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Real-Time Consolidated Stock across all Authorized Blood Centres & Transfusion Units
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchInventory}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh Stock</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={onNavigateToDirectory}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Building2 size={15} />
            <span>Browse Facility Directory</span>
          </button>
        </div>
      </div>

      {/* Network KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div className="stat-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Available Units</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#38ef7d", marginTop: "4px" }}>{totalAvailableUnits.toLocaleString()}</div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", marginTop: "2px" }}>Active & Dispatch-Ready</div>
        </div>

        <div className="stat-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Total Network Units</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--cyan-accent)", marginTop: "4px" }}>{totalNetworkUnits.toLocaleString()}</div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", marginTop: "2px" }}>Including Clinical Reserves</div>
        </div>

        <div className="stat-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Expiring ≤5 Days</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#f59e0b", marginTop: "4px" }}>{totalExpiringSoon.toLocaleString()}</div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", marginTop: "2px" }}>Priority Dispatch Alerts</div>
        </div>

        <div className="stat-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Critical Shortages</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "800", color: shortageGroupsCount > 0 ? "#ff2a55" : "#38ef7d", marginTop: "4px" }}>
            {shortageGroupsCount} Groups
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", marginTop: "2px" }}>Below Safe Regional Threshold</div>
        </div>
      </div>

      {/* 8 Blood Groups Status Badges Bar */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(8, 1fr)", 
        gap: "10px", 
        marginBottom: "24px",
        overflowX: "auto"
      }}>
        {BLOOD_GROUPS.map(bg => {
          const gInfo = groupTotals[bg] || { available: 0, total: 0, is_shortage: false };
          const isShortage = gInfo.is_shortage || gInfo.available < 50;

          return (
            <div 
              key={bg}
              onClick={() => setSelectedGroup(selectedGroup === bg ? "" : bg)}
              style={{
                background: selectedGroup === bg 
                  ? "rgba(0, 242, 254, 0.15)" 
                  : isShortage 
                  ? "rgba(255, 42, 85, 0.1)" 
                  : "rgba(18, 22, 36, 0.7)",
                border: `1px solid ${selectedGroup === bg ? "var(--cyan-accent)" : isShortage ? "rgba(255, 42, 85, 0.4)" : "var(--border-color)"}`,
                borderRadius: "10px",
                padding: "12px 10px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{ fontSize: "1.2rem", fontWeight: "800", color: isShortage ? "#ff2a55" : "#fff" }}>
                {bg}
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: "700", color: isShortage ? "#ff6b8b" : "#38ef7d", marginTop: "4px" }}>
                {gInfo.available}
              </div>
              <div style={{ fontSize: "0.68rem", color: isShortage ? "#ff2a55" : "var(--text-dim)", marginTop: "2px", fontWeight: isShortage ? "700" : "normal" }}>
                {isShortage ? "SHORTAGE" : "SAFE"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Consolidated 8x4 Component Matrix */}
      <div style={{ 
        background: "rgba(18, 22, 36, 0.75)", 
        border: "1px solid var(--border-color)", 
        borderRadius: "14px", 
        padding: "24px", 
        overflowX: "auto" 
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#fff", fontWeight: "700" }}>
              District Transfusion Availability Matrix
            </h3>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Aggregate units grouped by Blood Group and Component across Hyderabad
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px", fontSize: "0.78rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#38ef7d" }}></span>
              <span style={{ color: "var(--text-muted)" }}>Abundant Supply</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff2a55" }}></span>
              <span style={{ color: "var(--text-muted)" }}>Regional Shortage</span>
            </div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
          <thead>
            <tr style={{ background: "rgba(255, 255, 255, 0.04)", borderBottom: "1px solid var(--border-color)" }}>
              <th style={{ padding: "14px", textAlign: "left", fontSize: "0.85rem", color: "var(--text-muted)" }}>Blood Group</th>
              <th style={{ padding: "14px", fontSize: "0.85rem", color: "var(--text-muted)" }}>Red Blood Cells (RBC)</th>
              <th style={{ padding: "14px", fontSize: "0.85rem", color: "var(--text-muted)" }}>Whole Blood</th>
              <th style={{ padding: "14px", fontSize: "0.85rem", color: "var(--text-muted)" }}>Fresh Frozen Plasma</th>
              <th style={{ padding: "14px", fontSize: "0.85rem", color: "var(--text-muted)" }}>Platelets</th>
              <th style={{ padding: "14px", fontSize: "0.85rem", color: "var(--text-muted)" }}>Total Available</th>
            </tr>
          </thead>
          <tbody>
            {BLOOD_GROUPS.filter(bg => !selectedGroup || selectedGroup === bg).map(bg => {
              const gInfo = groupTotals[bg] || { available: 0, total: 0 };
              const isShortage = gInfo.available < 50;

              return (
                <tr key={bg} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                  <td style={{ padding: "16px 14px", textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ 
                        display: "inline-block", 
                        padding: "4px 10px", 
                        borderRadius: "6px", 
                        background: "rgba(255, 42, 85, 0.15)", 
                        color: "#ff2a55", 
                        fontWeight: "800",
                        fontSize: "1.1rem",
                        border: "1px solid rgba(255, 42, 85, 0.3)" 
                      }}>
                        {bg}
                      </span>
                      {isShortage && (
                        <span className="badge" style={{ background: "rgba(255, 42, 85, 0.2)", color: "#ff2a55", fontSize: "0.7rem", border: "1px solid #ff2a55" }}>
                          SHORTAGE
                        </span>
                      )}
                    </div>
                  </td>

                  {COMPONENTS.map(c => {
                    const cell = matrixMap[bg][c];
                    return (
                      <td key={c} style={{ padding: "16px 14px" }}>
                        <div style={{ 
                          background: "rgba(255, 255, 255, 0.02)", 
                          padding: "8px 12px", 
                          borderRadius: "8px", 
                          display: "inline-block",
                          minWidth: "100px",
                          border: "1px solid rgba(255, 255, 255, 0.05)"
                        }}>
                          <div style={{ fontSize: "1.15rem", fontWeight: "800", color: cell.available < 15 ? "#ff2a55" : "#38ef7d" }}>
                            {cell.available.toLocaleString()}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "2px" }}>
                            Total: {cell.total.toLocaleString()}
                          </div>
                        </div>
                      </td>
                    );
                  })}

                  <td style={{ padding: "16px 14px" }}>
                    <div style={{ fontSize: "1.25rem", fontWeight: "800", color: isShortage ? "#ff6b8b" : "var(--cyan-accent)" }}>
                      {gInfo.available.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                      / {gInfo.total.toLocaleString()} total
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
