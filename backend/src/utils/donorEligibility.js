const { isCompatible } = require("./bloodCompatibility");

const DONATION_WAITING_PERIOD_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const normalizeStatus = (value) => String(value ?? "").trim().toUpperCase();

const parseDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toStartOfDay = (value) => {
  const date = parseDateValue(value);
  if (!date) return null;
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const addDays = (value, days) => {
  const date = parseDateValue(value);
  if (!date) return null;
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString().slice(0, 10);
};

const getDaysRemaining = (nextEligibilityDate) => {
  const nextDate = parseDateValue(nextEligibilityDate);
  if (!nextDate) return 0;
  const today = toStartOfDay(new Date());
  if (!today) return 0;
  const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / MS_PER_DAY);
  return diffDays > 0 ? diffDays : 0;
};

const isTemporarilyIneligible = (donor) => {
  if (!donor) return false;
  const medStatus = normalizeStatus(donor.medical_verification_status || donor.verification_status || donor.medical_status);
  const availStatus = normalizeStatus(donor.availability_status);
  return (
    ["MEDICALLY_INELIGIBLE", "REJECTED"].includes(medStatus) ||
    ["TEMPORARILY_INELIGIBLE"].includes(availStatus) ||
    donor.is_temporary_ineligible === true
  );
};

const isDonationCycleCompleted = (donor) => {
  if (!donor) return false;
  if (!donor.last_donation_date) return true; // First-time donors have completed cycle

  const nextEligibility = donor.next_eligibility_date
    ? parseDateValue(donor.next_eligibility_date)
    : parseDateValue(addDays(donor.last_donation_date, DONATION_WAITING_PERIOD_DAYS));

  if (!nextEligibility) return true;

  const today = toStartOfDay(new Date());
  return !!today && today >= nextEligibility;
};

const isMedicallyVerified = (donor) => {
  if (!donor) return true;
  const status = normalizeStatus(donor.medical_verification_status || donor.verification_status || donor.medical_status);
  return status === "VERIFIED" || status === "APPROVED" || status === "" || status === "PENDING";
};

const getDonationStatus = (donor) => {
  if (!donor || donor.last_donation_date === null || donor.last_donation_date === undefined || donor.last_donation_date === "") {
    return "FIRST_TIME_ELIGIBLE";
  }

  const cycleCompleted = isDonationCycleCompleted(donor);
  if (!cycleCompleted) return "NOT_COMPLETED";
  return "ELIGIBLE";
};

const buildNextEligibilityDate = (lastDonationDate) => {
  if (!lastDonationDate) return null;
  return addDays(lastDonationDate, DONATION_WAITING_PERIOD_DAYS);
};

const getEligibilitySummary = (donor, requestBloodGroup = null) => {
  const cycleCompleted = isDonationCycleCompleted(donor);
  const temporaryIneligible = isTemporarilyIneligible(donor);
  const bloodCompatible = !requestBloodGroup || !donor?.blood_group || isCompatible(requestBloodGroup, donor.blood_group);
  const nextEligibilityDate = donor?.next_eligibility_date || (donor?.last_donation_date ? buildNextEligibilityDate(donor.last_donation_date) : null);
  const daysRemaining = cycleCompleted ? 0 : getDaysRemaining(nextEligibilityDate);

  const available = donor?.is_available !== false;
  const consented = donor?.donation_consent === true;

  let reason = "Verified eligible";
  let eligibilityStatus = "ELIGIBLE";

  if (requestBloodGroup && donor?.blood_group && !bloodCompatible) {
    reason = "Blood group incompatible for current request";
    eligibilityStatus = "NOT_ELIGIBLE";
  } else if (!cycleCompleted) {
    reason = "Donation cycle not completed";
    eligibilityStatus = "NOT_ELIGIBLE";
  } else if (temporaryIneligible) {
    reason = "Temporarily medically ineligible";
    eligibilityStatus = "NOT_ELIGIBLE";
  }

  const eligible = eligibilityStatus === "ELIGIBLE";

  return {
    donor_id: donor?.id ?? null,
    request_blood_group: requestBloodGroup || null,
    blood_group: donor?.blood_group || null,
    isBloodCompatible: bloodCompatible,
    isDonationCycleCompleted: cycleCompleted,
    isAvailable: available,
    isConsented: consented,
    isTemporarilyIneligible: temporaryIneligible,
    donation_cycle_completed: cycleCompleted,
    medical_verification_status: donor?.medical_verification_status || "VERIFIED",
    availability_status: donor?.availability_status || (available ? "AVAILABLE" : "UNAVAILABLE"),
    next_eligibility_date: nextEligibilityDate,
    last_donation_date: donor?.last_donation_date || null,
    donation_status: getDonationStatus(donor),
    days_remaining: daysRemaining,
    eligibility_status: eligibilityStatus,
    eligibility_reason: reason,
    eligible,
    isEligible: eligible,
    reason,
    reasons: [reason]
  };
};

module.exports = {
  DONATION_WAITING_PERIOD_DAYS,
  addDays,
  buildNextEligibilityDate,
  getDaysRemaining,
  getDonationStatus,
  getEligibilitySummary,
  isDonationCycleCompleted,
  isMedicallyVerified,
  isTemporarilyIneligible,
  normalizeStatus,
  parseDateValue
};
