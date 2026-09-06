import React from "react";
import { Activity, Radio, Plus, ShieldCheck, MapPin, Users, Smartphone } from "lucide-react";

export default function Navbar({ activeTab, setActiveTab, onOpenNewRequestModal, criticalCount = 0 }) {
  return (
    <header className="header-nav">
      <div className="nav-wrapper">
        {/* Brand */}
        <div className="brand-section" onClick={() => setActiveTab("dashboard")}>
          <div className="brand-icon">
            <Activity size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="brand-title">HEXAVISION</div>
            <div className="brand-subtitle">
              <span className="pulse-dot-cyan"></span>
              EMERGENCY BLOOD COORDINATION
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <Activity size={16} />
            Command Center
          </button>

          <button
            className={`nav-tab-btn ${activeTab === "requests" ? "active" : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            <Radio size={16} />
            Requests Hub
            {criticalCount > 0 && (
              <span className="badge badge-critical" style={{ padding: "1px 6px", fontSize: "0.68rem" }}>
                {criticalCount} SOS
              </span>
            )}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === "map" ? "active" : ""}`}
            onClick={() => setActiveTab("map")}
          >
            <MapPin size={16} />
            Live Map
          </button>

          <button
            className={`nav-tab-btn ${activeTab === "donors" ? "active" : ""}`}
            onClick={() => setActiveTab("donors")}
          >
            <Users size={16} />
            Donor Network
          </button>

          <button
            className={`nav-tab-btn ${activeTab === "simulator" ? "active" : ""}`}
            onClick={() => setActiveTab("simulator")}
          >
            <Smartphone size={16} />
            Donor Sim
          </button>

          <button
            className={`nav-tab-btn ${activeTab === "consent" ? "active" : ""}`}
            onClick={() => setActiveTab("consent")}
          >
            <ShieldCheck size={16} />
            Consent Vault
          </button>
        </nav>

        {/* Quick Actions */}
        <div className="nav-actions">
          <button className="btn btn-danger btn-pulse" onClick={onOpenNewRequestModal}>
            <Plus size={16} strokeWidth={3} />
            Post Blood SOS
          </button>
        </div>
      </div>
    </header>
  );
}
