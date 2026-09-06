import React from "react";
import { 
  Activity, 
  Radio, 
  Users, 
  UserPlus, 
  Target, 
  MapPin, 
  Bell, 
  ShieldCheck,
  X,
  BarChart3
} from "lucide-react";
import BloodDropIcon from "./BloodDropIcon";

export default function Sidebar({ activePage, setActivePage, isMobileOpen, setIsMobileOpen, criticalCount = 0 }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "requests", label: "Emergency Requests", icon: Radio, badge: criticalCount > 0 ? `${criticalCount} SOS` : null },
    { id: "donors", label: "Donor Network", icon: Users },
    { id: "register", label: "Register as Donor", icon: UserPlus },
    { id: "matches", label: "Matched Donors", icon: Target },
    { id: "map", label: "Live Map", icon: MapPin },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "consent", label: "Consent Vault", icon: ShieldCheck }
  ];

  const handleNavClick = (id) => {
    setActivePage(id);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <aside className={`sidebar ${isMobileOpen ? "open" : ""}`}>
      {/* Top Header / Branding */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div className="sidebar-brand" onClick={() => handleNavClick("dashboard")}>
            <div className="brand-hexagon logo-blood-pulse">
              <BloodDropIcon size={22} color="#ffffff" variant="filled" animated />
            </div>
            <div>
              <div className="brand-name">HEXAVISION</div>
              <div className="brand-sub">Emergency Blood AI</div>
            </div>
          </div>
          {isMobileOpen && (
            <button 
              className="btn-secondary btn-sm" 
              style={{ display: "flex", padding: "6px" }}
              onClick={() => setIsMobileOpen(false)}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <ul className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <li key={item.id}>
                <button
                  className={`nav-item-btn ${isActive ? "active" : ""}`}
                  onClick={() => handleNavClick(item.id)}
                >
                  <div className="nav-label-group">
                    <Icon size={18} className="nav-icon" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && <span className="nav-pill">{item.badge}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bottom System Status */}
      <div className="sidebar-footer">
        <div className="status-indicator">
          <span className="status-dot"></span>
          <span>Backend Online • 5000</span>
        </div>
        <div className="status-indicator">
          <span className="status-dot" style={{ backgroundColor: "#00f2fe", boxShadow: "0 0 8px #00f2fe" }}></span>
          <span>PostgreSQL Connected</span>
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "4px" }}>
          HexaVision v1.0 • Decision Support
        </div>
      </div>
    </aside>
  );
}
