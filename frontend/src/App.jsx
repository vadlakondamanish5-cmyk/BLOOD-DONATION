import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { ArrowRight, ShieldCheck, Activity, Bot, User, Lock, Sparkles, LogIn, KeyRound } from "lucide-react";
import BloodDropIcon from "./components/BloodDropIcon";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import CustomMedicalCursor from "./components/CustomMedicalCursor";
import { api } from "./api/api";

// Lazy-loaded pages for bundle optimization & code splitting
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const EmergencyRequestsPage = lazy(() => import("./pages/EmergencyRequestsPage"));
const DonorNetworkPage = lazy(() => import("./pages/DonorNetworkPage"));
const RegisterDonorPage = lazy(() => import("./pages/RegisterDonorPage"));
const MatchInspectorPage = lazy(() => import("./pages/MatchInspectorPage"));
const LiveMapPage = lazy(() => import("./pages/LiveMapPage"));
const BloodTrackingPage = lazy(() => import("./pages/BloodTrackingPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ConsentVaultPage = lazy(() => import("./pages/ConsentVaultPage"));

// Lazy-loaded modals
const SOSModal = lazy(() => import("./components/SOSModal"));
const NewRequestModal = lazy(() => import("./components/NewRequestModal"));
const HospitalBloodStockModal = lazy(() => import("./components/HospitalBloodStockModal"));
const AuthModal = lazy(() => import("./components/AuthModal"));

function PageLoader() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "480px",
      gap: "18px",
      color: "var(--text-muted)"
    }}>
      <div className="logo-blood-pulse" style={{ display: "inline-flex" }}>
        <BloodDropIcon size={40} color="#ff2a55" variant="filled" animated />
      </div>
      <div style={{
        fontSize: "0.86rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--cyan-accent)",
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        <Bot size={16} />
        <span>Loading HexaVision Module...</span>
      </div>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [showLanding, setShowLanding] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [hospitalStock, setHospitalStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [landingPointer, setLandingPointer] = useState({ x: 50, y: 50 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const pointerRef = useRef({ x: 50, y: 50 });
  const rafRef = useRef(null);

  // Authentication & AI State
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("hexavision_auth_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [aiActive, setAiActive] = useState(() => {
    return Boolean(localStorage.getItem("hexavision_session_token"));
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Modals
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [isHospitalStockModalOpen, setIsHospitalStockModalOpen] = useState(false);
  const [selectedRequestIdForMatch, setSelectedRequestIdForMatch] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, reqsRes, stockRes] = await Promise.all([
        api.getDashboardStats().catch(() => ({ data: null })),
        api.getRequests().catch(() => ({ data: [] })),
        api.getHospitalBloodStock().catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data || null);
      setRequests(reqsRes.data || []);
      setHospitalStock(stockRes.data || []);
    } catch (err) {
      console.error("Error loading application telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Validate existing session token on mount
  useEffect(() => {
    const token = localStorage.getItem("hexavision_session_token");
    if (token) {
      api.getMe()
        .then((res) => {
          if (res?.success && res.user) {
            setUser(res.user);
            setAiActive(true);
          }
        })
        .catch(() => {
          // Keep local cached user for offline/demo robustness
        });
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener?.("change", updateMotionPreference);

    return () => mediaQuery.removeEventListener?.("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (!showLanding) return undefined;

    const handlePointerMove = (event) => {
      pointerRef.current = {
        x: (event.clientX / window.innerWidth) * 100,
        y: (event.clientY / window.innerHeight) * 100
      };

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          setLandingPointer(pointerRef.current);
          rafRef.current = null;
        });
      }
    };

    window.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [showLanding]);

  const criticalCount = parseInt(stats?.requests?.critical_active_requests || 0, 10);

  const handleInspectRequest = (id) => {
    setSelectedRequestIdForMatch(id);
    setActivePage("matches");
  };

  const handleNewRequestSuccess = (createdReq) => {
    loadData();
    setSelectedRequestIdForMatch(createdReq?.id || null);
    setActivePage("dashboard");
  };

  const enterDashboardDirectly = () => {
    if (!showLanding) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setShowLanding(false);
      setActivePage("dashboard");
      setIsTransitioning(false);
    }, 560);
  };

  const handleEnterDashboard = () => {
    if (!user) {
      // If user hasn't registered or logged in yet, prompt the clinical auth modal
      setIsAuthModalOpen(true);
    } else {
      enterDashboardDirectly();
    }
  };

  const handleAuthSuccess = (authedUser) => {
    setUser(authedUser);
    setAiActive(true);
    setIsAuthModalOpen(false);
    if (showLanding) {
      enterDashboardDirectly();
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("hexavision_auth_user");
    localStorage.removeItem("hexavision_session_token");
    setUser(null);
    setAiActive(false);
  };

  if (showLanding) {
    return (
      <>
        <CustomMedicalCursor active={showLanding} reducedMotion={reducedMotion} />
        <div
          className={`landing-shell ${isTransitioning ? "landing-shell-exit" : ""}`}
          style={{
            "--mouse-x": `${landingPointer.x}%`,
            "--mouse-y": `${landingPointer.y}%`
          }}
        >
          <div className="landing-grid">
            <div className="landing-copy">
              <button
                type="button"
                className="landing-logo-button"
                onClick={handleEnterDashboard}
                aria-label="Open HexaVision dashboard"
              >
                <span className="brand-hexagon logo-blood-pulse landing-logo-mark" aria-hidden="true">
                  <BloodDropIcon size={26} color="#ffffff" variant="filled" animated />
                </span>
                <span className="landing-logo-text">
                  <span className="brand-name">HEXAVISION</span>
                  <span className="brand-sub landing-tagline">Smart Blood Matching & Emergency Coordination</span>
                </span>
              </button>

              <div className="landing-badge">
                <Activity size={14} />
                Trauma-ready emergency coordination
              </div>

              <h1>Smart Blood Matching & Emergency Coordination</h1>
              <p>
                HexaVision connects hospitals with compatible blood donors during emergencies,
                helping fast-track critical transfusions with intelligent matching, live coordination,
                and secure donor visibility.
              </p>

              {/* Active Session indicator if user is already logged in */}
              {user ? (
                <div style={{
                  background: "rgba(0, 242, 254, 0.08)",
                  border: "1px solid rgba(0, 242, 254, 0.3)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  maxWidth: "460px",
                  marginBottom: "8px"
                }}>
                  <ShieldCheck size={18} color="var(--cyan-accent)" />
                  <div style={{ fontSize: "0.82rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Authorized Session: </span>
                    <strong style={{ color: "var(--text-primary)" }}>{user.full_name}</strong>
                    <span style={{ color: "var(--text-muted)" }}> ({user.organization || "Apollo Hospitals"})</span>
                  </div>
                </div>
              ) : null}

              <div className="landing-actions">
                {user ? (
                  <button type="button" className="btn btn-emergency" onClick={enterDashboardDirectly}>
                    <span>Enter Command Center</span>
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-emergency"
                      onClick={() => setIsAuthModalOpen(true)}
                    >
                      <KeyRound size={16} />
                      <span>Registration / Login</span>
                      <ArrowRight size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsAuthModalOpen(true)}
                      style={{ borderColor: "rgba(0, 242, 254, 0.4)" }}
                    >
                      <Bot size={16} color="var(--cyan-accent)" />
                      <span>Activate AI</span>
                    </button>
                  </>
                )}

                <div className="landing-proof">
                  <ShieldCheck size={16} />
                  Secure donor coordination
                </div>
              </div>
            </div>

            <div className="landing-visual" aria-hidden="true">
              <div className="medical-orbit orbit-one"></div>
              <div className="medical-orbit orbit-two"></div>
              <div className="medical-core">
                <div className="medical-sphere">
                  <div className="blood-cell-ring ring-one"></div>
                  <div className="blood-cell-ring ring-two"></div>
                  <div className="blood-cell-ring ring-three"></div>
                  <div className="blood-pulse"></div>
                </div>
              </div>

              {[...Array(14)].map((_, index) => (
                <span
                  key={index}
                  className={`blood-particle particle-${index + 1}`}
                  style={{
                    animationDelay: `${index * 0.35}s`,
                    transform: `translate3d(${(index % 4) * 26 - 20}px, ${(index % 5) * 18 - 30}px, 0)`
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onAuthSuccess={handleAuthSuccess}
          />
        </Suspense>
      </>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        criticalCount={criticalCount}
      />

      <div className="main-shell">
        <Header
          onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)}
          onOpenSOSModal={() => setIsSOSModalOpen(true)}
          onOpenNewRequestModal={() => setIsNewRequestModalOpen(true)}
          onOpenHospitalBloodStock={() => setIsHospitalStockModalOpen(true)}
          onNavigateToNotifications={() => setActivePage("notifications")}
          hospitalStock={hospitalStock}
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onSignOut={handleSignOut}
          aiActive={aiActive}
        />

        <main className="content-body">
          <Suspense fallback={<PageLoader />}>
            {(activePage === "dashboard" || activePage === "analytics") && (
              <DashboardPage
                stats={stats}
                requests={requests}
                hospitalStock={hospitalStock}
                loading={loading}
                onInspectRequest={handleInspectRequest}
                onOpenSOSModal={() => setIsSOSModalOpen(true)}
                onOpenNewRequestModal={() => setIsNewRequestModalOpen(true)}
                onNavigate={setActivePage}
                user={user}
                aiActive={aiActive}
              />
            )}

            {activePage === "requests" && (
              <EmergencyRequestsPage
                requests={requests}
                loading={loading}
                onInspectRequest={handleInspectRequest}
                onOpenNewRequestModal={() => setIsNewRequestModalOpen(true)}
                onRefresh={loadData}
              />
            )}

            {activePage === "donors" && (
              <DonorNetworkPage
                onNavigateToRegister={() => setActivePage("register")}
              />
            )}

            {activePage === "register" && (
              <RegisterDonorPage
                onRegistrationSuccess={() => {
                  loadData();
                  setActivePage("donors");
                }}
              />
            )}

            {activePage === "matches" && (
              <MatchInspectorPage
                requests={requests}
                selectedRequestId={selectedRequestIdForMatch}
                onRefreshData={loadData}
              />
            )}

            {activePage === "map" && (
              <LiveMapPage onInspectRequest={handleInspectRequest} />
            )}

            {activePage === "tracking" && (
              <BloodTrackingPage />
            )}

            {activePage === "notifications" && (
              <NotificationsPage />
            )}

            {activePage === "consent" && (
              <ConsentVaultPage />
            )}
          </Suspense>
        </main>
      </div>

      <Suspense fallback={null}>
        <SOSModal
          isOpen={isSOSModalOpen}
          onClose={() => setIsSOSModalOpen(false)}
          requests={requests}
          onSuccess={loadData}
        />

        <NewRequestModal
          isOpen={isNewRequestModalOpen}
          onClose={() => setIsNewRequestModalOpen(false)}
          onSuccess={handleNewRequestSuccess}
        />

        <HospitalBloodStockModal
          isOpen={isHospitalStockModalOpen}
          onClose={() => setIsHospitalStockModalOpen(false)}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </Suspense>
    </div>
  );
}
