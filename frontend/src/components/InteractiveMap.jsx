import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapPin, Hospital, Users, Radio, RefreshCw } from "lucide-react";
import { api } from "../services/api";

export default function InteractiveMap({ onInspectRequest }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({ hospitals: null, donors: null, vectors: null });

  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDonors, setShowDonors] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showVectors, setShowVectors] = useState(true);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      const res = await api.getMapData();
      setMapData(res.data);
    } catch (err) {
      console.error("Error fetching map data:", err);
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
        center: [12.95, 77.62], // Center on Bangalore
        zoom: 12,
        zoomControl: true
      });

      // CartoDB Dark Matter tiles (beautiful sleek dark map)
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

    return () => {
      // cleanup handled if unmounting
    };
  }, []);

  // Update Markers and Match Vector Lines whenever mapData changes
  useEffect(() => {
    if (!mapInstanceRef.current || !mapData) return;

    const { hospitals = [], donors = [], match_vectors = [] } = mapData;
    const { hospitals: hospLayer, donors: donorLayer, vectors: vectorLayer } = layersRef.current;

    // 1. Render Hospitals
    hospLayer.clearLayers();
    if (showHospitals) {
      hospitals.forEach((h) => {
        if (!h.latitude || !h.longitude) return;

        const hasActive = parseInt(h.active_requests || 0, 10) > 0;
        const iconHtml = `
          <div style="
            background: ${hasActive ? '#ff3b5c' : '#00f2fe'};
            width: 32px; height: 32px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: #070b14; font-weight: 800; font-size: 14px;
            border: 2px solid white;
            box-shadow: 0 0 15px ${hasActive ? 'rgba(255, 59, 92, 0.8)' : 'rgba(0, 242, 254, 0.6)'};
          ">
            🏥
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-hospital-marker",
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([parseFloat(h.latitude), parseFloat(h.longitude)], { icon: customIcon });
        marker.bindPopup(`
          <div style="padding: 6px 2px;">
            <div style="font-weight: 700; font-size: 14px; color: #00f2fe; margin-bottom: 4px;">${h.hospital_name}</div>
            <div style="font-size: 12px; color: #cbd5e1;">📞 ${h.phone}</div>
            <div style="margin-top: 6px; font-size: 12px;">
              <span style="background: ${hasActive ? '#ff3b5c' : '#10b981'}; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
                ${h.active_requests} Active Request(s)
              </span>
            </div>
          </div>
        `);
        hospLayer.addLayer(marker);
      });
    }

    // 2. Render Donors
    donorLayer.clearLayers();
    if (showDonors) {
      donors.forEach((d) => {
        if (!d.latitude || !d.longitude) return;

        const iconHtml = `
          <div style="
            background: ${d.is_available ? 'rgba(16, 185, 129, 0.9)' : 'rgba(100, 116, 139, 0.8)'};
            color: white;
            font-size: 10px; font-weight: 800;
            padding: 2px 5px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.4);
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
            white-space: nowrap;
          ">
            ${d.blood_group}
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-donor-marker",
          iconSize: [28, 16],
          iconAnchor: [14, 8]
        });

        const marker = L.marker([parseFloat(d.latitude), parseFloat(d.longitude)], { icon: customIcon });
        marker.bindPopup(`
          <div style="padding: 4px 2px;">
            <div style="font-weight: 700; font-size: 13px; color: #ffffff;">${d.full_name}</div>
            <div style="font-size: 12px; color: #38bdf8; margin: 2px 0;">Blood Group: <strong>${d.blood_group}</strong></div>
            <div style="font-size: 11px; color: ${d.is_available ? '#10b981' : '#f59e0b'};">
              ${d.is_available ? '✓ Available for Dispatch' : '⏳ Cooling period / Unavailable'}
            </div>
          </div>
        `);
        donorLayer.addLayer(marker);
      });
    }

    // 3. Render Match Vectors (Lines connecting hospital to top donors)
    vectorLayer.clearLayers();
    if (showVectors) {
      match_vectors.forEach((v) => {
        if (!v.hosp_lat || !v.hosp_lon || !v.donor_lat || !v.donor_lon) return;

        const isCritical = v.urgency === "CRITICAL";
        const color = isCritical ? "#ff3b5c" : "#00f2fe";

        const line = L.polyline(
          [
            [parseFloat(v.hosp_lat), parseFloat(v.hosp_lon)],
            [parseFloat(v.donor_lat), parseFloat(v.donor_lon)]
          ],
          {
            color,
            weight: isCritical ? 2.5 : 1.5,
            dashArray: "6, 6",
            opacity: 0.85
          }
        );

        line.bindTooltip(`
          Match: ${v.donor_blood_group} donor ➔ ${v.hospital_name} (${v.distance_km} km, Score: ${v.total_score}%)
        `, { sticky: true });

        vectorLayer.addLayer(line);
      });
    }
  }, [mapData, showHospitals, showDonors, showVectors]);

  return (
    <div>
      {/* Map Control Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", letterSpacing: "-0.5px" }}>Live Emergency Radar Map</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
            Geospatial coordinates of verified hospitals, mapped donors, and active emergency match vectors.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Layer toggles */}
          <button
            className={`btn btn-sm ${showHospitals ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setShowHospitals(!showHospitals)}
          >
            <Hospital size={14} /> Hospitals
          </button>

          <button
            className={`btn btn-sm ${showDonors ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setShowDonors(!showDonors)}
          >
            <Users size={14} /> Donors
          </button>

          <button
            className={`btn btn-sm ${showVectors ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setShowVectors(!showVectors)}
          >
            <Radio size={14} /> Match Vectors
          </button>

          <button className="btn btn-secondary btn-sm" onClick={fetchMapData}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="glass-card" style={{ padding: "8px", position: "relative" }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: "560px", borderRadius: "12px" }}></div>

        {/* Legend floating box */}
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            background: "rgba(10, 16, 30, 0.9)",
            border: "1px solid var(--border-subtle)",
            backdropFilter: "blur(12px)",
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            zIndex: 1000,
            fontSize: "0.78rem",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}
        >
          <div style={{ fontWeight: "700", color: "var(--text-primary)", marginBottom: "2px" }}>Radar Legend</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ff3b5c", display: "inline-block" }}></span>
            <span>Hospital with Active Emergency</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#00f2fe", display: "inline-block" }}></span>
            <span>Hospital on Standby</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "4px", background: "#10b981", display: "inline-block" }}></span>
            <span>Available Consented Donor</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "20px", height: "2px", borderBottom: "2px dashed #ff3b5c", display: "inline-block" }}></span>
            <span>Active Critical Match Arc</span>
          </div>
        </div>
      </div>
    </div>
  );
}
