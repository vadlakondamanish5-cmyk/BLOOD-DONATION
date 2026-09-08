import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Activity,
  Bot,
  User,
  Lock,
  Sparkles,
  LogIn,
  KeyRound,
  UserPlus,
  Building2,
  HeartHandshake
} from "lucide-react";
import BloodDropIcon from "./components/BloodDropIcon";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import CustomMedicalCursor from "./components/CustomMedicalCursor";
import { api } from "./api/api";
import { useRouter, navigate } from "./utils/router";

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
const FacilityDirectoryPage = lazy(() => import("./pages/FacilityDirectoryPage"));
const FacilityDetailPage = lazy(() => import("./pages/FacilityDetailPage"));
const BloodInventoryPage = lazy(() => import("./pages/BloodInventoryPage"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage"));

// Dedicated Role Portals & Auth Pages
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const DonorPortal = lazy(() => import("./pages/donor/DonorPortal"));
const HospitalPortal = lazy(() => import("./pages/hospital/HospitalPortal"));

// Lazy-loaded modals
const SOSModal = lazy(() => import("./components/SOSModal"));
const NewRequestModal = lazy(() => import("./components/NewRequestModal"));
const HospitalBloodStockModal = lazy(() => import("./components/HospitalBloodStockModal"));
const AuthModal = lazy(() => import("./components/AuthModal"));
const BloodKnowledgeAI = lazy(() => import("./components/BloodKnowledgeAI"));

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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [hospitalStock, setHospitalStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [landingPointer, setLandingPointer] = useState({ x: 50, y: 50 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const pointerRef = useRef({ x: 50, y: 50 });
  const rafRef = useRef(null);

  // Authentication State
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

  // URL Router with strict role guards
  const { path } = useRouter(user);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [isHospitalStockModalOpen, setIsHospitalStockModalOpen] = useState(false);
  const [selectedRequestIdForMatch, setSelectedRequestIdForMatch] = useState(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);

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

  // Validate existing session token on mount & sync user role
  useEffect(() => {
    const token = localStorage.getItem("hexavision_session_token");
    if (token) {
      api.getMe()
        .then((res) => {
          if (res?.success && res.user) {
            setUser(res.user);
            localStorage.setItem("hexavision_auth_user", JSON.stringify(res.user));
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
    if (path !== "/") return undefined;

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
  }, [path]);

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

  // Automatic role-based navigation after login or registration
  const handleAuthSuccess = (authedUser, token) => {
    setUser(authedUser);
    setAiActive(true);
    setIsAuthModalOpen(false);

    const role = String(authedUser?.role || "").toLowerCase();
    if (role === "donor") {
      navigate("/donor/dashboard");
    } else if (role === "hospital") {
      navigate("/hospital/dashboard");
    } else {
      navigate("/admin/dashboard");
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("hexavision_auth_user");
    localStorage.removeItem("hexavision_session_token");
    localStorage.removeItem("hexavision_account_type");
    setUser(null);
    setAiActive(false);
    navigate("/login");
  };

  // ====================================================
  // ROUTE 1: DEDICATED LOGIN PAGE (/login)
  // ====================================================
  if (path === "/login") {
    return (
      <Suspense fallback={<PageLoader />}>
        <LoginPage onAuthSuccess={handleAuthSuccess} />
      </Suspense>
    );
  }

  // ====================================================
  // ROUTE 2: DEDICATED REGISTRATION PAGE (/register)
  // ====================================================
  if (path === "/register") {
    return (
      <Suspense fallback={<PageLoader />}>
        <RegisterPage onAuthSuccess={handleAuthSuccess} />
      </Suspense>
    );
  }

  // ====================================================
  // ROUTE 3: DEDICATED DONOR PORTAL (/donor/*)
  // ====================================================
  if (path.startsWith("/donor") || (user && String(user.role).toLowerCase() === "donor" && path !== "/")) {
    return (
      <Suspense fallback={<PageLoader />}>
        <DonorPortal user={user} onSignOut={handleSignOut} />
      </Suspense>
    );
  }

  // ====================================================
  // ROUTE 4: DEDICATED HOSPITAL PORTAL (/hospital/*)
  // ====================================================
  if (path.startsWith("/hospital") || (user && String(user.role).toLowerCase() === "hospital" && path !== "/")) {
    return (
      <Suspense fallback={<PageLoader />}>
        <HospitalPortal user={user} onSignOut={handleSignOut} />
      </Suspense>
    );
  }

  // ====================================================
  // ROUTE 5: LANDING PAGE (Unauthenticated Root /)
  // ====================================================
  if (!user && path === "/") {
    return (
      <>
        <CustomMedicalCursor active={!isAuthModalOpen} reducedMotion={reducedMotion} />
        <div
          className="landing-shell"
          style={{
            "--mouse-x": `${landingPointer.x}%`,
            "--mouse-y": `${landingPointer.y}%`
          }}
        >
          <div className="landing-grid">
            <div className="landing-copy">
              <div className="landing-logo-button">
                <span className="brand-hexagon logo-blood-pulse landing-logo-mark" aria-hidden="true">
                  <BloodDropIcon size={26} color="#ffffff" variant="filled" animated />
                </span>
                <span className="landing-logo-text">
                  <span className="brand-name">HEXAVISION</span>
                  <span className="brand-sub landing-tagline">Smart Blood Matching & Emergency Coordination</span>
                </span>
              </div>

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

              <div className="landing-actions">
                <button
                  type="button"
                  id="btn-landing-login"
                  className="btn btn-emergency"
                  onClick={() => navigate("/login")}
                >
                  <KeyRound size={16} />
                  <span>Sign In / Login</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  id="btn-landing-register"
                  className="btn btn-secondary"
                  onClick={() => navigate("/register")}
                  style={{ borderColor: "rgba(0, 242, 254, 0.4)" }}
                >
                  <UserPlus size={16} color="var(--cyan-accent)" />
                  <span>Register Account</span>
                </button>

                <div className="landing-proof">
                  <ShieldCheck size={16} />
                  Role-based hospital & donor access
                </div>
              </div>

              {/* Blood Knowledge AI Landing Showcase */}
              <div className="blood-knowledge-entry-card">
                <div className="knowledge-card-header">
                  <span className="knowledge-icon-badge" role="img" aria-label="blood drop">🩸</span>
                  <div>
                    <div className="knowledge-title">Blood Knowledge AI</div>
                    <div className="knowledge-tagline">"Learn about blood, donation and blood safety"</div>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-open-knowledge-ai"
                  className="btn-knowledge-ask"
                  onClick={() => setIsKnowledgeModalOpen(true)}
                >
                  <Sparkles size={16} />
                  <span>Ask Blood Knowledge AI</span>
                </button>
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
            onNavigateToDonorRegister={() => navigate("/register")}
          />
          <BloodKnowledgeAI
            isOpen={isKnowledgeModalOpen}
            onClose={() => setIsKnowledgeModalOpen(false)}
          />
        </Suspense>
      </>
    );
  }

  // ====================================================
  // ROUTE 6: ADMIN COMMAND CENTER (/admin/*)
  // Preserves existing full admin / command center capabilities
  // ====================================================
  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        criticalCount={criticalCount}
        user={user}
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
                onNavigateToHome={() => setActivePage("dashboard")}
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

            {activePage === "facilities" && (
              <FacilityDirectoryPage
                onSelectFacility={(id) => {
                  setSelectedFacilityId(id);
                  setActivePage("facility-detail");
                }}
              />
            )}

            {activePage === "facility-detail" && (
              <FacilityDetailPage
                facilityId={selectedFacilityId}
                onBack={() => setActivePage("facilities")}
              />
            )}

            {activePage === "inventory" && (
              <BloodInventoryPage
                onSelectFacility={(id) => {
                  setSelectedFacilityId(id);
                  setActivePage("facility-detail");
                }}
                onNavigateToDirectory={() => setActivePage("facilities")}
              />
            )}

            {activePage === "audit-logs" && (
              <AuditLogsPage />
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
          onNavigateToDonorRegister={() => navigate("/register")}
        />

        <BloodKnowledgeAI
          isOpen={isKnowledgeModalOpen}
          onClose={() => setIsKnowledgeModalOpen(false)}
        />
      </Suspense>
    </div>
  );
}
