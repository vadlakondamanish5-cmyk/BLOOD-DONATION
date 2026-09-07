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
    medical_conditions TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),

    -- Consent-first fields
    donation_consent BOOLEAN NOT NULL DEFAULT FALSE,
    emergency_contact_consent BOOLEAN NOT NULL DEFAULT FALSE,

    -- Availability
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    last_donation_date DATE,
    donation_count INTEGER NOT NULL DEFAULT 0,
    next_eligibility_date DATE,
    donation_cycle_completed BOOLEAN NOT NULL DEFAULT FALSE,
    medical_verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    availability_status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',

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

CREATE TABLE IF NOT EXISTS blood_units (
    id SERIAL PRIMARY KEY,
    unit_id VARCHAR(50) NOT NULL UNIQUE,
    blood_group VARCHAR(10) NOT NULL,
    component VARCHAR(40) NOT NULL DEFAULT 'Whole Blood',
    status VARCHAR(30) NOT NULL DEFAULT 'LAB_PREPARED'
        CHECK (status IN ('LAB_PREPARED', 'READY_FOR_DISPATCH', 'IN_TRANSIT', 'AT_HOSPITAL', 'DELIVERED', 'ALERT')),
    source_hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL,
    destination_hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL,
    donor_id INTEGER REFERENCES donors(id) ON DELETE SET NULL,
    current_latitude DECIMAL(10, 7),
    current_longitude DECIMAL(10, 7),
    temperature_celsius DECIMAL(5, 2),
    target_temperature_c VARCHAR(30) DEFAULT '1-6°C',
    qr_code TEXT,
    dispatched_at TIMESTAMP,
    delivered_at TIMESTAMP,
    last_scan_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blood_unit_events (
    id SERIAL PRIMARY KEY,
    blood_unit_id INTEGER NOT NULL REFERENCES blood_units(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_details JSONB DEFAULT '{}'::jsonb,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    temperature_celsius DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blood_unit_alerts (
    id SERIAL PRIMARY KEY,
    blood_unit_id INTEGER NOT NULL REFERENCES blood_units(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    message TEXT NOT NULL,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_donor
ON notifications(donor_id);

CREATE INDEX idx_blood_units_status
ON blood_units(status);

CREATE INDEX idx_blood_units_blood_group
ON blood_units(blood_group);

CREATE INDEX idx_blood_unit_events_blood_unit
ON blood_unit_events(blood_unit_id);