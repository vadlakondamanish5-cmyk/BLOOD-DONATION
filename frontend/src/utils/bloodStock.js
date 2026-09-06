export const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const getBloodStockStatus = (units = 0) => {
  const numericUnits = Number(units || 0);

  if (numericUnits <= 0) {
    return { label: "OUT OF STOCK", tone: "out", textTone: "var(--blood-red)", statusClass: "out-of-stock" };
  }

  if (numericUnits <= 2) {
    return { label: "CRITICAL", tone: "critical", textTone: "#ff5d8f", statusClass: "critical-stock" };
  }

  if (numericUnits <= 5) {
    return { label: "LOW", tone: "low", textTone: "#ffb454", statusClass: "low-stock" };
  }

  return { label: "NORMAL", tone: "normal", textTone: "#4ade80", statusClass: "normal-stock" };
};

export const formatStockUnits = (units = 0) => {
  const numericUnits = Number(units || 0);
  return `${numericUnits} ${numericUnits === 1 ? "unit" : "units"}`;
};
