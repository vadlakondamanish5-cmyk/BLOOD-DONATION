import React, { useMemo, useState } from "react";
import {
  AlertOctagon,
  Bell,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Trash2
} from "lucide-react";
import BloodDropIcon from "../components/BloodDropIcon";

const notificationsSeed = [
  {
    id: 1,
    type: "CRITICAL",
    title: "CRITICAL O- Blood Emergency",
    bloodGroup: "O-",
    hospital: "Apollo Hospitals - Bannerghatta",
    donor: "Dispatch pipeline",
    timestamp: "10 minutes ago",
    status: "SENT",
    channel: "SMS + PUSH",
    details: "Emergency request dispatched for 2 units with 2-hour SLA and trauma team escalation.",
    category: "emergency"
  },
  {
    id: 2,
    type: "MATCH",
    title: "Compatible donor cluster identified",
    bloodGroup: "B+",
    hospital: "Manipal Hospital - HAL Airport Rd",
    donor: "3 matched donors",
    timestamp: "18 minutes ago",
    status: "MATCHED",
    channel: "PUSH",
    details: "Tier-1 matching engine identified three available B+ donors within the active dispatch radius.",
    category: "match"
  },
  {
    id: 3,
    type: "ACCEPTED",
    title: "Donor acceptance confirmed",
    bloodGroup: "A+",
    hospital: "Fortis Hospital - Cunningham Rd",
    donor: "SNEHA P.",
    timestamp: "45 minutes ago",
    status: "DELIVERED",
    channel: "SMS",
    details: "Donor confirmed availability and accepted the emergency transfer request for screening.",
    category: "response"
  },
  {
    id: 4,
    type: "WARNING",
    title: "Mandatory medical screening reminder",
    bloodGroup: "AB-",
    hospital: "St. John's Medical College Hospital",
    donor: "Consent review",
    timestamp: "2 hours ago",
    status: "REQUIRED",
    channel: "EMAIL",
    details: "Final cross-matching, hemoglobin verification, and transfusion clearance must be completed in person before dispatch.",
    category: "protocol"
  },
  {
    id: 5,
    type: "CRITICAL",
    title: "Urgent B+ demand escalation",
    bloodGroup: "B+",
    hospital: "Manipal Hospital - HAL Airport Rd",
    donor: "Emergency desk",
    timestamp: "3 hours ago",
    status: "ACTIVE",
    channel: "PUSH",
    details: "Urgent surgery desk request remained active and was escalated for rapid donor outreach and response tracking.",
    category: "emergency"
  }
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState("ALL");
  const notifications = useMemo(() => notificationsSeed, []);

  const filtered = notifications.filter((notification) => {
    if (filter === "CRITICAL") return notification.type === "CRITICAL";
    return true;
  });

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
            <Bell size={24} color="var(--blood-red)" />
            Emergency Notification Center
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Live emergency broadcasts, match alerts, donor responses, and hospital dispatch history
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "12px 18px", marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {[
          { id: "ALL", label: `All Alerts (${notifications.length})` },
          { id: "CRITICAL", label: "Critical SOS Only" }
        ].map((tab) => (
          <button
            key={tab.id}
            className={`btn btn-sm ${filter === tab.id ? "btn-emergency" : "btn-secondary"}`}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "50px", color: "var(--text-muted)" }}>
          <Bell size={36} color="var(--text-dim)" style={{ margin: "0 auto 10px" }} />
          <p>No notifications matching this filter.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((notification) => {
            const isCritical = notification.type === "CRITICAL";
            const accentColor =
              notification.type === "CRITICAL"
                ? "var(--blood-red)"
                : notification.type === "ACCEPTED"
                  ? "var(--status-available)"
                  : notification.type === "MATCH"
                    ? "var(--cyan-accent)"
                    : "var(--status-urgent)";

            return (
              <div
                key={notification.id}
                className={`glass-panel ${isCritical ? "critical-glow-card" : ""}`}
                style={{
                  padding: "18px 20px",
                  background: "rgba(10, 16, 30, 0.6)"
                }}
              >
                <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      background: `${accentColor}22`,
                      color: accentColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {notification.type === "CRITICAL" && <AlertOctagon size={20} />}
                    {notification.type === "ACCEPTED" && <CheckCircle2 size={20} />}
                    {notification.type === "MATCH" && <BloodDropIcon size={20} color={accentColor} animated />}
                    {notification.type === "WARNING" && <ShieldAlert size={20} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "0.96rem", color: "#ffffff" }}>{notification.title}</strong>
                      <span style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "999px", padding: "4px 8px", color: "var(--text-dim)", fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {notification.type}
                      </span>
                    </div>

                    <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: "1.5", marginBottom: "10px" }}>
                      {notification.details}
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginTop: "8px" }}>
                      <div className="notify-fact"><span>Blood group</span><strong>{notification.bloodGroup}</strong></div>
                      <div className="notify-fact"><span>Hospital</span><strong>{notification.hospital}</strong></div>
                      <div className="notify-fact"><span>Donor / target</span><strong>{notification.donor}</strong></div>
                      <div className="notify-fact"><span>Status</span><strong>{notification.status}</strong></div>
                      <div className="notify-fact"><span>Channel</span><strong>{notification.channel}</strong></div>
                      <div className="notify-fact"><span>Timestamp</span><strong>{notification.timestamp}</strong></div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", minWidth: "120px" }}>
                    <button className="btn btn-secondary btn-sm" type="button">
                      View Details
                    </button>
                    <button
                      type="button"
                      onClick={() => {}}
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-dim)", borderRadius: "8px", padding: "7px 10px", cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
