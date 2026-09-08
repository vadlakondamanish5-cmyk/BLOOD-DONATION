import React, { useState } from "react";
import { PlusCircle, X, AlertTriangle, Building2, CheckCircle2, ShieldCheck, MapPin, Phone, Mail, FileText } from "lucide-react";

const FACILITY_TYPES = [
  { value: "GOVERNMENT_BLOOD_BANK", label: "Government Blood Bank" },
  { value: "PRIVATE_BLOOD_BANK", label: "Private Blood Bank" },
  { value: "GOVERNMENT_HOSPITAL", label: "Government Hospital" },
  { value: "PRIVATE_HOSPITAL", label: "Private Hospital" },
  { value: "MEDICAL_COLLEGE_HOSPITAL", label: "Medical College Hospital" },
  { value: "BLOOD_STORAGE_CENTRE", label: "Blood Storage Centre (Attached)" },
  { value: "OTHER_AUTHORIZED_FACILITY", label: "Other Authorized Clinical Facility" }
];

const OWNERSHIP_TYPES = [
  { value: "GOVERNMENT", label: "Government" },
  { value: "PRIVATE", label: "Private" },
  { value: "CHARITABLE", label: "Charitable Trust" },
  { value: "VOLUNTARY", label: "Voluntary Non-Profit" },
  { value: "SOCIETY", label: "Registered Red Cross / Society" },
  { value: "OTHER", label: "Other Autonomous Body" }
];

export default function OnboardFacilityModal({ isOpen, onClose, onSuccess, existingFacilities = [] }) {
  const [formData, setFormData] = useState({
    facility_name: "",
    facility_type: "GOVERNMENT_BLOOD_BANK",
    ownership: "GOVERNMENT",
    parent_facility_id: "",
    is_attached_centre: false,
    country: "India",
    state: "Telangana",
    district: "Hyderabad",
    city: "Hyderabad",
    area: "",
    address: "",
    latitude: "17.3850",
    longitude: "78.4867",
    phone: "",
    email: "",
    contact_person: "",
    established_year: "2015",
    registration_number: "",
    license_information: "",
    authorized_contact: "",
    website: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    if (duplicateWarning) setDuplicateWarning(null);
  };

  const handleSubmit = async (e, forceCreate = false) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...formData,
        established_year: formData.established_year ? parseInt(formData.established_year, 10) : null,
        latitude: parseFloat(formData.latitude) || 17.3850,
        longitude: parseFloat(formData.longitude) || 78.4867,
        parent_facility_id: formData.parent_facility_id ? parseInt(formData.parent_facility_id, 10) : null,
        force_create: forceCreate
      };

      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";
      const res = await fetch(`${apiBase}/facilities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 409 && data.duplicateDetected) {
        setDuplicateWarning(data);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || "Failed to onboard facility");
      }

      if (onSuccess) onSuccess(data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: "780px", maxHeight: "90vh", overflowY: "auto" }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ 
              width: "42px", 
              height: "42px", 
              borderRadius: "10px", 
              background: "rgba(0, 242, 254, 0.15)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "var(--cyan-accent)",
              border: "1px solid rgba(0, 242, 254, 0.3)"
            }}>
              <Building2 size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.24rem", fontWeight: "700", color: "#fff" }}>
                Onboard Clinical Facility
              </h3>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Register Blood Bank, Hospital Transfusion Unit, or Storage Centre
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        {/* Verification Status Notice */}
        <div style={{
          background: "rgba(255, 170, 0, 0.08)",
          border: "1px solid rgba(255, 170, 0, 0.3)",
          borderRadius: "8px",
          padding: "10px 14px",
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
          fontSize: "0.82rem",
          color: "#ffaa00"
        }}>
          <ShieldCheck size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>Regulatory Standard:</strong> Newly onboarded facilities are initially placed in <strong>Pending Verification</strong> status until drug controller licenses and cold-storage validations are officially inspected.
          </span>
        </div>

        {/* Duplicate Warning Prompt */}
        {duplicateWarning && (
          <div style={{
            background: "rgba(255, 42, 85, 0.12)",
            border: "1px solid rgba(255, 42, 85, 0.4)",
            borderRadius: "8px",
            padding: "14px",
            marginBottom: "18px",
            color: "#ff6b8b"
          }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", fontWeight: "700", marginBottom: "6px" }}>
              <AlertTriangle size={18} />
              <span>Possible Duplicate Facility Detected!</span>
            </div>
            <p style={{ fontSize: "0.84rem", margin: "0 0 10px 0", color: "var(--text-normal)" }}>
              {duplicateWarning.message}
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: "var(--cyan-accent)", color: "#000", fontWeight: "700" }}
                onClick={() => handleSubmit(null, true)}
                disabled={loading}
              >
                Force Onboard Regardless
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setDuplicateWarning(null)}
              >
                Modify Details
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: "rgba(255, 42, 85, 0.1)",
            border: "1px solid rgba(255, 42, 85, 0.3)",
            borderRadius: "8px",
            padding: "10px 14px",
            color: "#ff6b8b",
            fontSize: "0.84rem",
            marginBottom: "16px"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            {/* Facility Name */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
                Facility Legal Name <span style={{ color: "#ff2a55" }}>*</span>
              </label>
              <input
                type="text"
                name="facility_name"
                className="form-control"
                placeholder="e.g. Osmania General Hospital State Blood Centre"
                value={formData.facility_name}
                onChange={handleChange}
                required
                style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
              />
            </div>

            {/* Facility Type */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
                Facility Classification <span style={{ color: "#ff2a55" }}>*</span>
              </label>
              <select
                name="facility_type"
                className="form-control"
                value={formData.facility_type}
                onChange={handleChange}
                style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
              >
                {FACILITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Ownership */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
                Governance & Ownership <span style={{ color: "#ff2a55" }}>*</span>
              </label>
              <select
                name="ownership"
                className="form-control"
                value={formData.ownership}
                onChange={handleChange}
                style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
              >
                {OWNERSHIP_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Registration Number */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
                Drug License / Registration No.
              </label>
              <input
                type="text"
                name="registration_number"
                className="form-control"
                placeholder="e.g. TS/HYD/BB/2022/089"
                value={formData.registration_number}
                onChange={handleChange}
                style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
              />
            </div>

            {/* Established Year */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
                Year Established
              </label>
              <input
                type="number"
                name="established_year"
                className="form-control"
                placeholder="e.g. 2005"
                value={formData.established_year}
                onChange={handleChange}
                style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
              />
            </div>

            {/* Attached Centre Checkbox & Parent */}
            <div style={{ gridColumn: "span 2", display: "flex", gap: "16px", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "6px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.84rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="is_attached_centre"
                  checked={formData.is_attached_centre}
                  onChange={handleChange}
                  style={{ accentColor: "var(--cyan-accent)", width: "16px", height: "16px" }}
                />
                <span>Is Attached / Satellite Storage Centre?</span>
              </label>

              {formData.is_attached_centre && (
                <div style={{ flex: 1 }}>
                  <select
                    name="parent_facility_id"
                    className="form-control"
                    value={formData.parent_facility_id}
                    onChange={handleChange}
                    style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
                  >
                    <option value="">Select Parent Blood Bank...</option>
                    {existingFacilities.map((f) => (
                      <option key={f.id} value={f.id}>{f.facility_name} ({f.facility_code})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Area */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
                Area / Sub-locality
              </label>
              <input
                type="text"
                name="area"
                className="form-control"
                placeholder="e.g. Jubilee Hills, Banjara Hills"
                value={formData.area}
                onChange={handleChange}
                style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
              />
            </div>

            {/* City */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
                City & State
              </label>
              <input
                type="text"
                value="Hyderabad, Telangana"
                disabled
                className="form-control"
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", borderColor: "var(--border-color)" }}
              />
            </div>

            {/* Address */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
                Complete Address <span style={{ color: "#ff2a55" }}>*</span>
              </label>
              <input
                type="text"
                name="address"
                className="form-control"
                placeholder="e.g. Road No. 72, Opposite Jubilee Checkpost, Hyderabad"
                value={formData.address}
                onChange={handleChange}
                required
                style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
              />
            </div>

            {/* Lat / Lon */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
                GPS Latitude
              </label>
              <input
                type="text"
                name="latitude"
                className="form-control"
                value={formData.latitude}
                onChange={handleChange}
                style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
                GPS Longitude
              </label>
              <input
                type="text"
                name="longitude"
                className="form-control"
                value={formData.longitude}
                onChange={handleChange}
                style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
                Contact Phone
              </label>
              <input
                type="text"
                name="phone"
                className="form-control"
                placeholder="+91 40 ..."
                value={formData.phone}
                onChange={handleChange}
                style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
                Official Email
              </label>
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="bloodbank@facility.in"
                value={formData.email}
                onChange={handleChange}
                style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
              />
            </div>

            {/* Contact Person */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
                HOD / Medical Superintendent / Transfusion Chief
              </label>
              <input
                type="text"
                name="contact_person"
                className="form-control"
                placeholder="Dr. Full Name"
                value={formData.contact_person}
                onChange={handleChange}
                style={{ width: "100%", background: "var(--bg-dark)", color: "var(--text-bright)", borderColor: "var(--border-color)" }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <PlusCircle size={16} />
              <span>{loading ? "Onboarding Facility..." : "Complete Onboarding"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
