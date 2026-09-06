import React, { useEffect, useMemo, useState } from "react";
import { Activity, ChevronDown, Droplets, Hospital, X } from "lucide-react";
import { api } from "../api/api";
import { BLOOD_GROUP_OPTIONS, formatStockUnits, getBloodStockStatus } from "../utils/bloodStock";

const toNumber = (value) => Number(value || 0);

export default function HospitalBloodStockModal({ isOpen, onClose }) {
  const [stockData, setStockData] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState("ALL");
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("ALL");
  const [selectedGroupDetail, setSelectedGroupDetail] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const fetchStock = async () => {
      try {
        const res = await api.getHospitalBloodStock();
        setStockData(res.data || []);
      } catch (error) {
        console.error("Error loading hospital blood stock:", error);
      }
    };

    fetchStock();
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const summary = useMemo(() => {
    const hospitalCount = stockData.length;
    let totalUnits = 0;
    let lowStock = 0;
    let criticalStock = 0;

    stockData.forEach((hospital) => {
      const bloodStock = hospital.blood_stock || {};
      Object.values(bloodStock).forEach((units) => {
        const numericUnits = toNumber(units);
        totalUnits += numericUnits;

        if (numericUnits > 0 && numericUnits <= 2) criticalStock += 1;
        if (numericUnits > 0 && numericUnits <= 5) lowStock += 1;
      });
    });

    return { hospitalCount, totalUnits, lowStock, criticalStock };
  }, [stockData]);

  const visibleHospitals = useMemo(() => {
    const filtered = selectedHospitalId === "ALL"
      ? stockData
      : stockData.filter((hospital) => String(hospital.hospital_id) === String(selectedHospitalId));

    if (selectedBloodGroup === "ALL") return filtered;

    return filtered
      .map((hospital) => ({
        ...hospital,
        blood_stock: {
          [selectedBloodGroup]: hospital.blood_stock?.[selectedBloodGroup] || 0
        }
      }));
  }, [selectedBloodGroup, selectedHospitalId, stockData]);

  const selectedHospitalName = selectedHospitalId === "ALL"
    ? "All Hospitals"
    : stockData.find((hospital) => String(hospital.hospital_id) === String(selectedHospitalId))?.hospital_name || "All Hospitals";

  return (
    <>
      {isOpen && (
        <div className="modal-backdrop stock-modal-backdrop" onClick={onClose}>
          <div className="hospital-stock-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Hospital blood stock inventory network">
            <div className="stock-modal-header">
              <div>
                <div className="eyebrow">LIVE INVENTORY NETWORK</div>
                <h2>HOSPITAL BLOOD STOCK</h2>
                <p>Real-time blood availability across connected hospitals</p>
              </div>

              <button type="button" className="btn-close" onClick={onClose} aria-label="Close hospital blood stock panel">
                <X size={18} />
              </button>
            </div>

            <div className="stock-metrics-row">
              <div className="stock-metric-box">
                <span>TOTAL HOSPITALS</span>
                <strong>{summary.hospitalCount}</strong>
              </div>
              <div className="stock-metric-box">
                <span>TOTAL BLOOD UNITS</span>
                <strong>{summary.totalUnits}</strong>
              </div>
              <div className="stock-metric-box">
                <span>LOW STOCK</span>
                <strong>{summary.lowStock}</strong>
              </div>
              <div className="stock-metric-box">
                <span>CRITICAL STOCK</span>
                <strong>{summary.criticalStock}</strong>
              </div>
            </div>

            <div className="stock-filter-row">
              <div className="stock-filter-select-wrap">
                <label htmlFor="hospital-stock-filter">Hospital</label>
                <div className="stock-select-shell">
                  <select id="hospital-stock-filter" value={selectedHospitalId} onChange={(event) => setSelectedHospitalId(event.target.value)} aria-label="Select a hospital stock view">
                    <option value="ALL">ALL HOSPITALS</option>
                    {stockData.map((hospital) => (
                      <option key={hospital.hospital_id} value={hospital.hospital_id}>{hospital.hospital_name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>

              <div className="stock-group-filter-wrap" aria-label="Blood group filter">
                <span>Blood Group</span>
                <div className="stock-group-filter-list">
                  {[
                    "ALL",
                    ...BLOOD_GROUP_OPTIONS
                  ].map((group) => (
                    <button
                      key={group}
                      type="button"
                      className={`stock-toggle ${selectedBloodGroup === group ? "active" : ""}`}
                      onClick={() => {
                        setSelectedBloodGroup(group);
                        if (group !== "ALL") {
                          setSelectedGroupDetail({
                            hospital: selectedHospitalName,
                            blood_group: group,
                            units: toNumber(visibleHospitals[0]?.blood_stock?.[group] || 0)
                          });
                        } else {
                          setSelectedGroupDetail(null);
                        }
                      }}
                      aria-pressed={selectedBloodGroup === group}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="stock-body-layout">
              <div className="stock-card-grid">
                {visibleHospitals.length === 0 ? (
                  <div className="empty-state compact-empty">
                    <Activity size={22} />
                    <p>No inventory data available for the selected filter.</p>
                  </div>
                ) : (
                  visibleHospitals.map((hospital) => {
                    const activeGroups = selectedBloodGroup === "ALL" ? BLOOD_GROUP_OPTIONS : [selectedBloodGroup];
                    const totalUnits = activeGroups.reduce((sum, group) => sum + toNumber(hospital.blood_stock?.[group]), 0);

                    return (
                      <div key={hospital.hospital_id} className="stock-hospital-card">
                        <div className="stock-hospital-header">
                          <div className="stock-hospital-title-wrap">
                            <div className="stock-hospital-icon"><Hospital size={16} /></div>
                            <div>
                              <h3>{hospital.hospital_name}</h3>
                              <span>{hospital.hospital_name.includes("Bannerghatta") ? "BANGALORE" : "BLOOD NETWORK"}</span>
                            </div>
                          </div>
                          <div className="stock-live-pill"><span className="live-dot" /> LIVE</div>
                        </div>

                        <div className="stock-grid-items">
                          {activeGroups.map((group) => {
                            const units = toNumber(hospital.blood_stock?.[group]);
                            const status = getBloodStockStatus(units);
                            const barWidth = Math.min(100, Math.max(8, units * 12));

                            return (
                              <button
                                key={`${hospital.hospital_id}-${group}`}
                                type="button"
                                className="stock-bar-row"
                                onClick={() => setSelectedGroupDetail({ hospital: hospital.hospital_name, blood_group: group, units, status: status.label, last_updated: hospital.last_updated || new Date().toISOString() })}
                                aria-label={`View blood stock details for ${group} at ${hospital.hospital_name}`}
                              >
                                <div className="stock-bar-label-row">
                                  <span className="stock-group-name">{group}</span>
                                  <span className="stock-group-total">{units}</span>
                                </div>
                                <div className="stock-bar-track">
                                  <span className={`stock-bar-fill ${status.tone}`} style={{ width: `${barWidth}%` }} />
                                </div>
                                <div className="stock-bar-meta-row">
                                  <span className={`stock-status-text ${status.tone}`}>{status.label}</span>
                                  <span>{units === 1 ? "1 unit" : `${units} units`}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="stock-card-footer">
                          <span>{totalUnits} total units</span>
                          <button type="button" className="stock-card-link" onClick={() => setSelectedGroupDetail({ hospital: hospital.hospital_name, blood_group: selectedBloodGroup === "ALL" ? "ALL" : selectedBloodGroup, units: totalUnits, status: "SUMMARY" })}>View Details</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {selectedGroupDetail && (
                <aside className="stock-detail-panel">
                  <div className="stock-detail-header">
                    <div className="stock-detail-icon"><Droplets size={18} /></div>
                    <div>
                      <span>Blood Group</span>
                      <h4>{selectedGroupDetail.blood_group}</h4>
                    </div>
                  </div>

                  <div className="stock-detail-metrics">
                    <div>
                      <label>Current Stock</label>
                      <strong>{selectedGroupDetail.units ?? 0} units</strong>
                    </div>
                    <div>
                      <label>Status</label>
                      <strong>{selectedGroupDetail.status || getBloodStockStatus(selectedGroupDetail.units || 0).label}</strong>
                    </div>
                  </div>

                  <div className="stock-detail-meta">
                    <p><strong>Hospital:</strong> {selectedGroupDetail.hospital}</p>
                    <p><strong>Last Updated:</strong> {selectedGroupDetail.last_updated ? new Date(selectedGroupDetail.last_updated).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—"}</p>
                  </div>

                  <div className="stock-detail-range">
                    <span className="stock-detail-tag">{selectedGroupDetail.units && selectedGroupDetail.units <= 0 ? "OUT OF STOCK" : getBloodStockStatus(selectedGroupDetail.units || 0).label}</span>
                    <span className="stock-detail-tag muted">{formatStockUnits(selectedGroupDetail.units || 0)}</span>
                  </div>
                </aside>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
