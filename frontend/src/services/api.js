const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";

async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = typeof window !== "undefined" ? localStorage.getItem("hexavision_session_token") : null;
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    try {
        const res = await fetch(url, { ...options, headers });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || data.error || `HTTP error ${res.status}`);
        }
        return data;
    } catch (err) {
        console.error(`API Error on ${endpoint}:`, err);
        throw err;
    }
}

export const api = {
    // Analytics
    getDashboardStats: () => request("/analytics/dashboard"),
    getMapData: () => request("/analytics/map-data"),

    // Requests
    getRequests: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/requests${query ? `?${query}` : ""}`);
    },
    getRequestById: (id) => request(`/requests/${id}`),
    createRequest: (data) => request("/requests", { method: "POST", body: JSON.stringify(data) }),
    updateRequestStatus: (id, status) =>
        request(`/requests/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    triggerMatch: (id) => request(`/requests/${id}/match`, { method: "POST" }),
    broadcastAlert: (id, top_n = 5, channel = "SMS") =>
        request(`/requests/${id}/broadcast`, { method: "POST", body: JSON.stringify({ top_n, channel }) }),

    // Donors
    getDonors: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/donors${query ? `?${query}` : ""}`);
    },
    getDonorById: (id) => request(`/donors/${id}`),
    getDonorEligibility: (id, requestBloodGroup = null) => {
        const params = requestBloodGroup ? { request_blood_group: requestBloodGroup } : {};
        const query = new URLSearchParams(params).toString();
        return request(`/donors/${id}/eligibility${query ? `?${query}` : ""}`);
    },
    getDonorDonationSummary: (id) => request(`/donors/${id}/donations`),
    recordDonation: (id, data = {}) => request(`/donors/${id}/donations`, { method: "POST", body: JSON.stringify(data) }),
    createDonor: (data) => request("/donors", { method: "POST", body: JSON.stringify(data) }),
    updateDonor: (id, data) => request(`/donors/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteDonor: (id) => request(`/donors/${id}`, { method: "DELETE" }),

    // Hospitals
    getHospitals: () => request("/hospitals"),
    createHospital: (data) => request("/hospitals", { method: "POST", body: JSON.stringify(data) }),

    // Matches
    getMatches: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/matches${query ? `?${query}` : ""}`);
    },
    respondToMatch: (id, response) =>
        request(`/matches/${id}/respond`, { method: "PATCH", body: JSON.stringify({ response }) }),

    // Consent
    getConsentLogs: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/consent/logs${query ? `?${query}` : ""}`);
    },
    recordConsentLog: (data) => request("/consent/log", { method: "POST", body: JSON.stringify(data) }),

    // Tracking
    getTrackingShipments: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/tracking${query ? `?${query}` : ""}`);
    },
    getTrackingShipmentById: (id) => request(`/tracking/${id}`),
    getTrackingOverview: () => request("/tracking/overview"),

    // Facilities & Unified Blood Network
    getFacilities: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/facilities${query ? `?${query}` : ""}`);
    },
    getFacilityById: (id) => request(`/facilities/${id}`),
    createFacility: (data) => request("/facilities", { method: "POST", body: JSON.stringify(data) }),
    updateFacility: (id, data) => request(`/facilities/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    verifyFacility: (id, data = {}) => request(`/facilities/${id}/verify`, { method: "POST", body: JSON.stringify(data) }),
    suspendFacility: (id, data = {}) => request(`/facilities/${id}/suspend`, { method: "POST", body: JSON.stringify(data) }),
    deboardFacility: (id, data) => request(`/facilities/${id}/deboard`, { method: "POST", body: JSON.stringify(data) }),
    restoreFacility: (id, data = {}) => request(`/facilities/${id}/restore`, { method: "POST", body: JSON.stringify(data) }),
    mergeFacilities: (data) => request("/facilities/merge", { method: "POST", body: JSON.stringify(data) }),
    getFacilityInventory: (id) => request(`/facilities/${id}/inventory`),
    getFacilityBloodUnits: (id, params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/facilities/${id}/blood-units${query ? `?${query}` : ""}`);
    },
    getNetworkInventorySummary: () => request("/facilities/summary/inventory"),

    // Audit Logs
    getAuditLogs: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/audit-logs${query ? `?${query}` : ""}`);
    },
    createAuditLog: (data) => request("/audit-logs", { method: "POST", body: JSON.stringify(data) }),

    // Auth & Session
    login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    getMe: () => request("/auth/me"),
    sendOtp: (phone, is_login = false) => request("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone, is_login }) }),
    verifyOtp: (phone, otp) => request("/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone, otp }) }),
    sendEmailOtp: (email) => request("/auth/send-email-otp", { method: "POST", body: JSON.stringify({ email }) }),
    verifyEmailOtp: (email, otp) => request("/auth/verify-email-otp", { method: "POST", body: JSON.stringify({ email, otp }) }),
    sendDonorLoginOtp: (phone) => request("/auth/donor-login-otp", { method: "POST", body: JSON.stringify({ phone }) }),
    verifyDonorLogin: (phone, otp) => request("/auth/verify-donor-login", { method: "POST", body: JSON.stringify({ phone, otp }) }),
    checkPhone: (phone) => request(`/auth/check-phone/${phone}`),

    // Blood Knowledge AI Chatbot
    askBloodKnowledge: (message, history = []) =>
        request("/chat", { method: "POST", body: JSON.stringify({ message, history }) })
};
