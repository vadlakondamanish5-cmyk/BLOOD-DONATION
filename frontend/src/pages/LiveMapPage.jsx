import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { 
  MapPin, 
  Hospital, 
  Users, 
  Radio, 
  RefreshCw,
  Layers,
  ShieldCheck
} from "lucide-react";
import { api } from "../api/api";

export default function LiveMapPage({ onInspectRequest }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({ hospitals: null, donors: null, vectors: null });

  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showDonors, setShowDonors] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [selectedVector, setSelectedVector] = useState(null);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      const res = await api.getMapData();
      setMapData(res.data);
    } catch (err) {
      console.error("Error fetching geospatial map data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [12.94, 77.62], // Center on Bangalore metropolitan zone
        zoom: 12,
        zoomControl: true
      });

      // CartoDB Dark Matter tiles (sleek dark aesthetic)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19
      }).addTo(map);

      layersRef.current.hospitals = L.layerGroup().addTo(map);
      layersRef.current.donors = L.layerGroup().addTo(map);
      layersRef.current.vectors = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }
  }, []);

  // Update Map Markers & Connection Lines
  useEffect(() => {
    if (!mapInstanceRef.current || !mapData) return;

    const { hospitals = [], donors = [], match_vectors = [] } = mapData;
    const { hospitals: hospLayer, donors: donorLayer, vectors: vectorLayer } = layersRef.current;

    // 1. Hospitals Layer
    hospLayer.clearLayers();
    if (showHospitals) {
      hospitals.forEach((h) => {
        if (!h.latitude || !h.longitude) return;
        const hasEmergency = parseInt(h.active_requests || 0, 10) > 0;
        
        const html = `
          <div style="
            background: ${hasEmergency ? '#ff2a55' : '#00f2fe'};
            width: 34px; height: 34px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: #060911; font-weight: 800; font-size: 15px;
            border: 2px solid white;
            box-shadow: 0 0 ${hasEmergency ? '20px rgba(255, 42, 85, 0.9)' : '15px rgba(0, 242, 254, 0.7)'};
            ${hasEmergency ? 'animation: pulseEmergency 2s infinite;' : ''}
          ">
            🏥
          </div>
        `;

        const customIcon = L.divIcon({
          html,
          className: "hospital-pin",
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });

        const marker = L.marker([parseFloat(h.latitude), parseFloat(h.longitude)], { icon: customIcon });
        marker.bindPopup(`
          <div style="padding: 6px 2px;">
            <div style="font-weight: 800; font-size: 14px; color: #00f2fe; margin-bottom: 4px;">${h.hospital_name}</div>
            <div style="font-size: 12px; color: #cbd5e1;">📞 ${h.phone}</div>
            <div style="margin-top: 8px;">
              <span style="background: ${hasEmergency ? '#ff2a55' : '#10b981'}; color: white; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">
                ${h.active_requests} Active Emergency Request(s)
              </span>
            </div>
          </div>
        `);
        hospLayer.addLayer(marker);
      });
    }

    // 2. Donors Layer
    donorLayer.clearLayers();
    if (showDonors) {
      donors.forEach((d) => {
        if (!d.latitude || !d.longitude) return;

        const html = `
          <div style="
            background: ${d.is_available ? 'rgba(16, 185, 129, 0.95)' : 'rgba(100, 116, 139, 0.8)'};
            color: white;
            font-size: 10px; font-weight: 800;
            padding: 3px 6px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.5);
            box-shadow: 0 2px 8px rgba(0,0,0,0.6);
            white-space: nowrap;
          ">
            ${d.blood_group}
          </div>
        `;

        const customIcon = L.divIcon({
          html,
          className: "donor-pin",
          iconSize: [30, 18],
          iconAnchor: [15, 9]
        });

        const marker = L.marker([parseFloat(d.latitude), parseFloat(d.longitude)], { icon: customIcon });
        marker.bindPopup(`
          <div style="padding: 4px 2px;">
            <div style="font-weight: 800; font-size: 13px; color: #ffffff;">${d.full_name}</div>
            <div style="font-size: 12px; color: #38bdf8; margin: 3px 0;">Blood Group: <strong>${d.blood_group}</strong></div>
            <div style="font-size: 11px; color: ${d.is_available ? '#10b981' : '#f59e0b'};">
              ${d.is_available ? '● Available for Emergency Matching' : '⏳ Cooling period / Inactive'}
            </div>
          </div>
        `);
        donorLayer.addLayer(marker);
      });
    }

    // 3. Match Vectors (Animated connecting lines from Hospital ➔ Potential Donor)
    vectorLayer.clearLayers();
    if (showVectors) {
      match_vectors.forEach((v) => {
        if (!v.hosp_lat || !v.hosp_lon || !v.donor_lat || !v.donor_lon) return;

        const isCritical = v.urgency === "CRITICAL";
        const color = isCritical ? "#ff2a55" : "#00f2fe";

        const line = L.polyline(
          [
            [parseFloat(v.hosp_lat), parseFloat(v.hosp_lon)],
            [parseFloat(v.donor_lat), parseFloat(v.donor_lon)]
          ],
          {
            color,
            weight: isCritical ? 2.8 : 1.8,
            dashArray: "6, 8",
            opacity: 0.85
          }
        );

        line.bindTooltip(`
          Match Vector: ${v.donor_blood_group} Donor ➔ ${v.hospital_name} (${v.distance_km} km, Score: ${v.total_score}%)
        `, { sticky: true });

        line.on("click", () => {
          setSelectedVector(v);
        });

        vectorLayer.addLayer(line);
      });
    }
  }, [mapData, showHospitals, showDonors, showVectors]);

  return (
    <div>
      {/* Map Control Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
            <MapPin size={24} color="var(--blood-red)" />
            Live Geospatial Emergency Radar
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Real-time coordinates of verified hospitals, nearby potential donors, and active emergency dispatch lines
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            className={`btn btn-sm ${showHospitals ? "btn-emergency" : "btn-secondary"}`}
            onClick={() => setShowHospitals(!showHospitals)}
          >
            <Hospital size={14} /> Hospitals
          </button>

          <button
            className={`btn btn-sm ${showDonors ? "btn-emergency" : "btn-secondary"}`}
            onClick={() => setShowDonors(!showDonors)}
          >
            <Users size={14} /> Donors
          </button>

          <button
            className={`btn btn-sm ${showVectors ? "btn-emergency" : "btn-secondary"}`}
            onClick={() => setShowVectors(!showVectors)}
          >
            <Radio size={14} /> Match Vectors
          </button>

          <button className="btn btn-secondary btn-sm" onClick={fetchMapData}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Map Canvas Frame */}
      <div className="glass-panel" style={{ padding: "8px", position: "relative" }}>
        <div 
          ref={mapContainerRef} 
          style={{ width: "100%", height: "600px", borderRadius: "12px", background: "#060911" }}
        />

        {/* Selected Vector Tooltip Card */}
        {selectedVector && (
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "20px",
              background: "rgba(10, 16, 30, 0.95)",
              border: "1px solid var(--blood-red)",
              backdropFilter: "blur(14px)",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              zIndex: 1000,
              maxWidth: "320px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.8)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <span className="status-pill status-critical" style={{ fontSize: "0.65rem" }}>
                Active Vector
              </span>
              <button 
                onClick={() => setSelectedVector(null)} 
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontWeight: "800", fontSize: "1rem" }}>{selectedVector.hospital_name}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Target: <strong>{selectedVector.donor_blood_group} Donor</strong>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--cyan-accent)", marginTop: "2px" }}>
              Geodesic Proximity: <strong>{selectedVector.distance_km} km</strong>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#34d399", marginTop: "2px" }}>
              Algorithm Total Score: <strong>{selectedVector.total_score}%</strong>
            </div>
          </div>
        )}

        {/* Legend Box */}
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            background: "rgba(10, 16, 30, 0.92)",
            border: "1px solid var(--border-subtle)",
            backdropFilter: "blur(14px)",
            borderRadius: "var(--radius-md)",
            padding: "14px 18px",
            zIndex: 1000,
            fontSize: "0.78rem",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}
        >
          <div style={{ fontWeight: "800", color: "#ffffff", marginBottom: "2px" }}>Radar Map Legend</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ff2a55", display: "inline-block" }}></span>
            <span>Hospital (Active Critical Demands)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#00f2fe", display: "inline-block" }}></span>
            <span>Hospital (Normal Standby)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#10b981", display: "inline-block" }}></span>
            <span>Available Consented Donor</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "22px", height: "2px", borderBottom: "2px dashed #ff2a55", display: "inline-block" }}></span>
            <span>Algorithm Match Arc (Proximity Path)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
