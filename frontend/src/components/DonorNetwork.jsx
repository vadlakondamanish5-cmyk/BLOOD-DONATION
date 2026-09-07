import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Calendar, 
  Check, 
  X, 
  Trash2, 
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { api } from "../services/api";

export default function DonorNetwork() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bloodGroup, setBloodGroup] = useState("ALL");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("eligible");
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // New Donor Form state
  const [newDonor, setNewDonor] = useState({
    full_name: "",
    phone: "",
    email: "",
    blood_group: "O+",
    donation_consent: true,
    emergency_contact_consent: true,
    is_available: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const loadDonors = async () => {
    try {
      setLoading(true);
      const params = {};
      if (bloodGroup !== "ALL") params.blood_group = bloodGroup;
      if (availableOnly) params.is_available = "true";
      if (search) params.search = search;

      const res = await api.getDonors(params);
      setDonors(res.data || []);
    } catch (err) {
      console.error("Error loading donors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonors();
  }, [bloodGroup, availableOnly, search]);

  const donorCounts = {
    eligible: donors.filter((donor) => donor.eligible || donor.eligibility_status === "ELIGIBLE").length,
    notEligible: donors.filter((donor) => !donor.eligible && donor.eligibility_status !== "ELIGIBLE").length
  };

  const visibleDonors = donors.filter((donor) => {
    const donorState = donor.eligible || donor.eligibility_status === "ELIGIBLE" ? "eligible" : "not_eligible";
    const matchesCategory = activeFilter === "eligible" ? donorState === "eligible" : donorState === "not_eligible";
    const matchesSearch = !search || donor.full_name?.toLowerCase().includes(search.toLowerCase()) || donor.phone?.includes(search);
    return matchesCategory && matchesSearch;
  });

  const handleToggleAvailability = async (donor) => {
    try {
      await api.updateDonor(donor.id, { is_available: !donor.is_available });
      setDonors((prev) =>
        prev.map((d) => (d.id === donor.id ? { ...d, is_available: !d.is_available } : d))
      );
    } catch (err) {
      console.error("Error toggling availability:", err);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!newDonor.full_name || !newDonor.phone) {
      setFormError("Name and phone number are required");
      return;
    }

    try {
      setSubmitting(true);
      await api.createDonor(newDonor);
      setSubmitting(false);
      setIsRegisterOpen(false);
      setNewDonor({
        full_name: "",
        phone: "",
        email: "",
        blood_group: "O+",
        donation_consent: true,
        emergency_contact_consent: true,
        is_available: true
      });
      loadDonors();
    } catch (err) {
      setSubmitting(false);
      setFormError(err.message || "Failed to register donor");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this donor?")) return;
    try {
      await api.deleteDonor(id);
      loadDonors();
    } catch (err) {
      console.error("Error deleting donor:", err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "800", letterSpacing: "-0.5px" }}>Donor Network & Registry</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Consent-verified donor network with explicit emergency dispatch permissions.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary" onClick={loadDonors}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setIsRegisterOpen(true)}>
            <Plus size={18} /> Register Consented Donor
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: "16px 20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1", minWidth: "220px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "12px", color: "var(--text-muted)" }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "36px" }}
              placeholder="Search donor name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { key: "eligible", label: "Eligible", tone: "green" },
              { key: "not_eligible", label: "Not Eligible", tone: "red" }
            ].map((option) => {
              const isActive = activeFilter === option.key;
              const count = option.key === "eligible" ? donorCounts.eligible : donorCounts.notEligible;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setActiveFilter(option.key)}
                  style={{
                    border: isActive ? "1px solid transparent" : "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                    padding: "10px 16px",
                    minWidth: "170px",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: isActive
                      ? option.tone === "green"
                        ? "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.12))"
                        : "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.12))"
                      : "rgba(15, 23, 42, 0.7)",
                    color: option.tone === "green" ? "#bbf7d0" : "#fecaca",
                  }}
                >
                  {option.tone === "green" ? "🟢" : "🔴"} {option.label} ({count})
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
            {["ALL", "O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"].map((bg) => (
              <button
                key={bg}
                className={`btn btn-sm ${bloodGroup === bg ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setBloodGroup(bg)}
                style={{ fontSize: "0.75rem", padding: "5px 10px" }}
              >
                {bg}
              </button>
            ))}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "var(--cyan-accent)" }}
            />
            Available Only
          </label>
        </div>
      </div>

      {/* Donors Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
          <div className="pulse-dot-cyan" style={{ margin: "0 auto 12px" }}></div>
          <p>Loading donor registry...</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Blood</th>
                <th>Donor Details</th>
                <th>Contact</th>
                <th>Consent Status</th>
                <th>Last Donated</th>
                <th>Availability</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleDonors.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span className="blood-pill blood-pill-sm">{d.blood_group}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: "700" }}>{d.full_name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      ID #{d.id} • Bangalore Metro
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Phone size={13} color="var(--text-muted)" /> {d.phone}
                    </div>
                    {d.email && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                        <Mail size={13} /> {d.email}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span className="badge badge-normal" style={{ width: "fit-content", fontSize: "0.68rem" }}>
                        ✓ General Consent
                      </span>
                      {d.emergency_contact_consent && (
                        <span className="badge badge-urgent" style={{ width: "fit-content", fontSize: "0.68rem" }}>
                          ⚡ Critical SOS Ready
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {d.last_donation_date ? new Date(d.last_donation_date).toLocaleDateString() : "Never (Eligible)"}
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${d.is_available ? "badge-normal" : "btn-secondary"}`}
                      onClick={() => handleToggleAvailability(d)}
                      style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                      title="Click to toggle availability"
                    >
                      {d.is_available ? "Active / Ready" : "Cooling Period"}
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn-close"
                      style={{ color: "var(--text-muted)" }}
                      onClick={() => handleDelete(d.id)}
                      title="Remove donor"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Register Donor Modal */}
      {isRegisterOpen && (
        <div className="modal-overlay" onClick={() => setIsRegisterOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Users size={22} color="var(--cyan-accent)" />
                Register New Consented Donor
              </div>
              <button className="btn-close" onClick={() => setIsRegisterOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: "rgba(255, 59, 92, 0.15)", border: "1px solid rgba(255, 59, 92, 0.3)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#ff4d6d", fontSize: "0.85rem" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ramesh Kumar"
                  value={newDonor.full_name}
                  onChange={(e) => setNewDonor({ ...newDonor, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Phone (Unique)</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+91 98450 XXXXX"
                    value={newDonor.phone}
                    onChange={(e) => setNewDonor({ ...newDonor, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select
                    className="form-select"
                    value={newDonor.blood_group}
                    onChange={(e) => setNewDonor({ ...newDonor, blood_group: e.target.value })}
                  >
                    {["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email (Optional)</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="donor@example.com"
                  value={newDonor.email}
                  onChange={(e) => setNewDonor({ ...newDonor, email: e.target.value })}
                />
              </div>

              {/* Consent checkmarks */}
              <div style={{ background: "rgba(0, 242, 254, 0.06)", border: "1px solid var(--border-active)", borderRadius: "var(--radius-md)", padding: "16px", marginBottom: "20px" }}>
                <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "var(--cyan-accent)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShieldCheck size={16} /> Consent-First Mandatory Declarations
                </div>

                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", fontSize: "0.82rem", marginBottom: "10px" }}>
                  <input
                    type="checkbox"
                    checked={newDonor.donation_consent}
                    onChange={(e) => setNewDonor({ ...newDonor, donation_consent: e.target.checked })}
                    style={{ marginTop: "2px", accentColor: "var(--cyan-accent)" }}
                  />
                  <span>
                    <strong>General Donation Consent:</strong> I voluntarily consent to being matched with hospitals requiring blood donations.
                  </span>
                </label>

                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", fontSize: "0.82rem" }}>
                  <input
                    type="checkbox"
                    checked={newDonor.emergency_contact_consent}
                    onChange={(e) => setNewDonor({ ...newDonor, emergency_contact_consent: e.target.checked })}
                    style={{ marginTop: "2px", accentColor: "var(--cyan-accent)" }}
                  />
                  <span>
                    <strong>Emergency Critical SOS Broadcast:</strong> I consent to receiving high-priority SMS alerts during trauma or critical hospital emergencies.
                  </span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsRegisterOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Registering..." : "Complete Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
