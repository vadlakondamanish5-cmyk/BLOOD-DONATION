import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, ShieldCheck, Activity } from "lucide-react";
import BloodDropIcon from "./components/BloodDropIcon";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import SOSModal from "./components/SOSModal";
import NewRequestModal from "./components/NewRequestModal";
import HospitalBloodStockModal from "./components/HospitalBloodStockModal";
import CustomMedicalCursor from "./components/CustomMedicalCursor";

// Pages
import DashboardPage from "./pages/DashboardPage";
import EmergencyRequestsPage from "./pages/EmergencyRequestsPage";
import DonorNetworkPage from "./pages/DonorNetworkPage";
import RegisterDonorPage from "./pages/RegisterDonorPage";
import MatchInspectorPage from "./pages/MatchInspectorPage";
import LiveMapPage from "./pages/LiveMapPage";
import NotificationsPage from "./pages/NotificationsPage";
import ConsentVaultPage from "./pages/ConsentVaultPage";

import { api } from "./api/api";

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [showLanding, setShowLanding] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [hospitalStock, setHospitalStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [landingPointer, setLandingPointer] = useState({ x: 50, y: 50 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const pointerRef = useRef({ x: 50, y: 50 });
  const rafRef = useRef(null);

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

  const handleEnterDashboard = () => {
    if (!showLanding) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setShowLanding(false);
      setActivePage("dashboard");
    }, 560);
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

            <div className="landing-actions">
              <button type="button" className="btn btn-emergency" onClick={handleEnterDashboard}>
                Enter dashboard <ArrowRight size={16} />
              </button>
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
        />

        <main className="content-body">
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

          {activePage === "notifications" && (
            <NotificationsPage />
          )}

          {activePage === "consent" && (
            <ConsentVaultPage />
          )}
        </main>
      </div>

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
    </div>
  );
}
