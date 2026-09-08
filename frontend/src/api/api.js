import axios from "axios";

// Create configured Axios instance
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:5001/api",
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 10000
});

// Request interceptor for auth token
axiosInstance.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("hexavision_session_token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred while communicating with HexaVision backend";
    return Promise.reject(new Error(message));
  }
);

// Centralized API Service
export const api = {
  // Raw instance
  client: axiosInstance,

  // Analytics & Dashboard
  getDashboardStats: () => axiosInstance.get("/analytics/dashboard"),
  getMapData: () => axiosInstance.get("/analytics/map-data"),

  // Blood Requests
  getRequests: (params = {}) => axiosInstance.get("/requests", { params }),
  getRequestById: (id) => axiosInstance.get(`/requests/${id}`),
  createRequest: (data) => axiosInstance.post("/requests", data),
  updateRequestStatus: (id, status) => axiosInstance.patch(`/requests/${id}/status`, { status }),
  triggerMatch: (id) => axiosInstance.post(`/requests/${id}/match`),
  broadcastAlert: (id, top_n = 5, channel = "SMS") =>
    axiosInstance.post(`/requests/${id}/broadcast`, { top_n, channel }),

  // Donors
  getDonors: (params = {}) => axiosInstance.get("/donors", { params }),
  getDonorById: (id) => axiosInstance.get(`/donors/${id}`),
  getDonorEligibility: (id, requestBloodGroup = null) =>
    axiosInstance.get(`/donors/${id}/eligibility`, { params: requestBloodGroup ? { request_blood_group: requestBloodGroup } : {} }),
  getDonorDonationSummary: (id) => axiosInstance.get(`/donors/${id}/donations`),
  recordDonation: (id, data = {}) => axiosInstance.post(`/donors/${id}/donations`, data),
  createDonor: (data) => axiosInstance.post("/donors", data),
  updateDonor: (id, data) => axiosInstance.patch(`/donors/${id}`, data),
  deleteDonor: (id) => axiosInstance.delete(`/donors/${id}`),

  // Hospitals
  getHospitals: () => axiosInstance.get("/hospitals"),
  getHospitalBloodStock: () => axiosInstance.get("/hospitals/blood-stock"),
  getHospitalBloodStockById: (id) => axiosInstance.get(`/hospitals/${id}/blood-stock`),

  // Matches
  getMatches: (params = {}) => axiosInstance.get("/matches", { params }),
  respondToMatch: (id, response) => axiosInstance.patch(`/matches/${id}/respond`, { response }),

  // Consent
  getConsentLogs: (params = {}) => axiosInstance.get("/consent/logs", { params }),
  recordConsentLog: (data) => axiosInstance.post("/consent/log", data),

  // Blood Unit Tracking
  getBloodUnits: (params = {}) => axiosInstance.get("/blood-units", { params }),
  getBloodUnitById: (id) => axiosInstance.get(`/blood-units/${id}`),
  getBloodTrackingOverview: () => axiosInstance.get("/blood-units/overview"),
  getTrackingShipments: (params = {}) => axiosInstance.get("/tracking", { params }),
  getTrackingShipmentById: (id) => axiosInstance.get(`/tracking/${id}`),
  createBloodUnit: (data) => axiosInstance.post("/blood-units", data),
  updateBloodUnit: (id, data) => axiosInstance.patch(`/blood-units/${id}`, data),
  updateBloodUnitLocation: (id, data) => axiosInstance.patch(`/blood-units/${id}/location`, data),
  updateBloodUnitTemperature: (id, data) => axiosInstance.patch(`/blood-units/${id}/temperature`, data),
  scanBloodUnit: (id, data = {}) => axiosInstance.post(`/blood-units/${id}/scan`, data),

  // Facilities & Unified Blood Network
  getFacilities: (params = {}) => axiosInstance.get("/facilities", { params }),
  getFacilityById: (id) => axiosInstance.get(`/facilities/${id}`),
  createFacility: (data) => axiosInstance.post("/facilities", data),
  updateFacility: (id, data) => axiosInstance.put(`/facilities/${id}`, data),
  verifyFacility: (id, data = {}) => axiosInstance.post(`/facilities/${id}/verify`, data),
  suspendFacility: (id, data = {}) => axiosInstance.post(`/facilities/${id}/suspend`, data),
  deboardFacility: (id, data) => axiosInstance.post(`/facilities/${id}/deboard`, data),
  restoreFacility: (id, data = {}) => axiosInstance.post(`/facilities/${id}/restore`, data),
  mergeFacilities: (data) => axiosInstance.post("/facilities/merge", data),
  getFacilityInventory: (id) => axiosInstance.get(`/facilities/${id}/inventory`),
  getFacilityBloodUnits: (id, params = {}) => axiosInstance.get(`/facilities/${id}/blood-units`, { params }),
  getNetworkInventorySummary: () => axiosInstance.get("/facilities/summary/inventory"),

  // Audit Logs
  getAuditLogs: (params = {}) => axiosInstance.get("/audit-logs", { params }),
  createAuditLog: (data) => axiosInstance.post("/audit-logs", data),

  // Auth & Session
  login: (data) => axiosInstance.post("/auth/login", data),
  register: (data) => axiosInstance.post("/auth/register", data),
  getMe: () => axiosInstance.get("/auth/me"),
  sendOtp: (phone, is_login = false) => axiosInstance.post("/auth/send-otp", { phone, is_login }),
  verifyOtp: (phone, otp) => axiosInstance.post("/auth/verify-otp", { phone, otp }),
  sendEmailOtp: (email) => axiosInstance.post("/auth/send-email-otp", { email }),
  verifyEmailOtp: (email, otp) => axiosInstance.post("/auth/verify-email-otp", { email, otp }),
  sendDonorLoginOtp: (phone) => axiosInstance.post("/auth/donor-login-otp", { phone }),
  verifyDonorLogin: (phone, otp) => axiosInstance.post("/auth/verify-donor-login", { phone, otp }),
  checkPhone: (phone) => axiosInstance.get(`/auth/check-phone/${phone}`),

  // Blood Knowledge AI Chatbot
  askBloodKnowledge: (message, history = []) =>
    axiosInstance.post("/chat", { message, history })
};

export default axiosInstance;
