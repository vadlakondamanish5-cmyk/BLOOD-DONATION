-- HEXAVISION DATABASE SCHEMA

-- =========================
-- DONORS
-- =========================
CREATE TABLE donors (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(150),
    blood_group VARCHAR(5) NOT NULL,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),

    -- Consent-first fields
    donation_consent BOOLEAN NOT NULL DEFAULT FALSE,
    emergency_contact_consent BOOLEAN NOT NULL DEFAULT FALSE,

    -- Availability
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    last_donation_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================
-- HOSPITALS
-- =========================
CREATE TABLE hospitals (
    id SERIAL PRIMARY KEY,
    hospital_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================
-- HOSPITAL BLOOD STOCK
-- =========================
CREATE TABLE hospital_blood_stock (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    blood_group VARCHAR(5) NOT NULL,
    units_available INTEGER NOT NULL DEFAULT 0 CHECK (units_available >= 0),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (hospital_id, blood_group)
);


-- =========================
-- BLOOD REQUESTS
-- =========================
CREATE TABLE blood_requests (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id),

    blood_group VARCHAR(5) NOT NULL,
    units_required INTEGER NOT NULL CHECK (units_required > 0),

    urgency VARCHAR(20) NOT NULL
        CHECK (urgency IN ('NORMAL', 'URGENT', 'CRITICAL')),

    required_by TIMESTAMP NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN (
            'OPEN',
            'MATCHING',
            'PARTIALLY_FULFILLED',
            'FULFILLED',
            'CANCELLED'
        )),

    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================
-- DONOR MATCHES
-- =========================
CREATE TABLE donor_matches (
    id SERIAL PRIMARY KEY,

    request_id INTEGER NOT NULL REFERENCES blood_requests(id)
        ON DELETE CASCADE,

    donor_id INTEGER NOT NULL REFERENCES donors(id)
        ON DELETE CASCADE,

    distance_km DECIMAL(10, 2),
    response_score DECIMAL(5, 2),
    compatibility_score DECIMAL(5, 2),
    availability_score DECIMAL(5, 2),

    total_score DECIMAL(5, 2),

    rank_position INTEGER,

    status VARCHAR(30) DEFAULT 'PENDING'
        CHECK (status IN (
            'PENDING',
            'NOTIFIED',
            'ACCEPTED',
            'DECLINED',
            'EXPIRED',
            'COMPLETED'
        )),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================
-- DONOR CONSENT LOG
-- =========================
CREATE TABLE consent_logs (
    id SERIAL PRIMARY KEY,

    donor_id INTEGER NOT NULL REFERENCES donors(id)
        ON DELETE CASCADE,

    request_id INTEGER REFERENCES blood_requests(id)
        ON DELETE SET NULL,

    consent_type VARCHAR(50) NOT NULL,

    consent_given BOOLEAN NOT NULL,

    consent_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,

    donor_id INTEGER REFERENCES donors(id)
        ON DELETE CASCADE,

    request_id INTEGER REFERENCES blood_requests(id)
        ON DELETE CASCADE,

    channel VARCHAR(20)
        CHECK (channel IN ('SMS', 'PUSH', 'EMAIL')),

    message TEXT NOT NULL,

    status VARCHAR(20) DEFAULT 'SENT'
        CHECK (status IN ('SENT', 'DELIVERED', 'FAILED')),

    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================
-- INDEXES
-- =========================

CREATE INDEX idx_donors_blood_group
ON donors(blood_group);

CREATE INDEX idx_donors_available
ON donors(is_available);

CREATE INDEX idx_requests_status
ON blood_requests(status);

CREATE INDEX idx_requests_blood_group
ON blood_requests(blood_group);

CREATE INDEX idx_hospital_stock_hospital
ON hospital_blood_stock(hospital_id);

CREATE INDEX idx_hospital_stock_blood_group
ON hospital_blood_stock(blood_group);

CREATE INDEX idx_hospital_stock_units
ON hospital_blood_stock(units_available);

CREATE INDEX idx_matches_request
ON donor_matches(request_id);

CREATE INDEX idx_matches_donor
ON donor_matches(donor_id);

CREATE INDEX idx_notifications_donor
ON notifications(donor_id);