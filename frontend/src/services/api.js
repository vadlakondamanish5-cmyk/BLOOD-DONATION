const API_BASE = "http://localhost:5000/api";

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

    // Auth & Session
    login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    getMe: () => request("/auth/me")
};
