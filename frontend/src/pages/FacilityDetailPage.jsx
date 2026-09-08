import React, { useState, useEffect } from "react";
import { 
  Building2, 
  ArrowLeft, 
  ChevronRight, 
  ShieldCheck, 
  ShieldAlert, 
  Archive, 
  RotateCcw, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  Thermometer, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers, 
  X,
  RefreshCw,
  QrCode
} from "lucide-react";
import { api } from "../api/api";
import DeboardModal from "../components/DeboardModal";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENTS = ["RBC", "WHOLE_BLOOD", "PLASMA", "PLATELETS"];

export default function FacilityDetailPage({ facilityId, onBack }) {
  const [facility, setFacility] = useState(null);
  const [bloodUnits, setBloodUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("inventory"); // 'inventory' | 'units' | 'attached'
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedComponent, setSelectedComponent] = useState("");
  const [isDeboardModalOpen, setIsDeboardModalOpen] = useState(false);
  const [activeTrackingUnit, setActiveTrackingUnit] = useState(null);
  const [trackingEvents, setTrackingEvents] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const fetchFacilityData = async () => {
    try {
      setLoading(true);
      const res = await api.getFacilityById(facilityId);
      setFacility(res.data);
    } catch (err) {
      console.error("Error fetching facility details:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBloodUnits = async () => {
    try {
      setUnitsLoading(true);
      const res = await api.getFacilityBloodUnits(facilityId, {
        blood_group: selectedGroup || undefined,
        component: selectedComponent || undefined,
        limit: 150
      });
      setBloodUnits(res.data || []);
    } catch (err) {
      console.error("Error fetching facility units:", err);
    } finally {
      setUnitsLoading(false);
    }
  };

  useEffect(() => {
    if (facilityId) {
      fetchFacilityData();
      fetchBloodUnits();
    }
  }, [facilityId]);

  useEffect(() => {
    if (facilityId) {
      fetchBloodUnits();
    }
  }, [selectedGroup, selectedComponent]);

  const handleOpenTracking = async (unit) => {
    setActiveTrackingUnit(unit);
    try {
      setTrackingLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";
      const res = await fetch(`${apiBase}/blood-units/${unit.id}`);
      const data = await res.json();
      setTrackingEvents(data.data?.events || []);
    } catch (err) {
      console.error("Error fetching unit tracking timeline:", err);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm(`Restore facility "${facility.facility_name}" to the active blood network?`)) {
      return;
    }
    try {
      await api.restoreFacility(facility.id, {
        reason: "Administrative reactivation by State Blood Transfusion Council"
      });
      fetchFacilityData();
    } catch (err) {
      alert(`Error restoring facility: ${err.message}`);
    }
  };

  const handleVerify = async () => {
    try {
      await api.verifyFacility(facility.id, { status: "VERIFIED", notes: "Inspection verified" });
      fetchFacilityData();
    } catch (err) {
      alert(`Error verifying facility: ${err.message}`);
    }
  };

  if (loading || !facility) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
        <RefreshCw size={32} className="spin" style={{ color: "var(--cyan-accent)", marginBottom: "16px" }} />
        <div>Loading Facility Telemetry & Inventory...</div>
      </div>
    );
  }

  const isDeboarded = facility.operating_status === "DEBOARDED" || !facility.is_active;
  const isPendingVerification = facility.verification_status === "PENDING_VERIFICATION" || facility.verification_status === "UNVERIFIED";

  // Build inventory matrix for visual table
  const inventoryMatrix = {};
  BLOOD_GROUPS.forEach(bg => {
    inventoryMatrix[bg] = {};
    COMPONENTS.forEach(comp => {
      inventoryMatrix[bg][comp] = { available: 0, total: 0 };
    });
  });

  (facility.inventory || []).forEach(item => {
    if (inventoryMatrix[item.blood_group]) {
      const c = COMPONENTS.includes(item.component) ? item.component : "WHOLE_BLOOD";
      inventoryMatrix[item.blood_group][c] = {
        available: Number(item.available_units || 0),
        total: Number(item.total_units || 0)
      };
    }
  });

  return (
    <div className="dashboard-content" style={{ padding: "24px", maxWidth: "1520px", margin: "0 auto" }}>
      {/* Top Breadcrumbs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "var(--cyan-accent)" }}>
          <button 
            onClick={onBack}
            className="btn-icon"
            style={{ padding: "4px 8px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "4px", color: "var(--text-bright)" }}
            title="Back to Directory"
          >
            <ArrowLeft size={16} />
          </button>
          <span>India</span>
          <ChevronRight size={14} />
          <span>{facility.state}</span>
          <ChevronRight size={14} />
          <span>{facility.district}</span>
          <ChevronRight size={14} />
          <span>{facility.area || facility.city}</span>
          <ChevronRight size={14} />
          <span style={{ color: "var(--text-bright)", fontWeight: "600" }}>{facility.facility_name}</span>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {isPendingVerification && !isDeboarded && (
            <button
              className="btn btn-sm"
              onClick={handleVerify}
              style={{ background: "rgba(56, 239, 125, 0.15)", color: "#38ef7d", border: "1px solid rgba(56, 239, 125, 0.3)", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <ShieldCheck size={14} />
              <span>Verify Facility</span>
            </button>
          )}

          {isDeboarded ? (
            <button
              className="btn btn-sm"
              onClick={handleRestore}
              style={{ background: "rgba(56, 239, 125, 0.2)", color: "#38ef7d", border: "1px solid #38ef7d", display: "flex", alignItems: "center", gap: "6px", fontWeight: "700" }}
            >
              <RotateCcw size={14} />
              <span>Restore to Network</span>
            </button>
          ) : (
            <button
              className="btn btn-sm"
              onClick={() => setIsDeboardModalOpen(true)}
              style={{ background: "rgba(255, 42, 85, 0.12)", color: "#ff6b8b", border: "1px solid rgba(255, 42, 85, 0.3)", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Archive size={14} />
              <span>Deboard Facility</span>
            </button>
          )}
        </div>
      </div>

      {/* Prominent Deboarded Warning Banner */}
      {isDeboarded && (
        <div style={{
          background: "linear-gradient(135deg, rgba(255, 42, 85, 0.2) 0%, rgba(184, 0, 43, 0.15) 100%)",
          border: "1px solid rgba(255, 42, 85, 0.5)",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}>
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <div style={{ 
              width: "44px", 
              height: "44px", 
              borderRadius: "10px", 
              background: "#ff2a55", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 0 15px rgba(255, 42, 85, 0.5)"
            }}>
              <ShieldAlert size={26} />
            </div>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#fff" }}>
                FACILITY CURRENTLY DEBOARDED FROM ACTIVE DISPATCH
              </div>
              <div style={{ fontSize: "0.84rem", color: "#ffb4c2", marginTop: "2px" }}>
                <strong>Reason:</strong> {facility.deboard_reason || "Administrative soft-deboard"} • <strong>Deboarded by:</strong> {facility.deboarded_by || "Network Council"}
              </div>
            </div>
          </div>

          <button
            className="btn btn-sm"
            onClick={handleRestore}
            style={{
              background: "#38ef7d",
              color: "#000",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 0 15px rgba(56, 239, 125, 0.4)"
            }}
          >
            <RotateCcw size={14} />
            <span>Restore Facility to Network</span>
          </button>
        </div>
      )}

      {/* Facility Header Card */}
      <div style={{
        background: "rgba(18, 22, 36, 0.75)",
        border: "1px solid var(--border-color)",
        borderRadius: "14px",
        padding: "24px",
        marginBottom: "24px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
              <span className="badge" style={{ background: "rgba(0, 242, 254, 0.15)", color: "var(--cyan-accent)", border: "1px solid rgba(0, 242, 254, 0.3)", fontSize: "0.76rem", fontWeight: "700" }}>
                {facility.facility_type.replace(/_/g, " ")}
              </span>
              <span className="badge" style={{ background: "rgba(180, 0, 255, 0.15)", color: "#c084fc", border: "1px solid rgba(180, 0, 255, 0.3)", fontSize: "0.76rem" }}>
                {facility.ownership}
              </span>
              {facility.verification_status === "VERIFIED" ? (
                <span className="badge" style={{ background: "rgba(56, 239, 125, 0.15)", color: "#38ef7d", border: "1px solid rgba(56, 239, 125, 0.3)", fontSize: "0.76rem", display: "flex", alignItems: "center", gap: "4px" }}>
                  <ShieldCheck size={12} /> VERIFIED FACILITY
                </span>
              ) : (
                <span className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)", fontSize: "0.76rem" }}>
                  VERIFICATION PENDING
                </span>
              )}
            </div>

            <h1 style={{ margin: "0 0 6px 0", fontSize: "1.7rem", fontWeight: "800", color: "#fff" }}>
              {facility.facility_name}
            </h1>
            <div style={{ fontSize: "0.85rem", fontFamily: "monospace", color: "var(--cyan-accent)" }}>
              CODE: {facility.facility_code} {facility.registration_number ? `• REG: ${facility.registration_number}` : ""}
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: "flex", gap: "16px" }}>
            <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "10px 16px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Available Units</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#38ef7d" }}>{facility.summary?.availableUnits || 0}</div>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "10px 16px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Total Stock</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-bright)" }}>{facility.summary?.totalUnits || 0}</div>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "10px 16px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Expiring ≤5 Days</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#f59e0b" }}>{facility.summary?.expiringSoonUnits || 0}</div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", 
          gap: "14px", 
          marginTop: "20px", 
          paddingTop: "18px", 
          borderTop: "1px solid var(--border-color)",
          fontSize: "0.82rem" 
        }}>
          <div>
            <span style={{ color: "var(--text-dim)", display: "block", marginBottom: "2px" }}>Location & Address:</span>
            <span style={{ color: "var(--text-bright)", display: "flex", alignItems: "center", gap: "5px" }}>
              <MapPin size={13} style={{ color: "var(--cyan-accent)", flexShrink: 0 }} />
              <span>{facility.address}</span>
            </span>
          </div>

          <div>
            <span style={{ color: "var(--text-dim)", display: "block", marginBottom: "2px" }}>Contact Telephone:</span>
            <span style={{ color: "var(--text-bright)", display: "flex", alignItems: "center", gap: "5px" }}>
              <Phone size={13} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
              <span>{facility.phone || "Not Listed"}</span>
            </span>
          </div>

          <div>
            <span style={{ color: "var(--text-dim)", display: "block", marginBottom: "2px" }}>Official Email:</span>
            <span style={{ color: "var(--text-bright)", display: "flex", alignItems: "center", gap: "5px" }}>
              <Mail size={13} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
              <span>{facility.email || "Not Listed"}</span>
            </span>
          </div>

          <div>
            <span style={{ color: "var(--text-dim)", display: "block", marginBottom: "2px" }}>Transfusion In-Charge:</span>
            <span style={{ color: "var(--text-bright)" }}>{facility.contact_person || "Medical Superintendent"}</span>
          </div>

          <div>
            <span style={{ color: "var(--text-dim)", display: "block", marginBottom: "2px" }}>Established:</span>
            <span style={{ color: "var(--text-bright)" }}>{facility.established_year || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", marginBottom: "20px" }}>
        <button
          className={`btn ${activeTab === "inventory" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("inventory")}
          style={{ borderRadius: "8px 8px 0 0", borderBottom: "none", padding: "10px 18px", fontSize: "0.85rem" }}
        >
          Blood Component Matrix
        </button>
        <button
          className={`btn ${activeTab === "units" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("units")}
          style={{ borderRadius: "8px 8px 0 0", borderBottom: "none", padding: "10px 18px", fontSize: "0.85rem" }}
        >
          Individual Blood Units ({bloodUnits.length})
        </button>
        {facility.attachedCentres?.length > 0 && (
          <button
            className={`btn ${activeTab === "attached" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("attached")}
            style={{ borderRadius: "8px 8px 0 0", borderBottom: "none", padding: "10px 18px", fontSize: "0.85rem" }}
          >
            Attached Storage Units ({facility.attachedCentres.length})
          </button>
        )}
      </div>

      {/* TAB 1: Blood Component Matrix */}
      {activeTab === "inventory" && (
        <div style={{ 
          background: "rgba(18, 22, 36, 0.75)", 
          border: "1px solid var(--border-color)", 
          borderRadius: "12px", 
          padding: "20px", 
          overflowX: "auto" 
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fff", fontWeight: "700" }}>
                Multi-Component Inventory Matrix
              </h3>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                8 Blood Groups x 4 Component Categories (Available / Total Units)
              </div>
            </div>
            <div style={{ display: "flex", gap: "16px", fontSize: "0.78rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#38ef7d" }}></span>
                <span style={{ color: "var(--text-muted)" }}>Adequate (≥10)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }}></span>
                <span style={{ color: "var(--text-muted)" }}>Moderate (5-9)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff2a55" }}></span>
                <span style={{ color: "var(--text-muted)" }}>Critical Shortage (&lt;5)</span>
              </div>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
            <thead>
              <tr style={{ background: "rgba(255, 255, 255, 0.04)", borderBottom: "1px solid var(--border-color)" }}>
                <th style={{ padding: "12px", textAlign: "left", fontSize: "0.82rem", color: "var(--text-muted)" }}>Blood Group</th>
                <th style={{ padding: "12px", fontSize: "0.82rem", color: "var(--text-muted)" }}>Red Blood Cells (RBC)</th>
                <th style={{ padding: "12px", fontSize: "0.82rem", color: "var(--text-muted)" }}>Whole Blood</th>
                <th style={{ padding: "12px", fontSize: "0.82rem", color: "var(--text-muted)" }}>Fresh Frozen Plasma</th>
                <th style={{ padding: "12px", fontSize: "0.82rem", color: "var(--text-muted)" }}>Platelets</th>
                <th style={{ padding: "12px", fontSize: "0.82rem", color: "var(--text-muted)" }}>Group Total</th>
              </tr>
            </thead>
            <tbody>
              {BLOOD_GROUPS.map((bg) => {
                let rowTotal = 0;
                let rowAvailable = 0;

                COMPONENTS.forEach(c => {
                  const cell = inventoryMatrix[bg][c];
                  rowTotal += cell.total;
                  rowAvailable += cell.available;
                });

                return (
                  <tr key={bg} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <td style={{ padding: "12px", textAlign: "left", fontWeight: "700", color: "#fff", fontSize: "1rem" }}>
                      <span style={{ 
                        display: "inline-block", 
                        padding: "3px 8px", 
                        borderRadius: "4px", 
                        background: "rgba(255, 42, 85, 0.15)", 
                        color: "#ff2a55", 
                        border: "1px solid rgba(255, 42, 85, 0.3)" 
                      }}>
                        {bg}
                      </span>
                    </td>

                    {COMPONENTS.map(c => {
                      const cell = inventoryMatrix[bg][c];
                      const isShortage = cell.available < 5;
                      const isModerate = cell.available >= 5 && cell.available < 10;
                      const statusColor = isShortage ? "#ff2a55" : isModerate ? "#f59e0b" : "#38ef7d";

                      return (
                        <td key={c} style={{ padding: "12px" }}>
                          <div style={{ display: "inline-block", padding: "4px 10px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.02)", border: `1px solid rgba(255,255,255,0.06)` }}>
                            <span style={{ fontSize: "1.05rem", fontWeight: "700", color: statusColor }}>
                              {cell.available}
                            </span>
                            <span style={{ fontSize: "0.74rem", color: "var(--text-dim)", marginLeft: "4px" }}>
                              / {cell.total}
                            </span>
                          </div>
                        </td>
                      );
                    })}

                    <td style={{ padding: "12px", fontWeight: "700", color: "var(--cyan-accent)", fontSize: "0.95rem" }}>
                      {rowAvailable} <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>avail</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: Individual Blood Units */}
      {activeTab === "units" && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <select
              className="form-control"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              style={{ width: "180px", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
            >
              <option value="">All Blood Groups</option>
              {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>

            <select
              className="form-control"
              value={selectedComponent}
              onChange={(e) => setSelectedComponent(e.target.value)}
              style={{ width: "200px", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
            >
              <option value="">All Components</option>
              {COMPONENTS.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>

            <span style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>
              Showing {bloodUnits.length} tracked blood units
            </span>
          </div>

          {/* Units Table */}
          <div style={{ 
            background: "rgba(18, 22, 36, 0.75)", 
            border: "1px solid var(--border-color)", 
            borderRadius: "12px", 
            overflowX: "auto" 
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.04)", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px", color: "var(--text-muted)" }}>Unit Barcode ID</th>
                  <th style={{ padding: "12px", color: "var(--text-muted)" }}>Group & Component</th>
                  <th style={{ padding: "12px", color: "var(--text-muted)" }}>Storage & Telemetry</th>
                  <th style={{ padding: "12px", color: "var(--text-muted)" }}>Collection / Expiry</th>
                  <th style={{ padding: "12px", color: "var(--text-muted)" }}>Days Remaining</th>
                  <th style={{ padding: "12px", color: "var(--text-muted)" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-muted)" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {bloodUnits.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                      No blood units matched the filter criteria.
                    </td>
                  </tr>
                ) : (
                  bloodUnits.map((u) => {
                    const isExpiringSoon = u.expiry_status === "EXPIRING_SOON";
                    const isExpired = u.expiry_status === "EXPIRED";

                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                        {/* Barcode ID */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontFamily: "monospace", fontWeight: "700", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                            <QrCode size={14} style={{ color: "var(--cyan-accent)" }} />
                            <span>{u.unit_id}</span>
                          </div>
                        </td>

                        {/* Group & Component */}
                        <td style={{ padding: "12px" }}>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span style={{ 
                              padding: "2px 6px", 
                              borderRadius: "4px", 
                              background: "rgba(255, 42, 85, 0.15)", 
                              color: "#ff2a55", 
                              fontWeight: "700",
                              fontSize: "0.78rem"
                            }}>
                              {u.blood_group}
                            </span>
                            <span style={{ color: "var(--text-bright)", fontWeight: "600" }}>
                              {u.component?.replace(/_/g, " ")}
                            </span>
                          </div>
                        </td>

                        {/* Storage & Telemetry */}
                        <td style={{ padding: "12px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ color: "var(--text-normal)" }}>{u.storage_location || "Central Cold Bay"}</span>
                            {u.temperature_celsius !== null && (
                              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.74rem", color: "var(--cyan-accent)" }}>
                                <Thermometer size={12} />
                                <span>{u.temperature_celsius}°C (Safe: {u.target_temperature_c})</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Collection / Expiry */}
                        <td style={{ padding: "12px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.74rem" }}>Coll: {u.collection_date || "N/A"}</span>
                            <span style={{ color: isExpired ? "#ff2a55" : isExpiringSoon ? "#f59e0b" : "var(--text-bright)", fontWeight: "600" }}>
                              Exp: {u.expiry_date || "N/A"}
                            </span>
                          </div>
                        </td>

                        {/* Days Remaining Badge */}
                        <td style={{ padding: "12px" }}>
                          {isExpired ? (
                            <span className="badge" style={{ background: "rgba(255, 42, 85, 0.2)", color: "#ff2a55", border: "1px solid #ff2a55" }}>
                              EXPIRED
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="badge" style={{ background: "rgba(245, 158, 11, 0.2)", color: "#f59e0b", border: "1px solid #f59e0b" }}>
                              {u.days_remaining}d remaining
                            </span>
                          ) : (
                            <span className="badge" style={{ background: "rgba(56, 239, 125, 0.15)", color: "#38ef7d" }}>
                              {u.days_remaining}d remaining
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: "12px" }}>
                          <span style={{ 
                            fontSize: "0.72rem", 
                            fontWeight: "700", 
                            padding: "2px 8px", 
                            borderRadius: "4px",
                            background: u.status === "IN_TRANSIT" ? "rgba(0, 242, 254, 0.2)" : "rgba(255, 255, 255, 0.06)",
                            color: u.status === "IN_TRANSIT" ? "var(--cyan-accent)" : "var(--text-bright)"
                          }}>
                            {u.status}
                          </span>
                        </td>

                        {/* Action */}
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOpenTracking(u)}
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.74rem" }}
                          >
                            <Truck size={12} />
                            <span>Timeline</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Attached Centres */}
      {activeTab === "attached" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {(facility.attachedCentres || []).map(att => (
            <div key={att.id} style={{ 
              background: "rgba(18, 22, 36, 0.75)", 
              border: "1px solid var(--border-color)", 
              borderRadius: "10px", 
              padding: "16px" 
            }}>
              <div style={{ fontSize: "0.74rem", color: "var(--cyan-accent)", fontFamily: "monospace", marginBottom: "4px" }}>
                {att.facility_code}
              </div>
              <h4 style={{ margin: "0 0 6px 0", color: "#fff", fontSize: "1rem" }}>{att.facility_name}</h4>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "10px" }}>
                <MapPin size={12} style={{ display: "inline", marginRight: "4px" }} />
                <span>{att.address}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px" }}>
                <span className="badge" style={{ fontSize: "0.7rem", background: "rgba(56, 239, 125, 0.15)", color: "#38ef7d" }}>
                  {att.operating_status}
                </span>
                <span style={{ fontSize: "0.76rem", color: "var(--text-dim)" }}>
                  Phone: {att.phone || "N/A"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tracking Timeline Modal */}
      {activeTrackingUnit && (
        <div className="modal-backdrop" onClick={() => setActiveTrackingUnit(null)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: "600px" }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.18rem", fontWeight: "700", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Truck size={20} style={{ color: "var(--cyan-accent)" }} />
                  <span>Tracking Lifecycle: {activeTrackingUnit.unit_id}</span>
                </h3>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Group: <strong>{activeTrackingUnit.blood_group}</strong> • Component: <strong>{activeTrackingUnit.component}</strong>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setActiveTrackingUnit(null)}>
                <X size={18} />
              </button>
            </div>

            {trackingLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                <RefreshCw size={24} className="spin" style={{ color: "var(--cyan-accent)", marginBottom: "8px" }} />
                <div>Loading Chain of Custody...</div>
              </div>
            ) : trackingEvents.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                No tracking lifecycle events logged yet for this unit.
              </div>
            ) : (
              <div style={{ position: "relative", paddingLeft: "24px" }}>
                {/* Timeline vertical bar */}
                <div style={{ position: "absolute", left: "7px", top: "10px", bottom: "10px", width: "2px", background: "var(--cyan-accent)", opacity: 0.3 }}></div>

                {trackingEvents.map((ev, idx) => (
                  <div key={idx} style={{ position: "relative", marginBottom: "20px" }}>
                    {/* Dot */}
                    <div style={{
                      position: "absolute",
                      left: "-21px",
                      top: "2px",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: "var(--cyan-accent)",
                      boxShadow: "0 0 8px var(--cyan-accent)"
                    }}></div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                        <span style={{ fontWeight: "700", color: "#fff", fontSize: "0.88rem" }}>{ev.event_type}</span>
                        <span style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                          {new Date(ev.event_time || ev.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-normal)" }}>{ev.event_description || ev.notes || "Verified by hub"}</div>
                      {ev.temperature_celsius !== undefined && ev.temperature_celsius !== null && (
                        <div style={{ fontSize: "0.74rem", color: "var(--cyan-accent)", marginTop: "3px" }}>
                          🌡️ Telemetry: {ev.temperature_celsius}°C
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Privacy Compliance Banner */}
            <div style={{ 
              background: "rgba(0, 242, 254, 0.05)", 
              border: "1px solid rgba(0, 242, 254, 0.2)", 
              borderRadius: "6px", 
              padding: "10px 12px", 
              fontSize: "0.76rem", 
              color: "var(--cyan-accent)", 
              marginTop: "16px" 
            }}>
              🔒 <strong>Donor Privacy Protected:</strong> Donor identifying information (name, address, telephone) is scrubbed in compliance with blood banking privacy regulations.
            </div>
          </div>
        </div>
      )}

      {/* Deboard Modal */}
      <DeboardModal
        isOpen={isDeboardModalOpen}
        facility={facility}
        onClose={() => setIsDeboardModalOpen(false)}
        onSuccess={() => {
          setIsDeboardModalOpen(false);
          fetchFacilityData();
        }}
      />
    </div>
  );
}
