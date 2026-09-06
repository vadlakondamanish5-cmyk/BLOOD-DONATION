import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  Droplet,
  MessageSquareText,
  Minus,
  Plus,
  Send,
  X
} from "lucide-react";
import { api } from "../api/api";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const URGENCY_OPTIONS = [
  { value: "CRITICAL", description: "Immediate response", accent: "#ff4d6d", glow: "rgba(255, 77, 109, 0.35)" },
  { value: "URGENT", description: "Priority response", accent: "#fbbf24", glow: "rgba(251, 191, 36, 0.3)" },
  { value: "NORMAL", description: "Standard response", accent: "#34d399", glow: "rgba(52, 211, 153, 0.28)" }
];

const toDateTimeLocalValue = (date) => {
  const value = date instanceof Date ? date : new Date();
  const pad = (num) => String(num).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
};

const getDefaultRequiredBy = (urgencyValue = "NORMAL") => {
  const now = new Date();
  const hoursToAdd = urgencyValue === "CRITICAL" ? 2 : urgencyValue === "URGENT" ? 8 : 24;
  now.setHours(now.getHours() + hoursToAdd);
  return toDateTimeLocalValue(now);
};

export default function NewRequestModal({ isOpen, onClose, onSuccess }) {
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [hospitalError, setHospitalError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cursor, setCursor] = useState({ x: 50, y: 50 });
  const [form, setForm] = useState({
    hospitalId: "",
    bloodGroup: "A+",
    unitsRequired: 2,
    urgency: "NORMAL",
    requiredBy: getDefaultRequiredBy("NORMAL"),
    notes: ""
  });
  const [errors, setErrors] = useState({});

  const selectedHospital = useMemo(
    () => hospitals.find((hospital) => String(hospital.id) === String(form.hospitalId)) || null,
    [hospitals, form.hospitalId]
  );

  const previewText = useMemo(() => {
    const hospitalName = selectedHospital?.hospital_name || "Select hospital";
    const requiredDate = form.requiredBy ? new Date(form.requiredBy) : null;
    const urgencyLabel = form.urgency || "NORMAL";

    return {
      hospitalName,
      requiredText: requiredDate && !Number.isNaN(requiredDate.getTime())
        ? requiredDate.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : "Not scheduled",
      urgencyLabel
    };
  }, [selectedHospital, form.requiredBy, form.urgency]);

  const loadHospitals = async () => {
    setLoadingHospitals(true);
    setHospitalError("");

    try {
      const response = await api.getHospitals();
      const hospitalList = Array.isArray(response?.data) ? response.data : [];
      setHospitals(hospitalList);

      if (hospitalList.length > 0 && !form.hospitalId) {
        setForm((current) => ({ ...current, hospitalId: String(hospitalList[0].id) }));
      }
    } catch (error) {
      setHospitalError(error.message || "Unable to load hospitals");
      setHospitals([]);
    } finally {
      setLoadingHospitals(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);
    loadHospitals();

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!form.requiredBy) {
      const nextRequiredBy = getDefaultRequiredBy(form.urgency);
      setForm((current) => ({ ...current, requiredBy: nextRequiredBy }));
    }
  }, [form.urgency, form.requiredBy]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.hospitalId) {
      nextErrors.hospitalId = "Hospital is required.";
    }

    if (!form.bloodGroup) {
      nextErrors.bloodGroup = "Blood group is required.";
    }

    if (!Number.isFinite(Number(form.unitsRequired)) || Number(form.unitsRequired) <= 0) {
      nextErrors.unitsRequired = "Units required must be greater than 0.";
    }

    if (!form.urgency) {
      nextErrors.urgency = "Urgency is required.";
    }

    if (!form.requiredBy) {
      nextErrors.requiredBy = "Required by date/time is required.";
    } else if (Number.isNaN(new Date(form.requiredBy).getTime())) {
      nextErrors.requiredBy = "Required by date/time is invalid.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setErrors((current) => ({ ...current, submit: "" }));

    try {
      const payload = {
        hospital_id: Number(form.hospitalId),
        blood_group: form.bloodGroup,
        units_required: Number(form.unitsRequired),
        urgency: form.urgency,
        required_by: new Date(form.requiredBy).toISOString(),
        notes: form.notes?.trim() || "",
        auto_match: true
      };

      const response = await api.createRequest(payload);
      const createdRequest = response?.data?.request || response?.request || null;

      if (onSuccess) {
        onSuccess(createdRequest || response?.data || response);
      }

      setTimeout(() => onClose(), 500);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        submit: error.message || "Request could not be created. Please try again."
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const changeUnits = (delta) => {
    const nextValue = Math.max(1, Number(form.unitsRequired || 1) + delta);
    setForm((current) => ({ ...current, unitsRequired: nextValue }));
    setErrors((current) => ({ ...current, unitsRequired: "" }));
  };

  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = ((event.clientX - rect.left) / rect.width) * 100;
    const nextY = ((event.clientY - rect.top) / rect.height) * 100;
    setCursor({ x: nextX, y: nextY });
  };

  const modalStyle = {
    "--mouse-x": `${cursor.x}%`,
    "--mouse-y": `${cursor.y}%`
  };

  if (!isOpen) return null;

  return (
    <div className="new-request-backdrop" onClick={onClose}>
      <div
        className="new-request-modal"
        style={modalStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-request-title"
        onMouseMove={handlePointerMove}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="new-request-header">
          <div>
            <div className="new-request-kicker">EMERGENCY BLOOD COORDINATION</div>
            <h2 id="new-request-title">Create Blood Request</h2>
          </div>
          <button type="button" className="new-request-close" onClick={onClose} aria-label="Close new request form">
            <X size={18} />
          </button>
        </div>

        <div className="new-request-progress" aria-label="Request progress">
          {[
            { label: "Hospital" },
            { label: "Blood Group" },
            { label: "Urgency" },
            { label: "Details" }
          ].map((item, index) => (
            <div key={item.label} className={`progress-step ${index === 0 ? "active" : ""}`}>
              <span className="progress-dot" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {loadingHospitals ? (
          <div className="new-request-state-box">
            Loading request form...
          </div>
        ) : hospitalError ? (
          <div className="new-request-state-box error-box">
            <AlertCircle size={28} />
            <div>Unable to load hospitals</div>
            <button type="button" className="new-request-retry" onClick={loadHospitals}>
              Retry
            </button>
          </div>
        ) : hospitals.length === 0 ? (
          <div className="new-request-state-box">
            No hospitals available.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="new-request-form" noValidate>
            <div className="new-request-layout">
              <div className="new-request-main">
                <section className="new-request-block">
                  <div className="block-title">
                    <Building2 size={16} />
                    Hospital
                  </div>
                  <div className="field-shell">
                    <label htmlFor="hospital-select" className="field-label">Select Hospital</label>
                    <select
                      id="hospital-select"
                      className="new-request-select"
                      value={form.hospitalId}
                      onChange={(event) => updateField("hospitalId", event.target.value)}
                      aria-invalid={Boolean(errors.hospitalId)}
                    >
                      <option value="">Select Hospital</option>
                      {hospitals.map((hospital) => (
                        <option key={hospital.id} value={hospital.id}>{hospital.hospital_name}</option>
                      ))}
                    </select>
                    {selectedHospital && <div className="selected-hint">✓ Hospital Selected</div>}
                    {errors.hospitalId && <div className="field-error">{errors.hospitalId}</div>}
                  </div>
                </section>

                <section className="new-request-block">
                  <div className="block-title">
                    <Droplet size={16} />
                    Blood Group
                  </div>
                  <div className="blood-grid" role="radiogroup" aria-label="Blood group">
                    {BLOOD_GROUPS.map((group) => {
                      const selected = form.bloodGroup === group;
                      return (
                        <label key={group} className={`blood-card ${selected ? "selected" : ""}`}>
                          <input
                            type="radio"
                            name="bloodGroup"
                            value={group}
                            checked={selected}
                            onChange={() => updateField("bloodGroup", group)}
                            aria-label={group}
                          />
                          <span className="blood-card-icon"><Droplet size={14} /></span>
                          <span className="blood-card-value">{group}</span>
                          <span className="blood-card-text">Select</span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.bloodGroup && <div className="field-error">{errors.bloodGroup}</div>}
                </section>

                <section className="new-request-block">
                  <div className="block-title">
                    <AlertCircle size={16} />
                    Urgency
                  </div>
                  <div className="urgency-grid" role="radiogroup" aria-label="Urgency level">
                    {URGENCY_OPTIONS.map((option) => {
                      const selected = form.urgency === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`urgency-card urgency-${option.value.toLowerCase()} ${selected ? "selected" : ""}`}
                          style={{ "--urgency-accent": option.accent, "--urgency-glow": option.glow }}
                        >
                          <input
                            type="radio"
                            name="urgency"
                            value={option.value}
                            checked={selected}
                            onChange={() => updateField("urgency", option.value)}
                            aria-label={option.value}
                          />
                          <span className="urgency-inner">
                            <span className="urgency-title">{option.value}</span>
                            <span className="urgency-desc">{option.description}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.urgency && <div className="field-error">{errors.urgency}</div>}
                </section>

                <section className="new-request-block compact-row">
                  <div className="block-title">
                    <Droplet size={16} />
                    Units Required
                  </div>
                  <div className="units-control-wrap">
                    <button type="button" className="unit-stepper" onClick={() => changeUnits(-1)} aria-label="Decrease units">
                      <Minus size={18} />
                    </button>
                    <div className="unit-display" aria-live="polite">{form.unitsRequired}</div>
                    <button type="button" className="unit-stepper" onClick={() => changeUnits(1)} aria-label="Increase units">
                      <Plus size={18} />
                    </button>
                  </div>
                  {errors.unitsRequired && <div className="field-error">{errors.unitsRequired}</div>}
                </section>

                <section className="new-request-block">
                  <div className="block-title">
                    <Clock3 size={16} />
                    Required By
                  </div>
                  <div className="field-shell">
                    <input
                      type="datetime-local"
                      className="new-request-input"
                      value={form.requiredBy}
                      onChange={(event) => updateField("requiredBy", event.target.value)}
                      aria-invalid={Boolean(errors.requiredBy)}
                    />
                    {errors.requiredBy && <div className="field-error">{errors.requiredBy}</div>}
                  </div>
                </section>

                <section className="new-request-block">
                  <div className="block-title">
                    <MessageSquareText size={16} />
                    Additional Information
                  </div>
                  <div className="field-shell">
                    <textarea
                      id="request-notes"
                      className="new-request-textarea"
                      rows={4}
                      value={form.notes}
                      onChange={(event) => updateField("notes", event.target.value)}
                      placeholder="Optional clinical and coordination details..."
                    />
                  </div>
                </section>
              </div>

              <aside className="new-request-preview">
                <div className="preview-header">LIVE REQUEST PREVIEW</div>
                <div className="preview-card">
                  <div className="preview-row">
                    <span>Hospital</span>
                    <strong>{previewText.hospitalName}</strong>
                  </div>
                  <div className="preview-row">
                    <span>Blood</span>
                    <strong>{form.bloodGroup}</strong>
                  </div>
                  <div className="preview-row">
                    <span>Units</span>
                    <strong>{form.unitsRequired} UNITS</strong>
                  </div>
                  <div className="preview-row">
                    <span>Urgency</span>
                    <strong>{previewText.urgencyLabel}</strong>
                  </div>
                  <div className="preview-row">
                    <span>Required</span>
                    <strong>{previewText.requiredText}</strong>
                  </div>
                </div>
              </aside>
            </div>

            {errors.submit && (
              <div className="request-submit-error">
                <AlertCircle size={16} />
                {errors.submit}
              </div>
            )}

            <div className="new-request-footer">
              <button type="button" className="new-request-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="new-request-submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="submit-spinner" />
                    Creating Request...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Create Request
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
