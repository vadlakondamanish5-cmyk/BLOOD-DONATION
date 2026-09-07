import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  Droplet,
  Hospital,
  MapPin,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X
} from "lucide-react";
import { api } from "../api/api";
import BloodFlowMap from "../components/BloodFlowMap";

const BLOOD_GROUPS = ["ALL", "O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
const STOCK_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const URGENCY_LEVELS = ["ALL", "CRITICAL", "URGENT", "NORMAL"];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return value;
  }
};

const formatClock = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
};

const getDonorStatus = (donor) => {
  if (!donor) return { label: "UNAVAILABLE", tone: "unavailable" };
  if (donor.is_available && donor.donation_consent && donor.emergency_contact_consent) {
    return { label: "AVAILABLE", tone: "available" };
  }
  if (donor.is_available) {
    return { label: "LIMITED", tone: "limited" };
  }
  return { label: "UNAVAILABLE", tone: "unavailable" };
};

const getDistanceText = (donor) => {
  if (!donor) return "—";

  if (donor.distance_km !== undefined && donor.distance_km !== null && donor.distance_km !== "") {
    const value = Number(donor.distance_km);
    return Number.isFinite(value) ? `${value.toFixed(1)} km` : donor.distance_km;
  }

  if (donor.distance !== undefined && donor.distance !== null && donor.distance !== "") {
    const value = Number(donor.distance);
    return Number.isFinite(value) ? `${value.toFixed(1)} km` : donor.distance;
  }

  if (donor.distance_text) return donor.distance_text;
  return "—";
};

const getMatchScore = (donor) => {
  if (!donor) return null;

  const value = donor.match_score ?? donor.matching_score ?? donor.compatibility_score ?? donor.score;
  if (value === undefined || value === null || value === "") return null;

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;

  return `${Math.round(numeric)}%`;
};

export default function DashboardPage({
  stats,
  requests = [],
  hospitalStock = [],
  loading,
  onInspectRequest,
  onOpenSOSModal,
  onOpenNewRequestModal,
  onNavigate
}) {
  const donorsBase = stats?.donors || {};
  const requestsBase = stats?.requests || {};
  const matchesBase = stats?.matches || {};
  const alertsBase = stats?.alerts || {};
  const recentEmergencies = stats?.recent_emergencies || [];

  const [donorList, setDonorList] = useState([]);
  const [requestList, setRequestList] = useState([]);
  const [matchList, setMatchList] = useState([]);
  const [activeMetric, setActiveMetric] = useState(null);
  const [panelQuery, setPanelQuery] = useState("");
  const [panelBloodFilter, setPanelBloodFilter] = useState("ALL");
  const [panelAvailabilityOnly, setPanelAvailabilityOnly] = useState(false);
  const [panelUrgencyFilter, setPanelUrgencyFilter] = useState("ALL");
  const [selectedDonorId, setSelectedDonorId] = useState(null);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [selectedNetworkNode, setSelectedNetworkNode] = useState(null);

  const loadDashboardDetailData = async () => {
    try {
      const [donorsRes, requestsRes, matchesRes] = await Promise.all([
        api.getDonors().catch(() => ({ data: [] })),
        api.getRequests().catch(() => ({ data: [] })),
        api.getMatches().catch(() => ({ data: [] }))
      ]);

      setDonorList(donorsRes.data || []);
      setRequestList(requestsRes.data || []);
      setMatchList(matchesRes.data || []);
    } catch (err) {
      console.error("Error loading dashboard command data:", err);
    }
  };

  useEffect(() => {
    loadDashboardDetailData();
  }, []);

  useEffect(() => {
    if (!selectedDonorId) {
      setSelectedDonor(null);
      return;
    }

    const donorMatch = donorList.find((donor) => donor.id === selectedDonorId);
    if (donorMatch) {
      setSelectedDonor(donorMatch);
      return;
    }

    let isMounted = true;
    api.getDonorById(selectedDonorId)
      .then((res) => {
        if (isMounted) setSelectedDonor(res.data || null);
      })
      .catch(() => {
        if (isMounted) setSelectedDonor(null);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDonorId, donorList]);

  const criticalRequest = useMemo(() => {
    return requestList.find((request) => {
      return request.urgency === "CRITICAL" && ["OPEN", "MATCHING", "PARTIALLY_FULFILLED"].includes(request.status);
    }) || requestList.find((request) => ["OPEN", "MATCHING", "PARTIALLY_FULFILLED"].includes(request.status)) || null;
  }, [requestList]);

  const hospitalNetwork = useMemo(() => {
    return (hospitalStock.length ? hospitalStock : []).slice(0, 6).map((hospital, index) => {
      const stock = hospital.blood_stock || {};
      const matchingDonors = donorList.filter((donor) => donor.is_available && donor.blood_group === "O+");
      const activeRequests = requestList.filter((request) => request.hospital_id === hospital.hospital_id || request.hospital_name === hospital.hospital_name).length;
      const criticalRequests = requestList.filter((request) => {
        const matchesHospital = request.hospital_id === hospital.hospital_id || request.hospital_name === hospital.hospital_name;
        return matchesHospital && request.urgency === "CRITICAL";
      }).length;

      return {
        id: hospital.hospital_id || index,
        name: hospital.hospital_name || `Hospital ${index + 1}`,
        shortName: (hospital.hospital_name || "Hospital").split(" ").slice(0, 2).join(" "),
        stock,
        summary: `${Object.values(stock).reduce((sum, value) => sum + Number(value || 0), 0)} units`,
        activeRequests,
        criticalRequests,
        availableDonors: matchingDonors.length,
        x: 18 + ((index % 3) * 25),
        y: 16 + (Math.floor(index / 3) * 30)
      };
    });
  }, [donorList, hospitalStock, requestList]);

  const bloodNetworkGroups = useMemo(() => {
    return STOCK_GROUPS.map((group, index) => {
      const donors = donorList.filter((donor) => donor.blood_group === group);
      const availableDonors = donors.filter((donor) => donor.is_available).length;
      const stockTotal = hospitalStock.reduce((sum, hospital) => {
        const units = Number((hospital.blood_stock || {})[group] || 0);
        return sum + units;
      }, 0);
      const activeRequests = requestList.filter((request) => request.blood_group === group).length;

      return {
        label: group,
        total: donors.length,
        available: availableDonors,
        stockTotal,
        activeRequests,
        isCritical: criticalRequest?.blood_group === group,
        x: 50 + Math.cos((index / STOCK_GROUPS.length) * Math.PI * 2) * 30,
        y: 50 + Math.sin((index / STOCK_GROUPS.length) * Math.PI * 2) * 30
      };
    });
  }, [criticalRequest, donorList, hospitalStock, requestList]);

  const hospitalStockSummary = useMemo(() => {
    if (!hospitalStock.length) {
      return { totalHospitals: 0, totalUnits: 0, groupTotals: {}, lowStock: [], criticalStock: [] };
    }

    const groupTotals = Object.fromEntries(STOCK_GROUPS.map((group) => [group, 0]));
    const lowStock = [];
    const criticalStock = [];

    hospitalStock.forEach((hospital) => {
      const bloodStock = hospital.blood_stock || {};
      STOCK_GROUPS.forEach((group) => {
        const amount = Number(bloodStock[group] || 0);
        groupTotals[group] += amount;

        if (amount > 0 && amount <= 5) lowStock.push(group);
        if (amount > 0 && amount <= 2) criticalStock.push(group);
      });
    });

    const totalUnits = Object.values(groupTotals).reduce((sum, value) => sum + value, 0);

    return {
      totalHospitals: hospitalStock.length,
      totalUnits,
      groupTotals,
      lowStock: [...new Set(lowStock)],
      criticalStock: [...new Set(criticalStock)]
    };
  }, [hospitalStock]);

  const kpis = useMemo(
    () => [
      {
        key: "total-donors",
        title: "TOTAL DONORS",
        value: toNumber(donorsBase.total_donors || donorList.length),
        label: "Consented Registry",
        icon: Users,
        accent: "#00f2fe",
        tone: "cyan",
        progress: 80
      },
      {
        key: "available-donors",
        title: "AVAILABLE DONORS",
        value: toNumber(donorsBase.available_donors || donorList.filter((d) => d.is_available).length),
        label: "Ready to Dispatch",
        icon: UserCheck,
        accent: "#10b981",
        tone: "green",
        progress: 72
      },
      {
        key: "active-requests",
        title: "ACTIVE REQUESTS",
        value: toNumber(requestsBase.active_requests || requestList.filter((r) => ["OPEN", "MATCHING"].includes(r.status)).length || requests.length),
        label: "Hospital Queue",
        icon: Radio,
        accent: "#ff2a55",
        tone: "red",
        progress: 66
      },
      {
        key: "critical-requests",
        title: "CRITICAL REQUESTS",
        value: toNumber(requestsBase.critical_active_requests || requestList.filter((r) => r.urgency === "CRITICAL" && ["OPEN", "MATCHING"].includes(r.status)).length),
        label: "Immediate Trauma",
        icon: AlertTriangle,
        accent: "#ff5b7e",
        tone: "critical",
        progress: 92
      },
      {
        key: "successful-matches",
        title: "SUCCESSFUL MATCHES",
        value: toNumber(matchesBase.total_matches || matchList.filter((m) => ["ACCEPTED", "NOTIFIED", "DELIVERED"].includes(m.status)).length),
        label: "Match Confidence",
        icon: CheckCircle2,
        accent: "#c084fc",
        tone: "violet",
        progress: 84
      },
      {
        key: "donors-notified",
        title: "DONORS NOTIFIED",
        value: toNumber(alertsBase.total_alerts_dispatched || matchList.filter((m) => ["NOTIFIED", "DELIVERED", "PENDING"].includes(m.status)).length),
        label: "Dispatch Log",
        icon: Bell,
        accent: "#38bdf8",
        tone: "blue",
        progress: 58
      }
    ],
    [alertsBase, donorList, donorsBase, matchesBase, matchList, requestList, requests, requestsBase]
  );

  const dashboardStats = {
    totalDonors: donorList.length || toNumber(donorsBase.total_donors),
    availableDonors: donorList.filter((d) => d.is_available).length || toNumber(donorsBase.available_donors),
    urgentRequests: requestList.filter((r) => r.urgency === "URGENT" && ["OPEN", "MATCHING", "PARTIALLY_FULFILLED"].includes(r.status)).length || toNumber(requestsBase.urgent_active_requests),
    criticalRequests: requestList.filter((r) => r.urgency === "CRITICAL" && ["OPEN", "MATCHING", "PARTIALLY_FULFILLED"].includes(r.status)).length || toNumber(requestsBase.critical_active_requests),
    matchingNow: requestList.filter((r) => r.status === "MATCHING").length || toNumber(requestsBase.active_requests),
    notifiedCount: matchList.filter((m) => ["NOTIFIED", "DELIVERED"].includes(m.status)).length || toNumber(alertsBase.total_alerts_dispatched),
    activeRequests: requestList.filter((r) => ["OPEN", "MATCHING"].includes(r.status)).length || toNumber(requestsBase.active_requests),
    matchedCount: matchList.filter((m) => ["ACCEPTED", "NOTIFIED", "DELIVERED"].includes(m.status)).length || toNumber(matchesBase.total_matches),
    eligibleDonors: Number(stats?.donors?.eligible_donors ?? donorList.filter((d) => d.eligible).length),
    waitingDonors: Number(stats?.donors?.waiting_for_donation_cycle ?? donorList.filter((d) => !d.isDonationCycleCompleted).length),
    ineligibleDonors: Number(stats?.donors?.medically_ineligible ?? donorList.filter((d) => !d.eligible || !d.isMedicallyVerified || d.isTemporarilyIneligible).length)
  };

  const donorEligibilityCards = [
    { label: "🟢 Eligible & Available Donors", value: dashboardStats.eligibleDonors, tone: "green" },
    { label: "⚠️ Donors Waiting for Donation Cycle", value: dashboardStats.waitingDonors, tone: "amber" },
    { label: "🔴 Medically/Temporarily Ineligible", value: dashboardStats.ineligibleDonors, tone: "red" }
  ];

  const emergencyBlocks = [
    {
      key: "urgent-requests",
      label: "URGENT BLOOD REQUESTS",
      subtitle: "Hospital Emergency Queue",
      count: dashboardStats.urgentRequests,
      accent: "#ff5c7a",
      type: "urgent",
      icon: Radio,
      active: dashboardStats.urgentRequests > 0
    },
    {
      key: "critical-requests",
      label: "CRITICAL REQUESTS",
      subtitle: "Immediate Trauma",
      count: dashboardStats.criticalRequests,
      accent: "#ff4d6d",
      type: "critical",
      icon: AlertTriangle,
      active: dashboardStats.criticalRequests > 0
    },
    {
      key: "matching-now",
      label: "MATCHING NOW",
      subtitle: "AI Donor Matching",
      count: dashboardStats.matchingNow,
      accent: "#57e6ff",
      type: "matching",
      icon: DatabaseZap,
      active: dashboardStats.matchingNow > 0
    },
    {
      key: "donors-notified",
      label: "DONORS NOTIFIED",
      subtitle: "Alerts Dispatched",
      count: dashboardStats.notifiedCount,
      accent: "#3dd9a3",
      type: "notified",
      icon: Bell,
      active: dashboardStats.notifiedCount > 0
    }
  ];

  const openMetricPanel = (key) => {
    setActiveMetric(key);
    setPanelQuery("");
    setPanelBloodFilter("ALL");
    setPanelUrgencyFilter("ALL");
    setPanelAvailabilityOnly(false);
    setSelectedDonorId(null);
    setSelectedDonor(null);
  };

  const closeMetricPanel = () => {
    setActiveMetric(null);
    setPanelQuery("");
    setPanelBloodFilter("ALL");
    setPanelAvailabilityOnly(false);
    setPanelUrgencyFilter("ALL");
    setSelectedDonorId(null);
    setSelectedDonor(null);
  };

  const getMetricDefinition = (key) => {
    if (key === "urgent-requests") {
      return { key: "urgent-requests", title: "URGENT BLOOD REQUESTS", label: "Hospital Emergency Queue" };
    }
    if (key === "matching-now") {
      return { key: "matching-now", title: "MATCHING NOW", label: "AI Donor Matching" };
    }
    return kpis.find((metric) => metric.key === key) || kpis[0];
  };

  const filteredMetricItems = useMemo(() => {
    if (!activeMetric) return [];

    if (activeMetric === "urgent-requests") {
      return requestList.filter((request) => {
        const matchesQuery = !panelQuery || `${request.hospital_name || ""} ${request.blood_group || ""} ${request.id || ""}`
          .toLowerCase()
          .includes(panelQuery.toLowerCase());

        const matchesBlood = panelBloodFilter === "ALL" || request.blood_group === panelBloodFilter;
        const matchesUrgency = panelUrgencyFilter === "ALL" || request.urgency === panelUrgencyFilter;

        return request.urgency === "URGENT" && ["OPEN", "MATCHING", "PARTIALLY_FULFILLED"].includes(request.status) && matchesQuery && matchesBlood && matchesUrgency;
      });
    }

    if (activeMetric === "total-donors" || activeMetric === "available-donors") {
      return donorList.filter((donor) => {
        const matchesQuery = !panelQuery || `${donor.full_name || ""} ${donor.blood_group || ""} ${donor.phone || ""}`
          .toLowerCase()
          .includes(panelQuery.toLowerCase());

        const matchesBlood = panelBloodFilter === "ALL" || donor.blood_group === panelBloodFilter;
        const matchesAvailable = !panelAvailabilityOnly || donor.is_available;

        return matchesQuery && matchesBlood && matchesAvailable;
      });
    }

    if (activeMetric === "active-requests" || activeMetric === "critical-requests") {
      return requestList.filter((request) => {
        const matchesQuery = !panelQuery || `${request.hospital_name || ""} ${request.blood_group || ""} ${request.id || ""}`
          .toLowerCase()
          .includes(panelQuery.toLowerCase());

        const matchesBlood = panelBloodFilter === "ALL" || request.blood_group === panelBloodFilter;
        const matchesUrgency = panelUrgencyFilter === "ALL" || request.urgency === panelUrgencyFilter;

        if (activeMetric === "critical-requests") {
          return request.urgency === "CRITICAL" && ["OPEN", "MATCHING", "PARTIALLY_FULFILLED"].includes(request.status) && matchesQuery && matchesBlood && matchesUrgency;
        }

        return ["OPEN", "MATCHING", "PARTIALLY_FULFILLED"].includes(request.status) && matchesQuery && matchesBlood && matchesUrgency;
      });
    }

    if (activeMetric === "matching-now") {
      return requestList.filter((request) => {
        const matchesQuery = !panelQuery || `${request.hospital_name || ""} ${request.blood_group || ""} ${request.id || ""}`
          .toLowerCase()
          .includes(panelQuery.toLowerCase());

        const matchesBlood = panelBloodFilter === "ALL" || request.blood_group === panelBloodFilter;
        return request.status === "MATCHING" && matchesQuery && matchesBlood;
      });
    }

    if (activeMetric === "successful-matches") {
      return matchList.filter((match) => {
        const matchesQuery = !panelQuery || `${match.donor_name || ""} ${match.req_blood_group || ""} ${match.hospital_name || ""}`
          .toLowerCase()
          .includes(panelQuery.toLowerCase());

        const matchesBlood = panelBloodFilter === "ALL" || (match.donor_blood_group || match.req_blood_group) === panelBloodFilter;

        return ["ACCEPTED", "NOTIFIED", "DELIVERED"].includes(match.status) && matchesQuery && matchesBlood;
      });
    }

    if (activeMetric === "donors-notified") {
      return matchList.filter((match) => {
        const matchesQuery = !panelQuery || `${match.donor_name || ""} ${match.hospital_name || ""} ${match.status || ""}`
          .toLowerCase()
          .includes(panelQuery.toLowerCase());

        const matchesBlood = panelBloodFilter === "ALL" || (match.donor_blood_group || match.req_blood_group) === panelBloodFilter;
        const matchesUrgency = panelUrgencyFilter === "ALL" || match.status === panelUrgencyFilter;

        return ["PENDING", "NOTIFIED", "DELIVERED", "ACCEPTED", "DECLINED"].includes(match.status) && matchesQuery && matchesBlood && matchesUrgency;
      });
    }

    return [];
  }, [activeMetric, donorList, matchList, panelAvailabilityOnly, panelBloodFilter, panelQuery, panelUrgencyFilter, requestList]);

  const metricDefinition = activeMetric ? getMetricDefinition(activeMetric) : null;

  const donorCarouselRef = useRef(null);
  const donorDragRef = useRef({ dragging: false, startX: 0, startScrollLeft: 0 });
  const [donorScrollState, setDonorScrollState] = useState({ canScrollLeft: false, canScrollRight: true });

  const updateDonorScrollState = () => {
    const carousel = donorCarouselRef.current;
    if (!carousel) return;

    const atStart = carousel.scrollLeft <= 4;
    const atEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 4;
    setDonorScrollState({
      canScrollLeft: !atStart,
      canScrollRight: !atEnd
    });
  };

  useEffect(() => {
    updateDonorScrollState();
  }, [donorList]);

  useEffect(() => {
    const carousel = donorCarouselRef.current;
    if (!carousel) return undefined;

    const handleScroll = () => updateDonorScrollState();
    const handleResize = () => updateDonorScrollState();

    carousel.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    handleScroll();

    return () => {
      carousel.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const scrollDonorCarousel = (direction) => {
    const carousel = donorCarouselRef.current;
    if (!carousel) return;

    const scrollAmount = Math.min(carousel.clientWidth * 0.8, 340);
    carousel.scrollBy({ left: direction * scrollAmount, behavior: "smooth" });
  };

  const handleDonorDragStart = (event) => {
    const carousel = donorCarouselRef.current;
    if (!carousel) return;

    donorDragRef.current = {
      dragging: true,
      startX: event.clientX,
      startScrollLeft: carousel.scrollLeft
    };

    carousel.setPointerCapture?.(event.pointerId);
    carousel.classList.add("dragging");
  };

  const handleDonorDragMove = (event) => {
    const carousel = donorCarouselRef.current;
    if (!carousel || !donorDragRef.current.dragging) return;

    const deltaX = event.clientX - donorDragRef.current.startX;
    carousel.scrollLeft = donorDragRef.current.startScrollLeft - deltaX;
  };

  const handleDonorDragEnd = () => {
    donorDragRef.current.dragging = false;
    const carousel = donorCarouselRef.current;
    if (carousel) {
      carousel.classList.remove("dragging");
    }
  };

  const handleDonorKeyDown = (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollDonorCarousel(1);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollDonorCarousel(-1);
    }
  };

  return (
    <div className="command-dashboard-shell">
      <div className="command-dashboard">
        <section className="command-stage">
          <BloodFlowMap
            donorList={donorList}
            requestList={requestList}
            hospitalStock={hospitalStock}
            matchList={matchList}
            recentEmergencies={recentEmergencies}
            loading={loading}
            onInspectRequest={onInspectRequest}
            onNavigateToDonors={() => onNavigate("donors")}
            onOpenNewRequestModal={onOpenNewRequestModal}
          />

          <div className="telemetry-grid">
            {kpis.map((metric) => {
              const Icon = metric.icon;
              const toneClass = `metric-module-${metric.tone}`;

              return (
                <button
                  key={metric.key}
                  type="button"
                  className={`metric-module ${toneClass}`}
                  aria-label={`Open ${metric.title}`}
                  onClick={() => openMetricPanel(metric.key)}
                >
                  <div className="metric-header">
                    <span className="metric-name">{metric.title}</span>
                    <span className="metric-icon" style={{ background: `${metric.accent}18`, color: metric.accent }}>
                      <Icon size={16} />
                    </span>
                  </div>

                  <div className="metric-body">
                    <strong>{loading ? "..." : metric.value}</strong>
                    <small>{metric.label}</small>
                  </div>

                  <div className="metric-progressbar">
                    <span style={{ width: `${metric.progress}%`, background: metric.accent }} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="telemetry-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {donorEligibilityCards.map((card) => (
              <div
                key={card.label}
                className={`metric-module metric-module-${card.tone}`}
                style={{ minHeight: "110px" }}
              >
                <div className="metric-header">
                  <span className="metric-name">{card.label}</span>
                </div>
                <div className="metric-body">
                  <strong>{loading ? "..." : card.value}</strong>
                  <small>Eligibility summary</small>
                </div>
              </div>
            ))}
          </div>

          <section className="donor-carousel-section glass-card" aria-label="Available donor carousel">
            <div className="donor-carousel-header">
              <div>
                <span className="eyebrow">DONOR NETWORK</span>
                <h3>Available donors</h3>
              </div>

              <div className="donor-carousel-actions">
                <button
                  type="button"
                  className="donor-carousel-button"
                  onClick={() => scrollDonorCarousel(-1)}
                  disabled={!donorScrollState.canScrollLeft}
                  aria-label="Scroll donors left"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="donor-carousel-button"
                  onClick={() => scrollDonorCarousel(1)}
                  disabled={!donorScrollState.canScrollRight}
                  aria-label="Scroll donors right"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div
              className="donor-carousel-shell"
              style={{
                "--left-fade": donorScrollState.canScrollLeft ? 1 : 0,
                "--right-fade": donorScrollState.canScrollRight ? 1 : 0
              }}
            >
              <div className="donor-carousel-scroll" 
                ref={donorCarouselRef}
                tabIndex={0}
                onKeyDown={handleDonorKeyDown}
                onPointerDown={handleDonorDragStart}
                onPointerMove={handleDonorDragMove}
                onPointerUp={handleDonorDragEnd}
                onPointerLeave={handleDonorDragEnd}
                onPointerCancel={handleDonorDragEnd}
                onWheel={(event) => {
                  if (event.shiftKey) {
                    event.preventDefault();
                    donorCarouselRef.current?.scrollBy({ left: event.deltaY, behavior: "auto" });
                  }
                }}
                style={{ touchAction: "pan-y" }}
              >
                {donorList.length === 0 ? (
                  <div className="donor-empty-state">No donor records available.</div>
                ) : (
                  donorList.map((donor) => {
                    const donorStatus = getDonorStatus(donor);
                    const matchScore = getMatchScore(donor);

                    return (
                      <article key={donor.id} className={`donor-card donor-status-${donorStatus.tone}`}>
                        <div className="donor-card-header">
                          <div className="donor-avatar">
                            <Droplet size={16} />
                          </div>
                          <span className={`donor-status-badge donor-status-${donorStatus.tone}`}>
                            {donorStatus.label}
                          </span>
                        </div>

                        <div className="donor-blood-row">
                          <span className="blood-pill blood-pill-sm">{donor.blood_group || "—"}</span>
                          {matchScore ? <span className="match-score">{matchScore}</span> : null}
                        </div>

                        <h4>{donor.full_name || "Unnamed donor"}</h4>

                        <div className="donor-meta-item">
                          <MapPin size={14} />
                          <span>{getDistanceText(donor)}</span>
                        </div>

                        <div className="donor-meta-item">
                          <CalendarClock size={14} />
                          <span>{formatDate(donor.last_donation_date)}</span>
                        </div>

                        <div className="donor-meta-item">
                          <ShieldCheck size={14} />
                          <span>{donor.donation_consent ? "Consent verified" : "Consent pending"}</span>
                        </div>

                        {matchScore ? (
                          <div className="donor-score-row">
                            <span>Matching score</span>
                            <strong>{matchScore}</strong>
                          </div>
                        ) : null}
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </section>

        <aside className="pulse-rail">
          <div className="rail-header">
            <span className="eyebrow">Emergency Pulse</span>
          </div>

          {emergencyBlocks.map((block) => {
            const Icon = block.icon;
            return (
              <button
                key={block.key}
                type="button"
                className={`pulse-card ${block.type} ${block.active ? "active" : ""}`}
                onClick={() => openMetricPanel(block.key)}
                aria-label={`Open ${block.label}`}
              >
                <div className="pulse-topline">
                  <span>{block.label}</span>
                  <span className="pulse-icon" style={{ color: block.accent }}>
                    <Icon size={16} />
                  </span>
                </div>
                <strong>{loading ? "..." : block.count}</strong>
                <small>{block.subtitle}</small>
                {block.active && <div className="pulse-ring" />}
              </button>
            );
          })}

          <div className="hospital-stock-summary-card">
            <div className="hospital-stock-summary-header">
              <Hospital size={16} />
              <span>HOSPITAL BLOOD NETWORK</span>
            </div>

            <div className="hospital-stock-summary-topline">
              <strong>{hospitalStockSummary.totalHospitals}</strong>
              <small>Hospitals Connected</small>
            </div>

            <div className="hospital-stock-summary-grid">
              {STOCK_GROUPS.map((group) => (
                <div key={group} className="summary-stock-line">
                  <span>{group}</span>
                  <strong>{hospitalStockSummary.groupTotals[group] || 0}</strong>
                </div>
              ))}
            </div>

            <div className="hospital-stock-summary-footers">
              <div>
                <span>LOW STOCK</span>
                <strong>{hospitalStockSummary.lowStock.join(", ") || "—"}</strong>
              </div>
              <div>
                <span>CRITICAL</span>
                <strong>{hospitalStockSummary.criticalStock.join(", ") || "—"}</strong>
              </div>
            </div>
          </div>

          <div className="pulse-feed">
            {recentEmergencies.slice(0, 3).map((entry) => (
              <div key={entry.id || entry.hospital_name} className="feed-item">
                <span className="feed-dot" />
                <div>
                  <strong>{entry.hospital_name || "Emergency Unit"}</strong>
                  <small>{entry.blood_group || "AB+"} • {entry.urgency || "URGENT"}</small>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {activeMetric && (
        <div className="command-panel-backdrop" onClick={closeMetricPanel}>
          <aside className="command-panel" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <span className="eyebrow">Command Detail</span>
                <h3>{metricDefinition.title}</h3>
              </div>

              <button type="button" className="close-panel" aria-label="Close panel" onClick={closeMetricPanel}>
                <X size={18} />
              </button>
            </div>

            {selectedDonor ? (
              <div className="donor-profile-panel">
                <div className="profile-header">
                  <div className="profile-avatar">{selectedDonor.full_name?.charAt(0) || "D"}</div>
                  <div>
                    <h4>{selectedDonor.full_name || "Donor Profile"}</h4>
                    <span>{selectedDonor.blood_group || "—"}</span>
                  </div>
                </div>

                <div className="profile-meta-grid">
                  <div>
                    <label>Availability</label>
                    <strong>{selectedDonor.is_available ? "Available" : "On Cooling"}</strong>
                  </div>
                  <div>
                    <label>Consent</label>
                    <strong>{selectedDonor.donation_consent ? "Granted" : "Pending"}</strong>
                  </div>
                  <div>
                    <label>Last Donation</label>
                    <strong>{formatDate(selectedDonor.last_donation_date)}</strong>
                  </div>
                  <div>
                    <label>Location</label>
                    <strong>{selectedDonor.latitude && selectedDonor.longitude ? "Coordinates set" : "Not geocoded"}</strong>
                  </div>
                </div>

                <div className="profile-section">
                  <h5>Donor profile</h5>
                  <ul>
                    <li><span>Phone</span><strong>{selectedDonor.phone || "Protected"}</strong></li>
                    <li><span>Email</span><strong>{selectedDonor.email || "Protected"}</strong></li>
                    <li><span>Consent status</span><strong>{selectedDonor.donation_consent ? "Verified" : "Pending review"}</strong></li>
                    <li><span>Emergency consent</span><strong>{selectedDonor.emergency_contact_consent ? "Authorized" : "Awaiting consent"}</strong></li>
                    <li><span>Screening status</span><strong>{selectedDonor.is_available ? "Eligible" : "Cooling / not eligible"}</strong></li>
                  </ul>
                </div>

                <div className="profile-section muted">
                  <h5>Protected medical information</h5>
                  <p>Detailed health conditions, medication records, and prior surgery data are intentionally withheld from this dashboard view to respect donor privacy and consent boundaries.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="panel-toolbar">
                  <div className="search-inline">
                    <Search size={15} />
                    <input
                      type="text"
                      value={panelQuery}
                      onChange={(event) => setPanelQuery(event.target.value)}
                      placeholder="Search donors, hospitals, blood groups..."
                    />
                  </div>

                  <div className="panel-filters">
                    {activeMetric === "total-donors" || activeMetric === "available-donors" ? (
                      <>
                        <select value={panelBloodFilter} onChange={(event) => setPanelBloodFilter(event.target.value)}>
                          {BLOOD_GROUPS.map((group) => (
                            <option key={group} value={group}>{group}</option>
                          ))}
                        </select>
                        <label className="checkbox-inline">
                          <input
                            type="checkbox"
                            checked={panelAvailabilityOnly}
                            onChange={(event) => setPanelAvailabilityOnly(event.target.checked)}
                          />
                          Available only
                        </label>
                      </>
                    ) : null}

                    {(activeMetric === "urgent-requests" || activeMetric === "active-requests" || activeMetric === "critical-requests" || activeMetric === "matching-now" || activeMetric === "donors-notified") && (
                      <>
                        <select value={panelBloodFilter} onChange={(event) => setPanelBloodFilter(event.target.value)}>
                          {BLOOD_GROUPS.map((group) => (
                            <option key={group} value={group}>{group}</option>
                          ))}
                        </select>
                        {activeMetric === "donors-notified" ? (
                          <select value={panelUrgencyFilter} onChange={(event) => setPanelUrgencyFilter(event.target.value)}>
                            {[
                              "ALL",
                              "PENDING",
                              "NOTIFIED",
                              "DELIVERED",
                              "ACCEPTED",
                              "DECLINED"
                            ].map((level) => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        ) : activeMetric !== "matching-now" ? (
                          <select value={panelUrgencyFilter} onChange={(event) => setPanelUrgencyFilter(event.target.value)}>
                            {URGENCY_LEVELS.map((level) => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>

                {filteredMetricItems.length === 0 ? (
                  <div className="empty-state">
                    <ShieldCheck size={26} />
                    <p>No records match the current command filters.</p>
                  </div>
                ) : (
                  <div className="detail-list">
                    {activeMetric === "total-donors" || activeMetric === "available-donors" ? (
                      filteredMetricItems.map((donor) => (
                        <button type="button" key={donor.id} className="detail-row donor-row" onClick={() => setSelectedDonorId(donor.id)}>
                          <div className="row-badge">{donor.blood_group || "—"}</div>
                          <div className="row-text">
                            <strong>{donor.full_name || "Unnamed donor"}</strong>
                            <span>{donor.phone || "Protected contact"}</span>
                          </div>
                          <div className="row-meta">
                            <small>{donor.is_available ? "Available" : "Cooling"}</small>
                            <span>{formatDate(donor.last_donation_date)}</span>
                          </div>
                        </button>
                      ))
                    ) : null}

                    {activeMetric === "urgent-requests" || activeMetric === "active-requests" || activeMetric === "critical-requests" || activeMetric === "matching-now" ? (
                      filteredMetricItems.map((request) => (
                        <button type="button" key={request.id} className="detail-row request-row" onClick={() => onInspectRequest(request.id)}>
                          <div className="row-badge critical-badge">{request.blood_group || "—"}</div>
                          <div className="row-text">
                            <strong>{request.hospital_name || "Hospital"}</strong>
                            <span>{request.urgency} • {request.status}</span>
                          </div>
                          <div className="row-meta">
                            <small>{request.units_required || 0} units</small>
                            <span>{formatClock(request.required_by)}</span>
                          </div>
                        </button>
                      ))
                    ) : null}

                    {activeMetric === "successful-matches" ? (
                      filteredMetricItems.map((match) => (
                        <div key={match.id} className="detail-row static-row">
                          <div className="row-badge success-badge">{match.donor_blood_group || match.req_blood_group || "—"}</div>
                          <div className="row-text">
                            <strong>{match.donor_name || "Donor"}</strong>
                            <span>{match.hospital_name || "Hospital"}</span>
                          </div>
                          <div className="row-meta">
                            <small>{match.total_score || 0} score</small>
                            <span>{match.status}</span>
                          </div>
                        </div>
                      ))
                    ) : null}

                    {activeMetric === "donors-notified" ? (
                      filteredMetricItems.map((match) => (
                        <div key={match.id} className="detail-row static-row">
                          <div className="row-badge info-badge">{match.donor_blood_group || match.req_blood_group || "—"}</div>
                          <div className="row-text">
                            <strong>{match.donor_name || "Donor"}</strong>
                            <span>{match.status || "PENDING"}</span>
                          </div>
                          <div className="row-meta">
                            <small>{match.hospital_name || "Request"}</small>
                            <span>{formatClock(match.created_at)}</span>
                          </div>
                        </div>
                      ))
                    ) : null}
                  </div>
                )}
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
