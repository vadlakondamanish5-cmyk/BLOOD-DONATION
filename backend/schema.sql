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

-- ============================================================
-- HEXAVISION UNIFIED BLOOD NETWORK: FACILITIES & LOGISTICS
-- ============================================================

-- 1. Unified Facilities Table
CREATE TABLE IF NOT EXISTS facilities (
    id SERIAL PRIMARY KEY,
    facility_code VARCHAR(50) UNIQUE NOT NULL,
    facility_name VARCHAR(200) NOT NULL,
    facility_type VARCHAR(60) NOT NULL, -- GOVERNMENT_BLOOD_BANK, PRIVATE_BLOOD_BANK, GOVERNMENT_HOSPITAL, PRIVATE_HOSPITAL, MEDICAL_COLLEGE_HOSPITAL, BLOOD_STORAGE_CENTRE, OTHER_AUTHORIZED_FACILITY
    ownership VARCHAR(40) NOT NULL DEFAULT 'PRIVATE', -- GOVERNMENT, PRIVATE, CHARITABLE, VOLUNTARY, SOCIETY, OTHER
    parent_facility_id INTEGER REFERENCES facilities(id) ON DELETE SET NULL,
    is_attached_centre BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Normalized Geographic Hierarchy
    country VARCHAR(80) NOT NULL DEFAULT 'India',
    state VARCHAR(80) NOT NULL DEFAULT 'Telangana',
    district VARCHAR(80) NOT NULL DEFAULT 'Hyderabad',
    city VARCHAR(80) NOT NULL DEFAULT 'Hyderabad',
    area VARCHAR(120),
    address TEXT NOT NULL,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),

    -- Contact & Master Data
    phone VARCHAR(60),
    email VARCHAR(160),
    contact_person VARCHAR(120),
    established_year INTEGER,
    registration_number VARCHAR(100),
    license_information TEXT,
    authorized_contact VARCHAR(120),
    website VARCHAR(255),

    -- Lifecycle & Status
    verification_status VARCHAR(40) NOT NULL DEFAULT 'PENDING_VERIFICATION', -- VERIFIED, PENDING_VERIFICATION, UNVERIFIED, REJECTED
    operating_status VARCHAR(40) NOT NULL DEFAULT 'ONLINE', -- ONLINE, OFFLINE, MAINTENANCE, STALE, SUSPENDED, DEBOARDED
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    data_source VARCHAR(60) NOT NULL DEFAULT 'DEMO_DATA',

    -- Deboarding Mechanism (Soft Delete)
    deboarded_at TIMESTAMP,
    deboarded_by VARCHAR(120),
    deboard_reason TEXT,
    deboard_approved_by VARCHAR(120),
    deboard_approved_at TIMESTAMP,

    -- Duplicate Detection & Merge
    possible_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
    duplicate_group VARCHAR(100),
    merged_into_facility_id INTEGER REFERENCES facilities(id) ON DELETE SET NULL,
    merged_at TIMESTAMP,
    merged_by VARCHAR(120),

    last_inventory_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Hierarchical Facility Blood Inventory
CREATE TABLE IF NOT EXISTS facility_blood_inventory (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    blood_group VARCHAR(10) NOT NULL, -- A+, A-, B+, B-, AB+, AB-, O+, O-
    component VARCHAR(40) NOT NULL DEFAULT 'WHOLE_BLOOD', -- RBC, WHOLE_BLOOD, PLASMA, PLATELETS, OTHER
    total_units INTEGER NOT NULL DEFAULT 0,
    available_units INTEGER NOT NULL DEFAULT 0 CHECK (available_units >= 0),
    reserved_units INTEGER NOT NULL DEFAULT 0 CHECK (reserved_units >= 0),
    dispatched_units INTEGER NOT NULL DEFAULT 0 CHECK (dispatched_units >= 0),
    in_transit_units INTEGER NOT NULL DEFAULT 0 CHECK (in_transit_units >= 0),
    expired_units INTEGER NOT NULL DEFAULT 0 CHECK (expired_units >= 0),
    expiring_soon_units INTEGER NOT NULL DEFAULT 0 CHECK (expiring_soon_units >= 0),
    critical_threshold INTEGER NOT NULL DEFAULT 10,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(facility_id, blood_group, component)
);

-- 3. Enhance Blood Units with Full Tracking, Dates, and Lifecycle
ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS facility_id INTEGER REFERENCES facilities(id) ON DELETE SET NULL;
ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS source_facility_id INTEGER REFERENCES facilities(id) ON DELETE SET NULL;
ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS destination_facility_id INTEGER REFERENCES facilities(id) ON DELETE SET NULL;
ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS collection_date DATE;
ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS storage_location VARCHAR(120);
ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS current_location VARCHAR(200);
ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS destination VARCHAR(200);
ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS transport_id VARCHAR(60);
ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS dispatch_id VARCHAR(60);
ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS eta VARCHAR(60);
ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS last_gps_update TIMESTAMP;

-- 4. Tracking Events Table
CREATE TABLE IF NOT EXISTS tracking_events (
    id SERIAL PRIMARY KEY,
    blood_unit_id INTEGER NOT NULL REFERENCES blood_units(id) ON DELETE CASCADE,
    event_type VARCHAR(60) NOT NULL, -- Collection, Testing, Storage, Reservation, Dispatch, Transportation, Hospital Reception, Delivered, Used
    event_description TEXT,
    location_name VARCHAR(150),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    temperature_celsius DECIMAL(5, 2),
    recorded_by VARCHAR(120),
    event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 5. Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    actor_id VARCHAR(100),
    actor_name VARCHAR(150),
    actor_role VARCHAR(60) DEFAULT 'ADMIN',
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_facilities_type ON facilities(facility_type);
CREATE INDEX IF NOT EXISTS idx_facilities_ownership ON facilities(ownership);
CREATE INDEX IF NOT EXISTS idx_facilities_status ON facilities(operating_status);
CREATE INDEX IF NOT EXISTS idx_facilities_active ON facilities(is_active);
CREATE INDEX IF NOT EXISTS idx_facilities_city ON facilities(city);
CREATE INDEX IF NOT EXISTS idx_fac_inventory_facility ON facility_blood_inventory(facility_id);
CREATE INDEX IF NOT EXISTS idx_fac_inventory_group ON facility_blood_inventory(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_units_facility ON blood_units(facility_id);
CREATE INDEX IF NOT EXISTS idx_blood_units_expiry ON blood_units(expiry_date);
CREATE INDEX IF NOT EXISTS idx_tracking_events_unit ON tracking_events(blood_unit_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);