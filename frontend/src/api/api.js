import axios from "axios";

// Create configured Axios instance
const axiosInstance = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 10000
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
  recordConsentLog: (data) => axiosInstance.post("/consent/log", data)
};

export default axiosInstance;
