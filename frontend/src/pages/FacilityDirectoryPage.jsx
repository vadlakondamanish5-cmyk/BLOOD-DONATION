import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Search, 
  Filter, 
  PlusCircle, 
  CheckCircle, 
  AlertTriangle, 
  Archive, 
  RotateCcw, 
  ExternalLink, 
  GitMerge, 
  ShieldAlert, 
  Phone, 
  MapPin, 
  Droplet,
  Layers,
  ChevronRight,
  ShieldCheck,
  Eye,
  RefreshCw
} from "lucide-react";
import { api } from "../api/api";
import DeboardModal from "../components/DeboardModal";
import OnboardFacilityModal from "../components/OnboardFacilityModal";
import MergeFacilityModal from "../components/MergeFacilityModal";

export default function FacilityDirectoryPage({ onSelectFacility }) {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("");
  const [showDeboarded, setShowDeboarded] = useState(true);

  // Modals
  const [selectedFacilityForDeboard, setSelectedFacilityForDeboard] = useState(null);
  const [selectedFacilityForMerge, setSelectedFacilityForMerge] = useState(null);
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const res = await api.getFacilities({
        search: search || undefined,
        facility_type: typeFilter || undefined,
        ownership: ownershipFilter || undefined,
        operating_status: statusFilter || undefined,
        verification_status: verificationFilter || undefined,
        include_deboarded: showDeboarded ? "true" : "false",
        limit: 300
      });
      setFacilities(res.data || []);
    } catch (err) {
      console.error("Error loading facilities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, [typeFilter, ownershipFilter, statusFilter, verificationFilter, showDeboarded]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFacilities();
  };

  const handleRestore = async (facility) => {
    if (!window.confirm(`Restore facility "${facility.facility_name}" to the active blood network? Inventory verification will be marked as pending.`)) {
      return;
    }

    try {
      setRestoringId(facility.id);
      await api.restoreFacility(facility.id, {
        reason: "Administrative reactivation by State Blood Transfusion Council"
      });
      fetchFacilities();
    } catch (err) {
      alert(`Error restoring facility: ${err.message}`);
    } finally {
      setRestoringId(null);
    }
  };

  const deboardedCount = facilities.filter(f => f.operating_status === "DEBOARDED").length;
  const activeCount = facilities.filter(f => f.operating_status !== "DEBOARDED" && f.is_active).length;

  return (
    <div className="dashboard-content" style={{ padding: "24px", maxWidth: "1520px", margin: "0 auto" }}>
      {/* Top Breadcrumb & Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "var(--cyan-accent)", marginBottom: "6px" }}>
            <span>India</span>
            <ChevronRight size={14} />
            <span>Telangana</span>
            <ChevronRight size={14} />
            <span>Hyderabad District</span>
            <ChevronRight size={14} />
            <span style={{ color: "var(--text-bright)", fontWeight: "600" }}>Command Board Facility Directory</span>
          </div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: "800", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <Building2 size={28} style={{ color: "var(--cyan-accent)" }} />
            <span>Unified Blood Network Facility Directory</span>
          </h1>
          <div style={{ fontSize: "0.86rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Authorized Directory of Blood Centres, Government & Private Hospitals, Medical Colleges & Attached Storage Units
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchFacilities}
            title="Refresh Directory"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsMergeModalOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", borderColor: "#a855f7", color: "#c084fc" }}
          >
            <GitMerge size={14} />
            <span>Merge Duplicates</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsOnboardModalOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <PlusCircle size={15} />
            <span>Onboard Facility</span>
          </button>
        </div>
      </div>

      {/* Overview Stats Bar */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "14px", 
        marginBottom: "22px" 
      }}>
        <div className="stat-card" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Active Facilities</div>
          <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "var(--cyan-accent)", marginTop: "4px" }}>{activeCount}</div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", marginTop: "2px" }}>Online & Transfusion Ready</div>
        </div>

        <div className="stat-card" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Deboarded Facilities</div>
          <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#ff2a55", marginTop: "4px" }}>{deboardedCount}</div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", marginTop: "2px" }}>Safely Soft-Deleted • Archived</div>
        </div>

        <div className="stat-card" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Blood Banks</div>
          <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#38ef7d", marginTop: "4px" }}>
            {facilities.filter(f => f.facility_type.includes("BLOOD_BANK")).length}
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", marginTop: "2px" }}>Govt & Private Licenced</div>
        </div>

        <div className="stat-card" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Storage Centres</div>
          <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#fbbf24", marginTop: "4px" }}>
            {facilities.filter(f => f.facility_type === "BLOOD_STORAGE_CENTRE" || f.is_attached_centre).length}
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", marginTop: "2px" }}>Attached Satellite Hubs</div>
        </div>
      </div>

      {/* Search & Filters Controls */}
      <div style={{ 
        background: "rgba(18, 22, 36, 0.7)", 
        border: "1px solid var(--border-color)", 
        borderRadius: "12px", 
        padding: "16px 20px", 
        marginBottom: "24px" 
      }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "14px", alignItems: "center" }}>
          {/* Search Input */}
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search facility name, code, area, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", paddingLeft: "36px", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
            />
          </div>

          {/* Type Filter */}
          <select
            className="form-control"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
          >
            <option value="">All Facility Types</option>
            <option value="GOVERNMENT_BLOOD_BANK">Government Blood Bank</option>
            <option value="PRIVATE_BLOOD_BANK">Private Blood Bank</option>
            <option value="GOVERNMENT_HOSPITAL">Government Hospital</option>
            <option value="PRIVATE_HOSPITAL">Private Hospital</option>
            <option value="MEDICAL_COLLEGE_HOSPITAL">Medical College Hospital</option>
            <option value="BLOOD_STORAGE_CENTRE">Blood Storage Centre</option>
          </select>

          {/* Ownership Filter */}
          <select
            className="form-control"
            value={ownershipFilter}
            onChange={(e) => setOwnershipFilter(e.target.value)}
            style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
          >
            <option value="">All Ownerships</option>
            <option value="GOVERNMENT">Government</option>
            <option value="PRIVATE">Private</option>
            <option value="CHARITABLE">Charitable</option>
            <option value="VOLUNTARY">Voluntary</option>
            <option value="SOCIETY">Society / Red Cross</option>
          </select>

          {/* Verification Status */}
          <select
            className="form-control"
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
          >
            <option value="">All Verification</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING_VERIFICATION">Pending Verification</option>
            <option value="UNVERIFIED">Unverified</option>
          </select>

          {/* Deboarded Toggle */}
          <label style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px", 
            fontSize: "0.82rem", 
            cursor: "pointer",
            background: showDeboarded ? "rgba(255, 42, 85, 0.12)" : "rgba(255, 255, 255, 0.04)",
            border: `1px solid ${showDeboarded ? "rgba(255, 42, 85, 0.4)" : "var(--border-color)"}`,
            padding: "8px 12px",
            borderRadius: "6px",
            color: showDeboarded ? "#ff6b8b" : "var(--text-muted)"
          }}>
            <input
              type="checkbox"
              checked={showDeboarded}
              onChange={(e) => setShowDeboarded(e.target.checked)}
              style={{ accentColor: "#ff2a55", width: "15px", height: "15px" }}
            />
            <span>Show Deboarded ({deboardedCount})</span>
          </label>
        </form>
      </div>

      {/* Facilities Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          <RefreshCw size={28} className="spin" style={{ color: "var(--cyan-accent)", marginBottom: "12px" }} />
          <div>Loading Facilities Directory...</div>
        </div>
      ) : facilities.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed var(--border-color)" }}>
          <Building2 size={40} style={{ opacity: 0.3, marginBottom: "12px" }} />
          <h4 style={{ color: "var(--text-bright)" }}>No Facilities Found</h4>
          <p style={{ fontSize: "0.85rem" }}>Try clearing search queries or adjusting category filters.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
          {facilities.map((fac) => {
            const isDeboarded = fac.operating_status === "DEBOARDED" || !fac.is_active;
            const isPendingVerification = fac.verification_status === "PENDING_VERIFICATION" || fac.verification_status === "UNVERIFIED";

            return (
              <div 
                key={fac.id}
                className="facility-card"
                style={{
                  background: isDeboarded 
                    ? "rgba(30, 16, 22, 0.6)" 
                    : "rgba(18, 22, 36, 0.75)",
                  border: isDeboarded 
                    ? "1px solid rgba(255, 42, 85, 0.35)" 
                    : "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease",
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                {/* Top Status Tags */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                      {/* Facility Type Badge */}
                      <span style={{ 
                        fontSize: "0.7rem", 
                        fontWeight: "700", 
                        padding: "3px 8px", 
                        borderRadius: "4px",
                        background: fac.ownership === "GOVERNMENT" ? "rgba(0, 242, 254, 0.15)" : "rgba(255, 255, 255, 0.08)",
                        color: fac.ownership === "GOVERNMENT" ? "var(--cyan-accent)" : "var(--text-bright)",
                        border: `1px solid ${fac.ownership === "GOVERNMENT" ? "rgba(0, 242, 254, 0.3)" : "rgba(255, 255, 255, 0.1)"}`
                      }}>
                        {fac.facility_type.replace(/_/g, " ")}
                      </span>

                      {/* Ownership Badge */}
                      <span style={{
                        fontSize: "0.7rem",
                        fontWeight: "600",
                        padding: "3px 7px",
                        borderRadius: "4px",
                        background: "rgba(180, 0, 255, 0.1)",
                        color: "#c084fc",
                        border: "1px solid rgba(180, 0, 255, 0.25)"
                      }}>
                        {fac.ownership}
                      </span>

                      {/* Attached Centre Tag */}
                      {fac.is_attached_centre && (
                        <span style={{ fontSize: "0.68rem", fontWeight: "600", padding: "2px 6px", borderRadius: "4px", background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24" }}>
                          Attached Unit
                        </span>
                      )}

                      {/* Duplicate Flag */}
                      {fac.possible_duplicate && (
                        <span style={{ fontSize: "0.68rem", fontWeight: "700", padding: "2px 6px", borderRadius: "4px", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                          ⚠️ DUPLICATE FLAG
                        </span>
                      )}
                    </div>

                    {/* Operating Status Badge */}
                    <div>
                      {isDeboarded ? (
                        <span className="badge" style={{ background: "rgba(255, 42, 85, 0.2)", color: "#ff2a55", border: "1px solid #ff2a55", fontSize: "0.72rem", fontWeight: "700" }}>
                          DEBOARDED
                        </span>
                      ) : isPendingVerification ? (
                        <span className="badge" style={{ background: "rgba(245, 158, 11, 0.2)", color: "#f59e0b", border: "1px solid #f59e0b", fontSize: "0.72rem", fontWeight: "700" }}>
                          PENDING VERIF
                        </span>
                      ) : (
                        <span className="badge" style={{ background: "rgba(56, 239, 125, 0.15)", color: "#38ef7d", border: "1px solid rgba(56, 239, 125, 0.4)", fontSize: "0.72rem", fontWeight: "700" }}>
                          ONLINE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Facility Name & Code */}
                  <div style={{ marginBottom: "10px" }}>
                    <h3 style={{ 
                      fontSize: "1.05rem", 
                      fontWeight: "700", 
                      color: isDeboarded ? "#ff8da1" : "#fff", 
                      margin: "0 0 4px 0",
                      lineHeight: "1.3"
                    }}>
                      {fac.facility_name}
                    </h3>
                    <div style={{ fontSize: "0.76rem", fontFamily: "monospace", color: "var(--cyan-accent)" }}>
                      {fac.facility_code}
                    </div>
                  </div>

                  {/* Location & Contact */}
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "5px", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={13} style={{ flexShrink: 0, color: "var(--cyan-accent)" }} />
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {fac.area ? `${fac.area}, Hyderabad` : fac.address}
                      </span>
                    </div>
                    {fac.phone && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Phone size={13} style={{ flexShrink: 0, color: "var(--text-dim)" }} />
                        <span>{fac.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Deboarded Reason Box */}
                  {isDeboarded && fac.deboard_reason && (
                    <div style={{ 
                      background: "rgba(255, 42, 85, 0.08)", 
                      border: "1px solid rgba(255, 42, 85, 0.25)", 
                      borderRadius: "6px", 
                      padding: "8px 10px", 
                      fontSize: "0.76rem", 
                      color: "#ff8da1",
                      marginBottom: "12px"
                    }}>
                      <div style={{ fontWeight: "700", marginBottom: "2px" }}>Reason for Deboarding:</div>
                      <div>{fac.deboard_reason}</div>
                    </div>
                  )}

                  {/* Inventory Quick Snapshot (if active) */}
                  {!isDeboarded && (
                    <div style={{ 
                      display: "flex", 
                      gap: "12px", 
                      background: "rgba(255, 255, 255, 0.03)", 
                      padding: "8px 12px", 
                      borderRadius: "6px",
                      marginBottom: "14px",
                      fontSize: "0.78rem"
                    }}>
                      <div>
                        <span style={{ color: "var(--text-dim)" }}>Available: </span>
                        <strong style={{ color: "#38ef7d" }}>{fac.available_inventory_units || 0} units</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-dim)" }}>Total Stock: </span>
                        <strong style={{ color: "var(--text-bright)" }}>{fac.total_inventory_units || 0}</strong>
                      </div>
                      {Number(fac.attached_centres_count) > 0 && (
                        <div>
                          <span style={{ color: "var(--text-dim)" }}>Attached: </span>
                          <strong style={{ color: "var(--cyan-accent)" }}>{fac.attached_centres_count} centres</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "12px" }}>
                  <button
                    className="btn btn-sm"
                    onClick={() => onSelectFacility(fac.id)}
                    style={{
                      background: "rgba(0, 242, 254, 0.12)",
                      color: "var(--cyan-accent)",
                      border: "1px solid rgba(0, 242, 254, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: "600"
                    }}
                  >
                    <Eye size={13} />
                    <span>View & Inventory</span>
                  </button>

                  <div style={{ display: "flex", gap: "8px" }}>
                    {isDeboarded ? (
                      <button
                        className="btn btn-sm"
                        onClick={() => handleRestore(fac)}
                        disabled={restoringId === fac.id}
                        style={{
                          background: "rgba(56, 239, 125, 0.15)",
                          color: "#38ef7d",
                          border: "1px solid rgba(56, 239, 125, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <RotateCcw size={12} className={restoringId === fac.id ? "spin" : ""} />
                        <span>Restore</span>
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm"
                        onClick={() => setSelectedFacilityForDeboard(fac)}
                        style={{
                          background: "rgba(255, 42, 85, 0.1)",
                          color: "#ff6b8b",
                          border: "1px solid rgba(255, 42, 85, 0.25)",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <Archive size={12} />
                        <span>Deboard</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <DeboardModal
        isOpen={Boolean(selectedFacilityForDeboard)}
        facility={selectedFacilityForDeboard}
        onClose={() => setSelectedFacilityForDeboard(null)}
        onSuccess={() => {
          setSelectedFacilityForDeboard(null);
          fetchFacilities();
        }}
      />

      <OnboardFacilityModal
        isOpen={isOnboardModalOpen}
        onClose={() => setIsOnboardModalOpen(false)}
        existingFacilities={facilities}
        onSuccess={() => {
          setIsOnboardModalOpen(false);
          fetchFacilities();
        }}
      />

      <MergeFacilityModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        facilities={facilities}
        onSuccess={() => {
          setIsMergeModalOpen(false);
          fetchFacilities();
        }}
      />
    </div>
  );
}
