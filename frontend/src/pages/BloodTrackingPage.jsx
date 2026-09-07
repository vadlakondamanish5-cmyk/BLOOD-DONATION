import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Activity, AlertTriangle, CheckCircle2, MapPin, QrCode, RefreshCcw, ShieldCheck, Thermometer, Truck } from "lucide-react";
import { io } from "socket.io-client";
import { api } from "../api/api";

const statusColors = {
  LAB_PREPARED: "#60a5fa",
  READY_FOR_DISPATCH: "#fbbf24",
  IN_TRANSIT: "#38bdf8",
  AT_HOSPITAL: "#34d399",
  DELIVERED: "#10b981",
  ALERT: "#f43f5e"
};

const demoShipments = [
  {
    id: 101,
    unit_id: "HX-BLD-1048",
    blood_group: "O-",
    component: "RBC",
    status: "IN_TRANSIT",
    source_hospital_id: 1,
    destination_hospital_id: 2,
    current_latitude: 19.076,
    current_longitude: 72.8777,
    temperature_celsius: 4.2,
    target_temperature_c: "1-6°C",
    qr_code: "",
    created_at: "2026-09-01",
    updated_at: "2026-09-07T06:15:00Z",
    shipment_id: "HX-BLD-1048",
    blood_request_id: 42,
    source_city: "Mumbai",
    destination_city: "Hyderabad",
    source_hospital: "Mumbai Blood Centre",
    destination_hospital: "Hyderabad Emergency Hospital",
    transport_mode: "Air Medical Transport",
    priority: "CRITICAL",
    collection_date: "2026-09-01",
    expiry_date: "2026-09-29",
    dispatch_time: "2026-09-07T04:30:00Z",
    estimated_arrival_time: "2026-09-07T08:45:00Z",
    remaining_distance_km: 236,
    temperature_status: "NORMAL",
    verification_status: "VERIFIED",
    live_connection: "demo"
  }
];

export default function BloodTrackingPage() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const socketRef = useRef(null);

  const [units, setUnits] = useState([]);
  const [overview, setOverview] = useState({ summary: { total_units: 0, in_transit: 0, delivered: 0, alerts: 0 }, alerts: [] });
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState("connecting");
  const [liveMessage, setLiveMessage] = useState("Waiting for live transport updates…");

  const inferShipment = (unit) => ({
    ...unit,
    shipment_id: unit.shipment_id || unit.unit_id || "N/A",
    blood_request_id: unit.blood_request_id || "N/A",
    source_hospital: unit.source_hospital || unit.source_hospital_name || "Source blood bank",
    destination_hospital: unit.destination_hospital || unit.destination_hospital_name || "Destination hospital",
    source_city: unit.source_city || "Mumbai",
    destination_city: unit.destination_city || "Hyderabad",
    transport_mode: unit.transport_mode || "Ambulance",
    priority: unit.priority || (unit.status === "IN_TRANSIT" ? "CRITICAL" : "NORMAL"),
    temperature_status: unit.temperature_status || (Number(unit.temperature_celsius) <= 6 && Number(unit.temperature_celsius) >= 1 ? "NORMAL" : Number(unit.temperature_celsius) > 6 ? "WARNING" : "CRITICAL"),
    verification_status: unit.verification_status || "VERIFIED",
    remaining_distance_km: unit.remaining_distance_km || 156,
    collection_date: unit.collection_date || unit.created_at || "2026-09-01",
    expiry_date: unit.expiry_date || "2026-09-29",
    dispatch_time: unit.dispatch_time || unit.dispatched_at || "2026-09-07T04:30:00Z",
    estimated_arrival_time: unit.estimated_arrival_time || "2026-09-07T08:45:00Z"
  });

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      const [overviewRes, unitsRes] = await Promise.all([
        api.getBloodTrackingOverview().catch(() => ({ data: { summary: { total_units: 0, in_transit: 0, delivered: 0, alerts: 0 }, alerts: [] } })),
        api.getTrackingShipments().catch(() => ({ data: [] }))
      ]);

      const nextUnits = Array.isArray(unitsRes.data) ? unitsRes.data.map(inferShipment) : [];
      const fallbackUnits = nextUnits.length > 0 ? nextUnits : demoShipments;
      setOverview(overviewRes.data || { summary: { total_units: 0, in_transit: 0, delivered: 0, alerts: 0 }, alerts: [] });
      setUnits(fallbackUnits);
      if (!selectedUnitId && fallbackUnits.length > 0) {
        setSelectedUnitId(fallbackUnits[0].id);
      }
    } catch (error) {
      console.error("Error fetching tracking data:", error);
      setUnits(demoShipments);
      setOverview({ summary: { total_units: 1, in_transit: 1, delivered: 0, alerts: 0 }, alerts: [] });
      if (!selectedUnitId) setSelectedUnitId(demoShipments[0].id);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedUnit = async (id) => {
    if (!id) return;
    try {
      const response = await api.getTrackingShipmentById(id).catch(() => ({ data: null }));
      setSelectedUnit(response.data ? inferShipment(response.data) : units.find((unit) => unit.id === id) || null);
    } catch (error) {
      console.error("Error fetching selected blood unit:", error);
    }
  };

  useEffect(() => {
    fetchTrackingData();

    try {
      const socketUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      const socket = io(socketUrl, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 5000
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        setSocketStatus("online");
        setLiveMessage("Live connection active");
      });

      socket.on("disconnect", (reason) => {
        setSocketStatus("offline");
        setLiveMessage("Live tracking connection unavailable");
      });

      socket.on("connect_error", (err) => {
        setSocketStatus("offline");
        setLiveMessage("Live tracking connection unavailable");
      });

      socket.on("reconnect", () => {
        setSocketStatus("online");
        setLiveMessage("Live connection active");
      });

      socket.on("blood-location-update", (payload) => {
        if (!payload || !payload.id) return;
        setUnits((prev) => prev.map((unit) => (unit.id === payload.id ? { ...unit, ...payload, current_latitude: payload.latitude ?? unit.current_latitude, current_longitude: payload.longitude ?? unit.current_longitude } : unit)));
      });

      socket.on("blood-status-update", (payload) => {
        if (!payload || !payload.id) return;
        setUnits((prev) => prev.map((unit) => (unit.id === payload.id ? { ...unit, ...payload, status: payload.status ?? unit.status } : unit)));
      });

      socket.on("blood-temperature-update", (payload) => {
        if (!payload || !payload.id) return;
        setUnits((prev) => prev.map((unit) => (unit.id === payload.id ? { ...unit, ...payload, temperature_celsius: payload.temperature_celsius ?? unit.temperature_celsius } : unit)));
      });

      socket.on("blood-shipment-delivered", (payload) => {
        if (!payload) return;
        setLiveMessage(`Shipment ${payload.shipment_id || payload.id || "updated"} delivered to destination hospital`);
        setUnits((prev) => prev.map((unit) => (unit.id === payload.id ? { ...unit, ...payload, status: "DELIVERED" } : unit)));
      });

      return () => {
        socket.off();
        socket.disconnect();
        socketRef.current = null;
      };
    } catch (error) {
      console.warn("Socket.io initialization skipped or failed:", error.message);
      setSocketStatus("offline");
      setLiveMessage("Live tracking connection unavailable");
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (selectedUnitId) {
      fetchSelectedUnit(selectedUnitId);
    }
  }, [selectedUnitId]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [12.9716, 77.5946],
        zoom: 11,
        zoomControl: true
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
      }).addTo(map);

      markerLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerLayerRef.current) return;

    const group = markerLayerRef.current;
    group.clearLayers();

    units.forEach((unit) => {
      if (!unit.current_latitude || !unit.current_longitude) return;

      const marker = L.marker([Number(unit.current_latitude), Number(unit.current_longitude)]).bindPopup(`
        <div style="padding: 6px; color: #06111f; font-family: sans-serif;">
          <strong>${unit.unit_id}</strong><br />
          ${unit.blood_group} • ${unit.component}<br />
          <span style="color: ${statusColors[unit.status] || '#38bdf8'}; font-weight: 700;">${unit.status}</span>
        </div>
      `);

      marker.addTo(group);
    });
  }, [units]);

  const handleAdvanceStatus = async (status) => {
    if (!selectedUnitId) return;
    await api.updateBloodUnit(selectedUnitId, { status });
    await fetchTrackingData();
    await fetchSelectedUnit(selectedUnitId);
  };

  const handleLocationUpdate = async () => {
    if (!selectedUnitId) return;
    const nextLat = Number((12.9716 + Math.random() * 0.05).toFixed(4));
    const nextLng = Number((77.5946 + Math.random() * 0.06).toFixed(4));
    await api.updateBloodUnitLocation(selectedUnitId, { latitude: nextLat, longitude: nextLng });
    await fetchTrackingData();
    await fetchSelectedUnit(selectedUnitId);
  };

  const currentSelected = units.find((unit) => unit.id === selectedUnitId) || selectedUnit || demoShipments[0];

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "10px" }}>
            <Truck size={24} color="var(--blood-red)" />
            Blood Tracking
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.87rem", marginTop: "6px" }}>
            Demo transport monitoring for emergency blood movement, cold-chain compliance, and delivery visibility.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              borderRadius: "999px",
              padding: "6px 10px",
              background: socketStatus === "online" ? "rgba(16,185,129,0.12)" : "rgba(148,163,184,0.12)",
              color: socketStatus === "online" ? "#34d399" : "#f8fafc",
              border: `1px solid ${socketStatus === "online" ? "rgba(52,211,153,0.5)" : "rgba(148,163,184,0.35)"}`
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: socketStatus === "online" ? "#34d399" : "#fbbf24", boxShadow: socketStatus === "online" ? "0 0 12px rgba(52,211,153,0.9)" : "0 0 12px rgba(251,191,36,0.7)" }} />
            {socketStatus === "online" ? "Live tracking online" : "Live connection unavailable"}
          </span>
          <button className="btn btn-secondary" onClick={fetchTrackingData}>
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "18px" }}>
        {[
          { label: "Total Units", value: overview.summary.total_units || units.length, icon: <Activity size={16} />, accent: "#7dd3fc" },
          { label: "In Transit", value: overview.summary.in_transit || 0, icon: <Truck size={16} />, accent: "#38bdf8" },
          { label: "Delivered", value: overview.summary.delivered || 0, icon: <CheckCircle2 size={16} />, accent: "#34d399" },
          { label: "Active Alerts", value: overview.summary.alerts || 0, icon: <AlertTriangle size={16} />, accent: "#f43f5e" }
        ].map((card) => (
          <div key={card.label} className="glass-panel" style={{ padding: "18px 20px", borderLeft: `4px solid ${card.accent}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--text-muted)" }}>
              <span>{card.label}</span>
              <span style={{ color: card.accent }}>{card.icon}</span>
            </div>
            <div style={{ marginTop: "14px", fontSize: "2rem", fontWeight: 800 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: "12px 14px", background: "rgba(9,14,20,0.8)", border: "1px solid rgba(127, 164, 255, 0.24)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldCheck size={18} color="#67e8f9" />
            <span style={{ color: "#dbeafe", fontWeight: 700 }}>{liveMessage}</span>
          </div>
          <span style={{ color: "var(--text-muted)" }}>Monitoring information only</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>
        <div className="glass-panel" style={{ padding: "12px" }}>
          <div ref={mapContainerRef} style={{ width: "100%", height: "420px", borderRadius: "12px", overflow: "hidden" }} />
        </div>

        <div className="glass-panel" style={{ padding: "18px" }}>
          <h3 style={{ fontSize: "1.05rem", marginBottom: "14px" }}>Active Alerts</h3>
          <div style={{ display: "grid", gap: "12px" }}>
            {(overview.alerts || []).length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No active threshold alerts</div>
            ) : (
              overview.alerts.map((alert) => (
                <div key={alert.id} style={{ border: "1px solid rgba(244, 63, 94, 0.4)", borderRadius: "12px", background: "rgba(244, 63, 94, 0.08)", padding: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontWeight: 700 }}>
                    <span>{alert.unit_id}</span>
                    <span style={{ color: "#fca5a5" }}>{alert.severity}</span>
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "6px" }}>{alert.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "0.92fr 1.08fr", gap: "20px" }}>
        <div className="glass-panel" style={{ padding: "18px" }}>
          <h3 style={{ marginBottom: "14px" }}>Shipment Registry</h3>
          <div style={{ display: "grid", gap: "10px" }}>
            {loading ? (
              <div style={{ color: "var(--text-muted)" }}>Loading tracking data…</div>
            ) : units.length === 0 ? (
              <div style={{ color: "var(--text-muted)" }}>No blood shipment registered</div>
            ) : (
              units.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => setSelectedUnitId(unit.id)}
                  style={{
                    display: "grid",
                    textAlign: "left",
                    border: selectedUnitId === unit.id ? "1px solid rgba(96,165,250,0.9)" : "1px solid rgba(148,163,184,0.25)",
                    borderRadius: "12px",
                    background: "rgba(9,16,30,0.8)",
                    padding: "12px 14px",
                    color: "#e2e8f0",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                    <strong>{unit.shipment_id || unit.unit_id}</strong>
                    <span style={{ color: statusColors[unit.status] || "#38bdf8", fontWeight: 700 }}>{unit.status}</span>
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "6px" }}>
                    {unit.blood_group} • {unit.component} • {unit.transport_mode || "Ambulance"}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {currentSelected && (
          <div className="glass-panel" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Shipment</div>
                <h3 style={{ marginTop: "4px" }}>{currentSelected.shipment_id || currentSelected.unit_id}</h3>
              </div>
              <span style={{ background: statusColors[currentSelected.status] || "#38bdf8", color: "#06111f", fontWeight: 800, padding: "6px 10px", borderRadius: "999px" }}>
                {currentSelected.priority || "NORMAL"}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginTop: "18px" }}>
              <div style={{ background: "rgba(15,23,42,0.9)", borderRadius: "12px", padding: "12px" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Blood Group</div>
                <div style={{ fontWeight: 700, marginTop: "8px" }}>{currentSelected.blood_group}</div>
              </div>
              <div style={{ background: "rgba(15,23,42,0.9)", borderRadius: "12px", padding: "12px" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Units</div>
                <div style={{ fontWeight: 700, marginTop: "8px" }}>{currentSelected.units || currentSelected.number_of_units || 2}</div>
              </div>
              <div style={{ background: "rgba(15,23,42,0.9)", borderRadius: "12px", padding: "12px" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Transport</div>
                <div style={{ fontWeight: 700, marginTop: "8px" }}>{currentSelected.transport_mode || "Ambulance"}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px", marginTop: "16px" }}>
              <div style={{ background: "rgba(15,23,42,0.9)", borderRadius: "12px", padding: "12px" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Source</div>
                <div style={{ fontWeight: 700, marginTop: "6px" }}>{currentSelected.source_hospital || currentSelected.source_city}</div>
              </div>
              <div style={{ background: "rgba(15,23,42,0.9)", borderRadius: "12px", padding: "12px" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Destination</div>
                <div style={{ fontWeight: 700, marginTop: "6px" }}>{currentSelected.destination_hospital || currentSelected.destination_city}</div>
              </div>
              <div style={{ background: "rgba(15,23,42,0.9)", borderRadius: "12px", padding: "12px" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>ETA</div>
                <div style={{ fontWeight: 700, marginTop: "6px" }}>{currentSelected.estimated_arrival_time ? new Date(currentSelected.estimated_arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "2h 15m"}</div>
              </div>
            </div>

            <div style={{ marginTop: "18px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ background: "rgba(15,23,42,0.9)", borderRadius: "12px", padding: "10px 12px" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Temp Status</div>
                <div style={{ fontWeight: 700, marginTop: "5px" }}>{currentSelected.temperature_status || "NORMAL"}</div>
              </div>
              <div style={{ background: "rgba(15,23,42,0.9)", borderRadius: "12px", padding: "10px 12px" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Verification</div>
                <div style={{ fontWeight: 700, marginTop: "5px" }}>{currentSelected.verification_status || "VERIFIED"}</div>
              </div>
              <div style={{ background: "rgba(15,23,42,0.9)", borderRadius: "12px", padding: "10px 12px" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Distance Remaining</div>
                <div style={{ fontWeight: 700, marginTop: "5px" }}>{currentSelected.remaining_distance_km || 236} km</div>
              </div>
            </div>

            {currentSelected.qr_code && (
              <div style={{ marginTop: "18px", display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
                <img src={currentSelected.qr_code} alt="Blood unit QR code" style={{ width: "120px", height: "120px", background: "#ffffff", borderRadius: "12px", padding: "6px" }} />
                <div style={{ display: "grid", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><QrCode size={16} /> QR Verified</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Thermometer size={16} /> Cold-chain monitored</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><MapPin size={16} /> GPS active</div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "20px" }}>
              <button className="btn btn-emergency btn-sm" onClick={() => handleAdvanceStatus("READY_FOR_DISPATCH")}>Dispatch Ready</button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAdvanceStatus("IN_TRANSIT")}>In Transit</button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAdvanceStatus("AT_HOSPITAL")}>At Hospital</button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAdvanceStatus("DELIVERED")}>Delivered</button>
              <button className="btn btn-secondary btn-sm" onClick={handleLocationUpdate}>Update GPS</button>
            </div>

            <div style={{ marginTop: "20px" }}>
              <h4 style={{ marginBottom: "12px" }}>Status Timeline</h4>
              <div style={{ display: "grid", gap: "8px" }}>
                {[
                  "HOSPITAL",
                  "BLOOD UNIT COLLECTED",
                  "VERIFICATION",
                  "DISPATCHED",
                  "IN TRANSIT",
                  "NEAR DESTINATION",
                  "DELIVERED",
                  "HOSPITAL RECEIVED"
                ].map((step, index) => (
                  <div key={step} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "10px", background: index <= ["LAB_PREPARED", "READY_FOR_DISPATCH", "IN_TRANSIT", "AT_HOSPITAL", "DELIVERED"].indexOf(currentSelected.status || "IN_TRANSIT") ? "rgba(52,211,153,0.08)" : "rgba(15,23,42,0.6)", border: index <= ["LAB_PREPARED", "READY_FOR_DISPATCH", "IN_TRANSIT", "AT_HOSPITAL", "DELIVERED"].indexOf(currentSelected.status || "IN_TRANSIT") ? "1px solid rgba(52,211,153,0.35)" : "1px solid rgba(100,116,139,0.2)" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: index <= ["LAB_PREPARED", "READY_FOR_DISPATCH", "IN_TRANSIT", "AT_HOSPITAL", "DELIVERED"].indexOf(currentSelected.status || "IN_TRANSIT") ? "#34d399" : "#64748b" }} />
                    <span style={{ color: "var(--text-muted)" }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
