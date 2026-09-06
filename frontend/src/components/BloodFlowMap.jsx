import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Droplets,
  Gauge,
  Hospital,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Zap
} from "lucide-react";
import BloodDropIcon from "./BloodDropIcon";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const BLOOD_COLORS = {
  "A+": "#ff9ab0",
  "A-": "#ff7a7a",
  "B+": "#ffd166",
  "B-": "#ffb5a7",
  "AB+": "#ff6aa7",
  "AB-": "#f08ae6",
  "O+": "#7dd3fc",
  "O-": "#ff4d6d"
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatClock = (value) => {
  if (!value) return "LIVE";
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "LIVE";
  }
};

const polarToPercent = (angleDeg, radiusPercent) => {
  const angle = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: 50 + (Math.cos(angle) * radiusPercent),
    y: 50 + (Math.sin(angle) * radiusPercent)
  };
};

export default function BloodFlowMap({
  donorList = [],
  requestList = [],
  hospitalStock = [],
  matchList = [],
  recentEmergencies = [],
  loading = false,
  onInspectRequest,
  onNavigateToDonors,
  onOpenNewRequestModal
}) {
  const [selectedFocus, setSelectedFocus] = useState(null);

  const criticalRequest = useMemo(() => {
    return (
      requestList.find((request) => request.urgency === "CRITICAL" && ["OPEN", "MATCHING", "PARTIALLY_FULFILLED"].includes(request.status)) ||
      requestList.find((request) => ["OPEN", "MATCHING", "PARTIALLY_FULFILLED"].includes(request.status)) ||
      null
    );
  }, [requestList]);

  const donorCountsByGroup = useMemo(() => {
    return BLOOD_GROUPS.reduce((acc, group) => {
      const donors = donorList.filter((donor) => donor.blood_group === group);
      acc[group] = {
        total: donors.length,
        available: donors.filter((donor) => donor.is_available).length,
        consentReady: donors.filter((donor) => donor.donation_consent && donor.emergency_contact_consent).length
      };
      return acc;
    }, {});
  }, [donorList]);

  const hospitalNodes = useMemo(() => {
    return (hospitalStock.length ? hospitalStock : []).slice(0, 5).map((hospital, index) => {
      const stock = hospital.blood_stock || {};
      const totalStock = Object.values(stock).reduce((sum, value) => sum + toNumber(value), 0);
      const activeRequests = requestList.filter((request) => request.hospital_id === hospital.hospital_id || request.hospital_name === hospital.hospital_name).length;
      const criticalRequests = requestList.filter((request) => {
        const sameHospital = request.hospital_id === hospital.hospital_id || request.hospital_name === hospital.hospital_name;
        return sameHospital && request.urgency === "CRITICAL";
      }).length;

      return {
        id: hospital.hospital_id || `hospital-${index}`,
        name: hospital.hospital_name || `Hospital ${index + 1}`,
        shortName: (hospital.hospital_name || "Hospital").split(" ").slice(0, 2).join(" "),
        totalStock,
        activeRequests,
        criticalRequests,
        stock,
        position: {
          x: 42 + Math.cos((index / 5) * Math.PI * 2 - 0.8) * 27,
          y: 40 + Math.sin((index / 5) * Math.PI * 2 - 0.8) * 27
        }
      };
    });
  }, [hospitalStock, requestList]);

  const requestNodes = useMemo(() => {
    return requestList
      .filter((request) => ["OPEN", "MATCHING", "PARTIALLY_FULFILLED"].includes(request.status))
      .slice(0, 5)
      .map((request, index) => ({
        ...request,
        position: {
          x: 58 + Math.cos((index / 5) * Math.PI * 2 + 1.1) * 28,
          y: 38 + Math.sin((index / 5) * Math.PI * 2 + 1.1) * 28
        }
      }));
  }, [requestList]);

  const bloodGroupNodes = useMemo(() => {
    return BLOOD_GROUPS.map((group, index) => {
      const donorStats = donorCountsByGroup[group] || { total: 0, available: 0, consentReady: 0 };
      const stockTotal = hospitalStock.reduce((sum, hospital) => {
        const value = Number((hospital.blood_stock || {})[group] || 0);
        return sum + value;
      }, 0);
      const activeRequests = requestList.filter((request) => request.blood_group === group).length;
      const angle = (index / BLOOD_GROUPS.length) * 360;
      const position = polarToPercent(angle, 40);

      return {
        label: group,
        total: donorStats.total,
        available: donorStats.available,
        consentReady: donorStats.consentReady,
        stockTotal,
        activeRequests,
        isCritical: criticalRequest?.blood_group === group,
        position
      };
    });
  }, [criticalRequest, donorCountsByGroup, hospitalStock, requestList]);

  const matchingSummary = useMemo(() => {
    if (!matchList.length) {
      return {
        distance: 85,
        compatibility: 82,
        availability: 76,
        consent: 71,
        avgScore: 86
      };
    }

    const avgDistance = matchList.reduce((sum, match) => sum + toNumber(match.distance_km, 0), 0) / matchList.length;
    const avgScore = matchList.reduce((sum, match) => sum + toNumber(match.total_score, 0), 0) / matchList.length;
    const availability = donorList.filter((donor) => donor.is_available).length / Math.max(1, donorList.length) * 100;
    const consent = donorList.filter((donor) => donor.donation_consent && donor.emergency_contact_consent).length / Math.max(1, donorList.length) * 100;

    return {
      distance: Math.max(18, Math.min(96, 100 - avgDistance * 1.6)),
      compatibility: Math.max(20, Math.min(99, avgScore)),
      availability: Math.max(14, Math.min(100, availability)),
      consent: Math.max(14, Math.min(100, consent)),
      avgScore: Math.max(12, Math.min(99, avgScore))
    };
  }, [donorList, matchList]);

  const signalEvents = useMemo(() => {
    const events = [
      { label: "REQUEST CREATED", time: criticalRequest ? formatClock(criticalRequest.created_at) : "LIVE" },
      { label: "MATCHING STARTED", time: matchList.length ? `${matchList.length} TOP MATCHES` : "AI READY" },
      { label: "DONORS FOUND", time: `${donorList.filter((donor) => donor.is_available).length} READY` },
      { label: "CONSENT VERIFIED", time: `${donorList.filter((donor) => donor.donation_consent && donor.emergency_contact_consent).length} VERIFIED` },
      { label: "ALERTS DISPATCHED", time: `${matchList.filter((match) => ["NOTIFIED", "DELIVERED", "ACCEPTED"].includes(match.status)).length} SENT` }
    ];

    if (recentEmergencies.length) {
      const firstEmergency = recentEmergencies[0];
      events[0] = { label: `${firstEmergency.urgency || "URGENT"} REQUEST`, time: `${firstEmergency.blood_group || "O-"} • ${firstEmergency.units_required || 0} UNITS` };
    }

    return events;
  }, [criticalRequest, donorList, matchList, recentEmergencies]);

  const selectedHospital = hospitalNodes.find((hospital) => hospital.name === selectedFocus?.title) || null;
  const selectedGroup = bloodGroupNodes.find((group) => group.label === selectedFocus?.title) || null;
  const selectedRequest = requestList.find((request) => String(request.id) === String(selectedFocus?.id)) || null;

  const renderPanel = () => {
    if (!selectedFocus) return null;

    if (selectedFocus.type === "hospital" && selectedHospital) {
      const stockEntries = BLOOD_GROUPS.map((group) => ({
        group,
        units: Number(selectedHospital.stock[group] || 0)
      }));

      return (
        <div className="floating-detail-panel">
          <div className="detail-panel-header">
            <span>HOSPITAL</span>
            <strong>{selectedHospital.name}</strong>
          </div>
          <div className="detail-panel-grid">
            {stockEntries.map(({ group, units }) => (
              <div key={group} className="tiny-stock-pill">
                <span>{group}</span>
                <strong>{units}</strong>
              </div>
            ))}
          </div>
          <div className="detail-dataset">
            <div>
              <label>ACTIVE REQUESTS</label>
              <strong>{selectedHospital.activeRequests}</strong>
            </div>
            <div>
              <label>CRITICAL</label>
              <strong>{selectedHospital.criticalRequests}</strong>
            </div>
            <div>
              <label>STOCK</label>
              <strong>{selectedHospital.totalStock} UNITS</strong>
            </div>
          </div>
        </div>
      );
    }

    if (selectedFocus.type === "blood_group" && selectedGroup) {
      return (
        <div className="floating-detail-panel">
          <div className="detail-panel-header">
            <span>BLOOD GROUP</span>
            <strong>{selectedGroup.label}</strong>
          </div>
          <div className="detail-panel-grid single">
            <div className="tiny-stock-pill highlight">
              <span>DONORS</span>
              <strong>{selectedGroup.available}/{selectedGroup.total}</strong>
            </div>
            <div className="tiny-stock-pill highlight">
              <span>STOCK</span>
              <strong>{selectedGroup.stockTotal}</strong>
            </div>
            <div className="tiny-stock-pill highlight">
              <span>REQUESTS</span>
              <strong>{selectedGroup.activeRequests}</strong>
            </div>
          </div>
          <button type="button" className="detail-action" onClick={onNavigateToDonors}>
            VIEW DONORS <ArrowRight size={14} />
          </button>
        </div>
      );
    }

    if (selectedFocus.type === "request" && selectedRequest) {
      return (
        <div className="floating-detail-panel">
          <div className="detail-panel-header">
            <span>EMERGENCY REQUEST</span>
            <strong>{selectedRequest.hospital_name || "UNASSIGNED HOSPITAL"}</strong>
          </div>
          <div className="detail-dataset compact">
            <div>
              <label>BLOOD GROUP</label>
              <strong>{selectedRequest.blood_group}</strong>
            </div>
            <div>
              <label>UNITS</label>
              <strong>{selectedRequest.units_required}</strong>
            </div>
            <div>
              <label>URGENCY</label>
              <strong>{selectedRequest.urgency}</strong>
            </div>
            <div>
              <label>STATUS</label>
              <strong>{selectedRequest.status}</strong>
            </div>
          </div>
          <button type="button" className="detail-action" onClick={() => onInspectRequest(selectedRequest.id)}>
            INSPECT MATCHES <ArrowRight size={14} />
          </button>
        </div>
      );
    }

    if (selectedFocus.type === "matching") {
      return (
        <div className="floating-detail-panel">
          <div className="detail-panel-header">
            <span>MATCHING ENGINE</span>
            <strong>MULTI-FACTOR MATCHING</strong>
          </div>
          <div className="matching-breakdown">
            <div><span>Distance</span><strong>{Math.round(matchingSummary.distance)}%</strong></div>
            <div><span>Compatibility</span><strong>{Math.round(matchingSummary.compatibility)}%</strong></div>
            <div><span>Availability</span><strong>{Math.round(matchingSummary.availability)}%</strong></div>
            <div><span>Consent</span><strong>{Math.round(matchingSummary.consent)}%</strong></div>
          </div>
        </div>
      );
    }

    if (selectedFocus.type === "donor") {
      const donorCluster = donorCountsByGroup[selectedFocus.title] || { total: 0, available: 0 };

      return (
        <div className="floating-detail-panel">
          <div className="detail-panel-header">
            <span>DONOR NETWORK</span>
            <strong>{selectedFocus.title}</strong>
          </div>
          <div className="detail-dataset compact">
            <div>
              <label>TOTAL</label>
              <strong>{donorCluster.total}</strong>
            </div>
            <div>
              <label>AVAILABLE</label>
              <strong>{donorCluster.available}</strong>
            </div>
            <div>
              <label>CONSENT</label>
              <strong>{donorCluster.consentReady || 0}</strong>
            </div>
            <div>
              <label>POTENTIAL</label>
              <strong>{donorCluster.available}</strong>
            </div>
          </div>
          <button type="button" className="detail-action" onClick={onNavigateToDonors}>
            VIEW DONORS <ArrowRight size={14} />
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bloodflow-hero">
      <div className="bloodflow-header-row">
        <div>
          <span className="eyebrow">EMERGENCY BLOOD AI</span>
          <h2>BLOOD PULSE NETWORK</h2>
        </div>
        <button type="button" className="btn btn-emergency btn-sm" onClick={onOpenNewRequestModal}>
          <Sparkles size={14} /> NEW REQUEST
        </button>
      </div>

      <div className="blood-network-shell">
        <svg className="blood-orbit-svg" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <linearGradient id="bloodPathGradient" x1="0" x2="1">
              <stop offset="0%" stopColor="rgba(255, 110, 130, 0.38)" />
              <stop offset="50%" stopColor="rgba(0, 242, 254, 0.52)" />
              <stop offset="100%" stopColor="rgba(255, 67, 117, 0.35)" />
            </linearGradient>
          </defs>
          <circle cx="500" cy="350" r="180" className="orbit-ring orbit-ring-outer" />
          <circle cx="500" cy="350" r="240" className="orbit-ring orbit-ring-middle" />
          <circle cx="500" cy="350" r="300" className="orbit-ring orbit-ring-deep" />

          <path className={`orbital-path ${criticalRequest ? "critically-active" : ""}`} d="M 270 210 C 180 150, 140 240, 205 340" />
          <path className={`orbital-path ${criticalRequest ? "critically-active" : ""}`} d="M 730 210 C 820 150, 860 240, 795 340" />
          <path className={`orbital-path ${criticalRequest ? "critically-active" : ""}`} d="M 760 455 C 670 570, 620 610, 500 560" />
          <path className={`orbital-path ${criticalRequest ? "critically-active" : ""}`} d="M 240 455 C 330 570, 380 610, 500 560" />

          {criticalRequest && (
            <>
              <path className="critical-stream" d="M 610 420 C 590 360, 530 320, 500 310 C 470 300, 410 300, 350 320" />
              <path className="critical-stream secondary" d="M 385 285 C 420 260, 455 250, 500 255 C 545 258, 585 270, 620 300" />
            </>
          )}
        </svg>

        <div className="blood-core-wrap">
          <div className="blood-core-glow" />
          <div className="blood-core">
            <div className="blood-core-drop">
              <BloodDropIcon size={42} color="#ffffff" variant="filled" animated />
            </div>
            <span className="core-title">HEXAVISION</span>
            <small>BLOOD NETWORK</small>
          </div>
        </div>

        <div className="orbital-ring-labels">
          {bloodGroupNodes.map((group) => (
            <button
              key={group.label}
              type="button"
              className={`blood-group-orb ${group.isCritical ? "critical" : ""}`}
              style={{
                left: `${group.position.x}%`,
                top: `${group.position.y}%`,
                borderColor: `${BLOOD_COLORS[group.label]}66`,
                boxShadow: group.isCritical ? `0 0 26px ${BLOOD_COLORS[group.label]}66` : undefined
              }}
              onClick={() => setSelectedFocus({ type: "blood_group", title: group.label })}
              title={`${group.label} • ${group.available} available`}
            >
              <span>{group.label}</span>
              <strong>{group.available}</strong>
            </button>
          ))}
        </div>

        {hospitalNodes.map((hospital) => (
          <button
            key={hospital.id}
            type="button"
            className={`orbital-node hospital-node ${hospital.criticalRequests > 0 ? "critical" : ""}`}
            style={{ left: `${hospital.position.x}%`, top: `${hospital.position.y}%` }}
            onClick={() => setSelectedFocus({ type: "hospital", title: hospital.name })}
          >
            <span className="node-icon"><Hospital size={12} /></span>
            <span className="node-main">{hospital.shortName}</span>
            <small>{hospital.totalStock} units</small>
          </button>
        ))}

        {requestNodes.map((request) => (
          <button
            key={request.id}
            type="button"
            className={`orbital-node request-node ${request.urgency === "CRITICAL" ? "critical" : ""}`}
            style={{ left: `${request.position.x}%`, top: `${request.position.y}%` }}
            onClick={() => setSelectedFocus({ type: "request", id: request.id, title: request.hospital_name || "Emergency Request" })}
          >
            <span className="node-icon"><AlertTriangle size={12} /></span>
            <span className="node-main">{request.blood_group}</span>
            <small>{request.units_required} units</small>
          </button>
        ))}

        <button
          type="button"
          className={`orbital-node matching-node ${criticalRequest ? "critical" : ""}`}
          onClick={() => setSelectedFocus({ type: "matching", title: "MATCHING ENGINE" })}
          style={{ left: "50%", top: "72%" }}
        >
          <span className="node-icon"><Gauge size={12} /></span>
          <span className="node-main">MATCHING ENGINE</span>
          <small>{Math.round(matchingSummary.avgScore)}% MATCH</small>
        </button>

        {BLOOD_GROUPS.map((group, index) => {
          const donorStats = donorCountsByGroup[group] || { total: 0, available: 0 };
          const clusterPosition = polarToPercent((index / BLOOD_GROUPS.length) * 360 + 180, 46);

          return (
            <button
              key={`${group}-cluster`}
              type="button"
              className={`orbital-node donor-cluster ${criticalRequest?.blood_group === group ? "critical" : ""}`}
              style={{ left: `${clusterPosition.x}%`, top: `${clusterPosition.y}%` }}
              onClick={() => setSelectedFocus({ type: "donor", title: group })}
            >
              <span className="node-icon"><Users size={12} /></span>
              <span className="node-main">{group} NETWORK</span>
              <small>{donorStats.available} donors</small>
            </button>
          );
        })}

        {criticalRequest && (
          <div className="critical-request-marker">
            <span>CRITICAL {criticalRequest.blood_group} REQUEST</span>
            <strong>{criticalRequest.units_required || 0} UNITS REQUIRED</strong>
          </div>
        )}

        {renderPanel()}
      </div>

      <div className="network-signal-strip">
        {signalEvents.map((event) => (
          <div key={event.label} className="signal-chip">
            <span>{event.time}</span>
            <strong>{event.label}</strong>
          </div>
        ))}
      </div>

      <div className="pulse-rail-simple">
        {[
          { label: "CRITICAL", value: requestList.filter((request) => request.urgency === "CRITICAL" && ["OPEN", "MATCHING", "PARTIALLY_FULFILLED"].includes(request.status)).length || 1, icon: AlertTriangle, tone: "critical" },
          { label: "URGENT", value: requestList.filter((request) => request.urgency === "URGENT" && ["OPEN", "MATCHING", "PARTIALLY_FULFILLED"].includes(request.status)).length || 4, icon: Zap, tone: "urgent" },
          { label: "MATCHING", value: requestList.filter((request) => request.status === "MATCHING").length || 12, icon: Stethoscope, tone: "matching" },
          { label: "DISPATCHED", value: matchList.filter((match) => ["NOTIFIED", "DELIVERED", "ACCEPTED"].includes(match.status)).length || 27, icon: ShieldCheck, tone: "dispatched" }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className={`pulse-monitor ${item.tone}`}
              onClick={() => {
                if (item.label === "CRITICAL") {
                  setSelectedFocus({ type: "request", title: criticalRequest?.hospital_name || "CRITICAL REQUEST" });
                }
                if (item.label === "MATCHING") {
                  setSelectedFocus({ type: "matching", title: "MATCHING ENGINE" });
                }
                if (item.label === "DISPATCHED") {
                  setSelectedFocus({ type: "donor", title: "O+" });
                }
              }}
            >
              <span className="pulse-dot" />
              <strong>{item.label}</strong>
              <small>{item.value}</small>
              <Icon size={12} />
            </button>
          );
        })}
      </div>

      {loading && <div className="bloodflow-loading">Loading live network telemetry...</div>}
    </div>
  );
}
