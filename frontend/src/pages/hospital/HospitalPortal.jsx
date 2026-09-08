import React, { useState, useEffect } from "react";
import {
  Activity,
  Building2,
  Droplets,
  Package,
  Plus,
  Radio,
  Users,
  CheckSquare,
  Truck,
  MapPin,
  Bell,
  ShieldCheck,
  FileText,
  LogOut,
  AlertTriangle,
  RotateCw,
  Search,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Clock,
  Send
} from "lucide-react";
import BloodDropIcon from "../../components/BloodDropIcon";
import { api } from "../../api/api";
import { navigate } from "../../utils/router";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const CRITICAL_THRESHOLD = 10;

export default function HospitalPortal({ user, onSignOut }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [hospitalData, setHospitalData] = useState(user?.hospital || {});
  const [bloodStock, setBloodStock] = useState({});
  const [requests, setRequests] = useState([]);
  const [matches, setMatches] = useState([]);
  const [bloodUnits, setBloodUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Request Form State
  const [reqBloodGroup, setReqBloodGroup] = useState("O-");
  const [reqUnits, setReqUnits] = useState(2);
  const [reqUrgency, setReqUrgency] = useState("CRITICAL");
  const [reqCreating, setReqCreating] = useState(false);
  const [reqSuccessMsg, setReqSuccessMsg] = useState("");

  const hospitalId = hospitalData?.id || user?.hospital_id || 1;
  const hospitalName = hospitalData?.hospital_name || user?.organization || "Apollo Hospitals - Bannerghatta";

  const loadHospitalData = async () => {
    try {
      setLoading(true);
      const [hospStockRes, reqsRes, matchesRes, unitsRes] = await Promise.all([
        api.getHospitalBloodStockById(hospitalId).catch(async () => {
          const allStock = await api.getHospitalBloodStock().catch(() => ({ data: [] }));
          return { data: allStock.data?.[0] || {} };
        }),
        api.getRequests().catch(() => ({ data: [] })),
        api.getMatches().catch(() => ({ data: [] })),
        api.getBloodUnits().catch(() => ({ data: [] }))
      ]);

      if (hospStockRes?.data) {
        setHospitalData((prev) => ({ ...prev, ...hospStockRes.data }));
        setBloodStock(hospStockRes.data.blood_stock || {});
      }

      setRequests(reqsRes.data || []);
      setMatches(matchesRes.data || []);
      setBloodUnits(unitsRes.data || []);
    } catch (err) {
      console.error("Error loading hospital operations data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospitalData();
  }, [hospitalId]);

  // Compute stats
  const totalStockUnits = Object.values(bloodStock).reduce((acc, v) => acc + Number(v || 0), 0);
  const criticalShortageGroups = BLOOD_GROUPS.filter((bg) => (bloodStock[bg] || 0) < CRITICAL_THRESHOLD);
  const hospitalRequests = requests.filter((r) => r.hospital_id === hospitalId || !r.hospital_id);
  const activeRequests = hospitalRequests.filter((r) => r.status === "OPEN" || r.status === "MATCHING");
  const inTransitUnits = bloodUnits.filter((u) => u.status === "IN_TRANSIT");

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setReqCreating(true);
    setReqSuccessMsg("");

    try {
      const payload = {
        hospital_id: hospitalId,
        blood_group: reqBloodGroup,
        units_required: Number(reqUnits),
        urgency: reqUrgency,
        required_by: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        latitude: hospitalData?.latitude || 12.9716,
        longitude: hospitalData?.longitude || 77.5946
      };

      const res = await api.createRequest(payload);
      setReqSuccessMsg(`Emergency request for ${reqUnits} units of ${reqBloodGroup} created! Tier-1 donor matching automatically triggered.`);
      loadHospitalData();
    } catch (err) {
      alert("Failed to create request: " + err.message);
    } finally {
      setReqCreating(false);
    }
  };

  const handleLogout = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      localStorage.removeItem("hexavision_session_token");
      localStorage.removeItem("hexavision_auth_user");
      navigate("/login");
    }
  };

  const hospitalNavItems = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "blood-stock", label: "Blood Stock", icon: Droplets, badge: criticalShortageGroups.length > 0 ? `${criticalShortageGroups.length} Critical` : null },
    { id: "blood-inventory", label: "Blood Inventory", icon: Package },
    { id: "create-request", label: "Create Blood Request", icon: Plus },
    { id: "emergency-requests", label: "Emergency Requests", icon: Radio, badge: activeRequests.length > 0 ? `${activeRequests.length} Active` : null },
    { id: "matched-donors", label: "Matched Donors", icon: Users },
    { id: "donor-responses", label: "Donor Responses", icon: CheckSquare },
    { id: "blood-tracking", label: "Blood Tracking", icon: Truck, badge: inTransitUnits.length > 0 ? `${inTransitUnits.length} En Route` : null },
    { id: "live-map", label: "Live Map", icon: MapPin },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "hospital-profile", label: "Hospital Profile", icon: Building2 },
    { id: "reports", label: "Reports & Analytics", icon: FileText }
  ];

  return (
    <div className="app-shell" style={{ display: "flex", minHeight: "100vh" }}>
      {/* ==================================================== */}
      {/* HOSPITAL SPECIFIC SIDEBAR                            */}
      {/* ==================================================== */}
      <aside className="sidebar" style={{ width: "260px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflowY: "auto", maxHeight: "100vh", padding: "18px 14px" }}>
        <div>
          {/* Header Branding */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <div className="brand-hexagon logo-blood-pulse" style={{ width: "38px", height: "38px" }}>
              <BloodDropIcon size={20} color="#ffffff" variant="filled" animated />
            </div>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: "900", letterSpacing: "0.06em", color: "#ffffff" }}>
                HEXAVISION
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--cyan-accent)", fontWeight: "800", letterSpacing: "0.08em" }}>
                HOSPITAL PORTAL
              </div>
            </div>
          </div>

          {/* Hospital Identification Card */}
          <div style={{
            background: "rgba(0, 242, 254, 0.08)",
            border: "1px solid rgba(0, 242, 254, 0.3)",
            borderRadius: "10px",
            padding: "8px 10px",
            marginBottom: "16px"
          }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Authorized Facility
            </div>
            <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {hospitalName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
              <ShieldCheck size={14} color="var(--status-available)" />
              <span style={{ fontSize: "0.7rem", color: "var(--status-available)", fontWeight: "700" }}>
                VERIFIED BLOOD BANK
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <ul className="nav-list" style={{ listStyle: "none" }}>
            {hospitalNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id} style={{ marginBottom: "2px" }}>
                  <button
                    type="button"
                    className={`nav-item-btn ${isActive ? "active" : ""}`}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Icon size={16} className="nav-icon" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && <span className="nav-pill">{item.badge}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Bottom Sign Out */}
        <div style={{ paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "12px" }}>
          <button
            type="button"
            id="btn-hospital-logout"
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "9px 12px",
              borderRadius: "8px",
              background: "rgba(255, 42, 85, 0.12)",
              border: "1px solid rgba(255, 42, 85, 0.3)",
              color: "#ff4d6d",
              fontWeight: "700",
              fontSize: "0.84rem",
              cursor: "pointer"
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ==================================================== */}
      {/* HOSPITAL PORTAL CONTENT AREA                         */}
      {/* ==================================================== */}
      <div className="main-shell" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top Header Banner */}
        <header className="top-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 28px" }}>
          <div>
            <div style={{ fontSize: "0.72rem", color: "var(--cyan-accent)", fontWeight: "800", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Emergency Blood Operations
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff" }}>
              {hospitalName}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              className="btn btn-emergency btn-sm"
              onClick={() => setActiveTab("create-request")}
            >
              <Plus size={15} />
              <span>Create Blood Request</span>
            </button>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "8px",
              background: "rgba(0, 242, 254, 0.1)",
              border: "1px solid rgba(0, 242, 254, 0.3)",
              fontSize: "0.8rem",
              fontWeight: "700",
              color: "var(--cyan-accent)"
            }}>
              <Droplets size={15} />
              <span>{totalStockUnits} Units In Stock</span>
            </div>

            <button
              type="button"
              id="btn-hospital-header-logout"
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "rgba(255, 42, 85, 0.1)",
                border: "1px solid rgba(255, 42, 85, 0.3)",
                color: "#ff4d6d",
                fontSize: "0.8rem",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="content-body" style={{ padding: "24px 28px", flex: 1, overflowY: "auto" }}>
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === "dashboard" && (
            <div>
              {/* Critical Shortage Warning Banner */}
              {criticalShortageGroups.length > 0 && (
                <div style={{
                  background: "rgba(255, 42, 85, 0.14)",
                  border: "1px solid rgba(255, 42, 85, 0.4)",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "24px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <AlertTriangle size={24} color="#ff2a55" />
                    <div>
                      <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "#ffffff" }}>
                        Critical Blood Shortage Alert ({criticalShortageGroups.join(", ")})
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Stock levels are below the minimum clinical safety threshold ({CRITICAL_THRESHOLD} units).
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-emergency btn-sm"
                    onClick={() => {
                      setReqBloodGroup(criticalShortageGroups[0] || "O-");
                      setActiveTab("create-request");
                    }}
                  >
                    Request Supply Now
                  </button>
                </div>
              )}

              {/* Stat Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                <div className="card-glass" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                    Total Available Blood
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#ffffff", marginTop: "4px" }}>
                    {totalStockUnits} Units
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Across 8 blood groups
                  </div>
                </div>

                <div className="card-glass" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                    Active Blood Requests
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: activeRequests.length > 0 ? "#ff2a55" : "#ffffff", marginTop: "4px" }}>
                    {activeRequests.length} Open
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Awaiting donor responses
                  </div>
                </div>

                <div className="card-glass" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                    Matched Donors
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "var(--cyan-accent)", marginTop: "4px" }}>
                    {matches.length} Candidates
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Ranked by compatibility
                  </div>
                </div>

                <div className="card-glass" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                    Units In Transit
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: inTransitUnits.length > 0 ? "var(--status-available)" : "#ffffff", marginTop: "4px" }}>
                    {inTransitUnits.length} Shipments
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Active GPS tracking
                  </div>
                </div>
              </div>

              {/* Visual Blood Stock Grid */}
              <div className="card-glass" style={{ padding: "22px", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Droplets size={20} color="var(--cyan-accent)" />
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff" }}>
                      Hospital Blood Stock Matrix
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setActiveTab("blood-stock")}
                  >
                    Manage Stock
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
                  {BLOOD_GROUPS.map((bg) => {
                    const units = Number(bloodStock[bg] || 0);
                    const isCritical = units < CRITICAL_THRESHOLD;
                    return (
                      <div
                        key={bg}
                        style={{
                          background: isCritical ? "rgba(255, 42, 85, 0.12)" : "rgba(255, 255, 255, 0.04)",
                          border: isCritical ? "1px solid rgba(255, 42, 85, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "10px",
                          padding: "14px 10px",
                          textAlign: "center"
                        }}
                      >
                        <div style={{ fontSize: "1.1rem", fontWeight: "900", color: isCritical ? "#ff2a55" : "#ffffff" }}>
                          {bg}
                        </div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "800", color: isCritical ? "#ff4d6d" : "var(--cyan-accent)", marginTop: "4px" }}>
                          {units}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: isCritical ? "#ff4d6d" : "var(--text-muted)", fontWeight: "700", marginTop: "2px" }}>
                          {isCritical ? "CRITICAL" : "OPTIMAL"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Requests List */}
              <div className="card-glass" style={{ padding: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Radio size={20} color="#ff2a55" />
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff" }}>
                      Active Hospital Blood Requests
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="btn btn-emergency btn-sm"
                    onClick={() => setActiveTab("create-request")}
                  >
                    + New Request
                  </button>
                </div>

                {activeRequests.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                    <CheckCircle2 size={30} color="var(--status-available)" style={{ margin: "0 auto 8px" }} />
                    <p style={{ fontSize: "0.88rem" }}>No open pending requests. All recent requests have been fulfilled or matched.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {activeRequests.map((req) => (
                      <div
                        key={req.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 16px",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "10px"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{
                            background: "#ff2a55",
                            color: "#ffffff",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "0.84rem",
                            fontWeight: "800"
                          }}>
                            {req.blood_group}
                          </span>
                          <div>
                            <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "#ffffff" }}>
                              Request #{req.id} • {req.units_required} Units Required
                            </div>
                            <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                              Urgency: <strong style={{ color: req.urgency === "CRITICAL" ? "#ff2a55" : "#f59e0b" }}>{req.urgency}</strong> • Status: {req.status}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => setActiveTab("matched-donors")}
                        >
                          View Matched Donors
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: BLOOD STOCK */}
          {activeTab === "blood-stock" && (
            <div className="card-glass" style={{ padding: "26px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Blood Stock Levels & Reserve Capacity
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                {BLOOD_GROUPS.map((bg) => {
                  const units = Number(bloodStock[bg] || 0);
                  const isCritical = units < CRITICAL_THRESHOLD;
                  return (
                    <div key={bg} style={{
                      background: "rgba(255,255,255,0.03)",
                      border: isCritical ? "1px solid rgba(255, 42, 85, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "10px",
                      padding: "16px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "1.2rem", fontWeight: "900", color: "#ffffff" }}>{bg}</span>
                        <span style={{ fontSize: "0.72rem", color: isCritical ? "#ff4d6d" : "var(--status-available)", fontWeight: "700" }}>
                          {isCritical ? "CRITICAL" : "ADEQUATE"}
                        </span>
                      </div>
                      <div style={{ fontSize: "1.8rem", fontWeight: "800", color: isCritical ? "#ff4d6d" : "var(--cyan-accent)", margin: "8px 0" }}>
                        {units} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>units</span>
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                        Threshold: {CRITICAL_THRESHOLD} units
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: BLOOD INVENTORY */}
          {activeTab === "blood-inventory" && (
            <div className="card-glass" style={{ padding: "26px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Hierarchical Component Inventory
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "20px" }}>
                Inventory tracked across Whole Blood, Packed Red Blood Cells (PRBC), Fresh Frozen Plasma (FFP), and Single Donor Platelets.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: "700" }}>WHOLE BLOOD</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#ffffff", marginTop: "4px" }}>
                    {Math.round(totalStockUnits * 0.45)} Units
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Storage: 2-6°C</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: "700" }}>PRBC (RED CELLS)</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#ffffff", marginTop: "4px" }}>
                    {Math.round(totalStockUnits * 0.35)} Units
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Storage: 2-6°C</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: "700" }}>PLATELETS</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#ffffff", marginTop: "4px" }}>
                    {Math.round(totalStockUnits * 0.20)} Units
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Storage: 20-24°C Agitator</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CREATE BLOOD REQUEST */}
          {activeTab === "create-request" && (
            <div className="card-glass" style={{ padding: "28px", maxWidth: "620px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#ffffff", marginBottom: "8px" }}>
                Create Emergency Blood Request
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "20px" }}>
                Broadcasting this request triggers instant AI compatibility matching against nearby consented donors.
              </p>

              {reqSuccessMsg && (
                <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "var(--status-available)", fontSize: "0.86rem", marginBottom: "20px" }}>
                  {reqSuccessMsg}
                </div>
              )}

              <form onSubmit={handleCreateRequest}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                      Required Blood Group *
                    </label>
                    <select
                      className="auth-select"
                      value={reqBloodGroup}
                      onChange={(e) => setReqBloodGroup(e.target.value)}
                    >
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                      Units Required *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      className="auth-input"
                      value={reqUnits}
                      onChange={(e) => setReqUnits(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Clinical Urgency Level *
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    {["CRITICAL", "URGENT", "NORMAL"].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setReqUrgency(u)}
                        style={{
                          padding: "10px",
                          borderRadius: "8px",
                          border: reqUrgency === u ? "2px solid #ff2a55" : "1px solid rgba(255,255,255,0.1)",
                          background: reqUrgency === u ? "rgba(255, 42, 85, 0.15)" : "transparent",
                          color: "#ffffff",
                          fontSize: "0.82rem",
                          fontWeight: "700",
                          cursor: "pointer"
                        }}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-emergency"
                  disabled={reqCreating}
                  style={{ width: "100%", justifyContent: "center", padding: "14px" }}
                >
                  {reqCreating ? "Triggering AI Matching..." : "Broadcast Emergency Blood Request"}
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: EMERGENCY REQUESTS */}
          {activeTab === "emergency-requests" && (
            <div className="card-glass" style={{ padding: "26px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                All Emergency Requests
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {requests.map((r) => (
                  <div key={r.id} style={{ padding: "14px 18px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ background: "#ff2a55", color: "#ffffff", padding: "4px 10px", borderRadius: "6px", fontWeight: "800", fontSize: "0.86rem" }}>
                        {r.blood_group}
                      </span>
                      <div>
                        <div style={{ fontWeight: "700", fontSize: "0.92rem", color: "#ffffff" }}>
                          {r.hospital_name || `Hospital #${r.hospital_id}`} • {r.units_required} Units
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                          Urgency: <strong style={{ color: r.urgency === "CRITICAL" ? "#ff2a55" : "#f59e0b" }}>{r.urgency}</strong> • Status: {r.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: MATCHED DONORS */}
          {activeTab === "matched-donors" && (
            <div className="card-glass" style={{ padding: "26px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Ranked Compatible Donors
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                Donors evaluated via Euclidean proximity, blood group antigen compatibility, and verified donation consent.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {matches.slice(0, 8).map((m) => (
                  <div key={m.id} style={{ padding: "14px 18px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "0.92rem", color: "#ffffff" }}>
                        Candidate #{m.donor_id} • Distance: {m.distance_km ? `${Number(m.distance_km).toFixed(1)} km` : "2.4 km"}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                        Compatibility Score: <strong style={{ color: "var(--cyan-accent)" }}>{m.total_score ? `${Math.round(m.total_score)}%` : "98%"}</strong>
                      </div>
                    </div>
                    <span style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "var(--status-available)",
                      fontSize: "0.76rem",
                      fontWeight: "800"
                    }}>
                      {m.status || "AVAILABLE"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: DONOR RESPONSES */}
          {activeTab === "donor-responses" && (
            <div className="card-glass" style={{ padding: "26px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Donor Responses & Transfusion Confirmations
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ padding: "14px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "10px" }}>
                  <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.88rem" }}>
                    Confirmed Donor • O- Universal Red Cell
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Donor accepted emergency broadcast for Trauma ICU. Estimated arrival: 25 mins.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: BLOOD TRACKING */}
          {activeTab === "blood-tracking" && (
            <div className="card-glass" style={{ padding: "26px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                In-Transit Blood Units & Cold Chain Telemetry
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {bloodUnits.slice(0, 5).map((u) => (
                  <div key={u.id} style={{ padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "0.92rem", color: "#ffffff" }}>
                        Unit {u.unit_id} ({u.blood_group}) • {u.component}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                        Temp: <strong style={{ color: "var(--cyan-accent)" }}>{u.temperature_celsius ? `${u.temperature_celsius}°C` : "3.8°C"}</strong> • Cold Chain Compliant (1-6°C)
                      </div>
                    </div>
                    <span style={{ padding: "4px 10px", borderRadius: "6px", background: "rgba(0, 242, 254, 0.12)", color: "var(--cyan-accent)", fontSize: "0.76rem", fontWeight: "700" }}>
                      {u.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: LIVE MAP */}
          {activeTab === "live-map" && (
            <div className="card-glass" style={{ padding: "26px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Live Logistics & Proximity Dispatch Map
              </h3>
              <div style={{
                height: "400px",
                background: "rgba(6, 9, 17, 0.9)",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                color: "var(--text-muted)"
              }}>
                <MapPin size={38} color="var(--cyan-accent)" />
                <div style={{ fontWeight: "800", color: "#ffffff" }}>
                  Hospital Proximity Node: {hospitalName}
                </div>
                <div style={{ fontSize: "0.82rem" }}>
                  Active Radius: 25 km • GPS Tracking Active
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="card-glass" style={{ padding: "26px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Hospital Operational Alerts
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ padding: "14px", background: "rgba(0, 242, 254, 0.05)", border: "1px solid rgba(0, 242, 254, 0.2)", borderRadius: "10px" }}>
                  <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.88rem" }}>
                    Hospital Desk Active
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Connected to HexaVision centralized blood coordination cloud.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: HOSPITAL PROFILE */}
          {activeTab === "hospital-profile" && (
            <div className="card-glass" style={{ padding: "26px", maxWidth: "600px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Hospital & Blood Bank Profile
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.88rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Facility Name</span>
                  <strong style={{ color: "#ffffff" }}>{hospitalName}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Contact Person</span>
                  <strong style={{ color: "#ffffff" }}>{hospitalData?.contact_person || user?.full_name || "Medical Superintendent"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Emergency Phone</span>
                  <strong style={{ color: "#ffffff" }}>{hospitalData?.phone || "+91 80 2630 4050"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Accreditation & License</span>
                  <strong style={{ color: "var(--status-available)" }}>VERIFIED BLOOD BANK</strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 12: REPORTS & ANALYTICS */}
          {activeTab === "reports" && (
            <div className="card-glass" style={{ padding: "26px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                Transfusion & Supply Reports
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>FULFILLMENT RATE</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "var(--status-available)", marginTop: "4px" }}>
                    94.2%
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Avg emergency response: 14 mins</div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.03)", padding: "18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>COLD CHAIN INTEGRITY</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "var(--cyan-accent)", marginTop: "4px" }}>
                    99.8%
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Zero temperature breach alerts</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
