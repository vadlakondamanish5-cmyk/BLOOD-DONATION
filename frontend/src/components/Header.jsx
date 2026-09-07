import React from "react";
import {
  Bell,
  Droplets,
  Hospital,
  Menu,
  Plus,
  Radio,
  Bot,
  LogOut,
  User,
  ShieldCheck
} from "lucide-react";

export default function Header({
  onToggleMobileMenu,
  onOpenSOSModal,
  onOpenNewRequestModal,
  onOpenHospitalBloodStock,
  onNavigateToNotifications,
  hospitalStock = [],
  user = null,
  onOpenAuthModal,
  onSignOut,
  aiActive = true
}) {
  const totalHospitals = hospitalStock.length;
  const totalUnits = hospitalStock.reduce((sum, hospital) => {
    const values = Object.values(hospital.blood_stock || {});
    return sum + values.reduce((groupSum, value) => groupSum + Number(value || 0), 0);
  }, 0);

  return (
    <header className="top-header">
      <div className="header-left">
        <button className="mobile-menu-toggle" onClick={onToggleMobileMenu} aria-label="Toggle menu">
          <Menu size={22} />
        </button>

        <button
          type="button"
          className="hospital-stock-trigger"
          onClick={onOpenHospitalBloodStock}
          aria-label="Open hospital blood stock panel"
        >
          <div className="hospital-stock-trigger-icon">
            <Hospital size={18} />
            <Droplets size={12} />
          </div>
          <div className="hospital-stock-trigger-copy">
            <span className="hospital-stock-trigger-title">HOSPITAL BLOOD STOCK</span>
            <span className="hospital-stock-trigger-meta">
              {totalHospitals || 6} Hospitals • {totalUnits || 143} Units
              <span className="live-status-dot" aria-hidden="true" />
            </span>
          </div>
        </button>

        {/* AI System Badge */}
        <div className={`header-ai-badge ${aiActive ? "ai-online" : "ai-standby"}`} title="Emergency Blood AI Transfusion Engine">
          <Bot size={15} className="header-ai-icon" />
          <span className="header-ai-text">
            {aiActive ? "AI MATCHING ACTIVE" : "AI STANDBY"}
          </span>
          <span className="ai-status-pulse" />
        </div>
      </div>

      <div className="header-right">
        <button className="btn btn-secondary btn-sm" onClick={onOpenNewRequestModal}>
          <Plus size={15} />
          <span>New Request</span>
        </button>

        <button className="btn btn-emergency btn-sm" onClick={onOpenSOSModal}>
          <Radio size={15} />
          <span>Broadcast SOS</span>
        </button>

        <button
          className="btn-secondary btn-sm"
          style={{ padding: "8px" }}
          onClick={onNavigateToNotifications}
          title="Notification Center"
          aria-label="Open notification center"
        >
          <Bell size={18} />
        </button>

        {user ? (
          <div className="header-user-badge">
            <div className="user-badge-info">
              <span className="user-badge-name">{user.full_name}</span>
              <span className="user-badge-org">{user.organization || "Apollo Trauma Desk"}</span>
            </div>
            <button
              type="button"
              className="user-badge-logout-btn"
              onClick={onSignOut}
              title="Sign Out of Session"
              aria-label="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenAuthModal}
            style={{ borderColor: "rgba(0, 242, 254, 0.4)", color: "var(--cyan-accent)" }}
          >
            <User size={14} />
            <span>Clinical Login</span>
          </button>
        )}
      </div>
    </header>
  );
}

