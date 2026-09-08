const pool = require("./pool");

async function migrate() {
    try {
        console.log("Starting facilities & logistics schema migration...");

        const queries = [
            // 1. Unified Facilities Table
            `CREATE TABLE IF NOT EXISTS facilities (
                id SERIAL PRIMARY KEY,
                facility_code VARCHAR(50) UNIQUE NOT NULL,
                facility_name VARCHAR(200) NOT NULL,
                facility_type VARCHAR(60) NOT NULL,
                ownership VARCHAR(40) NOT NULL DEFAULT 'PRIVATE',
                parent_facility_id INTEGER REFERENCES facilities(id) ON DELETE SET NULL,
                is_attached_centre BOOLEAN NOT NULL DEFAULT FALSE,
                country VARCHAR(80) NOT NULL DEFAULT 'India',
                state VARCHAR(80) NOT NULL DEFAULT 'Telangana',
                district VARCHAR(80) NOT NULL DEFAULT 'Hyderabad',
                city VARCHAR(80) NOT NULL DEFAULT 'Hyderabad',
                area VARCHAR(120),
                address TEXT NOT NULL,
                latitude DECIMAL(10, 7),
                longitude DECIMAL(10, 7),
                phone VARCHAR(60),
                email VARCHAR(160),
                contact_person VARCHAR(120),
                established_year INTEGER,
                registration_number VARCHAR(100),
                license_information TEXT,
                authorized_contact VARCHAR(120),
                website VARCHAR(255),
                verification_status VARCHAR(40) NOT NULL DEFAULT 'PENDING_VERIFICATION',
                operating_status VARCHAR(40) NOT NULL DEFAULT 'ONLINE',
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                data_source VARCHAR(60) NOT NULL DEFAULT 'DEMO_DATA',
                deboarded_at TIMESTAMP,
                deboarded_by VARCHAR(120),
                deboard_reason TEXT,
                deboard_approved_by VARCHAR(120),
                deboard_approved_at TIMESTAMP,
                possible_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
                duplicate_group VARCHAR(100),
                merged_into_facility_id INTEGER REFERENCES facilities(id) ON DELETE SET NULL,
                merged_at TIMESTAMP,
                merged_by VARCHAR(120),
                last_inventory_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`,

            // 2. Hierarchical Facility Blood Inventory
            `CREATE TABLE IF NOT EXISTS facility_blood_inventory (
                id SERIAL PRIMARY KEY,
                facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
                blood_group VARCHAR(10) NOT NULL,
                component VARCHAR(40) NOT NULL DEFAULT 'WHOLE_BLOOD',
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
            );`,

            // 3. Enhance Blood Units with Full Tracking, Dates, and Lifecycle
            `ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS facility_id INTEGER REFERENCES facilities(id) ON DELETE SET NULL;`,
            `ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS source_facility_id INTEGER REFERENCES facilities(id) ON DELETE SET NULL;`,
            `ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS destination_facility_id INTEGER REFERENCES facilities(id) ON DELETE SET NULL;`,
            `ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS collection_date DATE;`,
            `ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS expiry_date DATE;`,
            `ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS storage_location VARCHAR(120);`,
            `ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS current_location VARCHAR(200);`,
            `ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS destination VARCHAR(200);`,
            `ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS transport_id VARCHAR(60);`,
            `ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS dispatch_id VARCHAR(60);`,
            `ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS eta VARCHAR(60);`,
            `ALTER TABLE blood_units ADD COLUMN IF NOT EXISTS last_gps_update TIMESTAMP;`,

            // 4. Tracking Events Table
            `CREATE TABLE IF NOT EXISTS tracking_events (
                id SERIAL PRIMARY KEY,
                blood_unit_id INTEGER NOT NULL REFERENCES blood_units(id) ON DELETE CASCADE,
                event_type VARCHAR(60) NOT NULL,
                event_description TEXT,
                location_name VARCHAR(150),
                latitude DECIMAL(10, 7),
                longitude DECIMAL(10, 7),
                temperature_celsius DECIMAL(5, 2),
                recorded_by VARCHAR(120),
                event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB DEFAULT '{}'::jsonb
            );`,

            // 5. Audit Log Table
            `CREATE TABLE IF NOT EXISTS audit_logs (
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
            );`,

            // 6. Indexes
            `CREATE INDEX IF NOT EXISTS idx_facilities_type ON facilities(facility_type);`,
            `CREATE INDEX IF NOT EXISTS idx_facilities_ownership ON facilities(ownership);`,
            `CREATE INDEX IF NOT EXISTS idx_facilities_status ON facilities(operating_status);`,
            `CREATE INDEX IF NOT EXISTS idx_facilities_active ON facilities(is_active);`,
            `CREATE INDEX IF NOT EXISTS idx_facilities_city ON facilities(city);`,
            `CREATE INDEX IF NOT EXISTS idx_fac_inventory_facility ON facility_blood_inventory(facility_id);`,
            `CREATE INDEX IF NOT EXISTS idx_fac_inventory_group ON facility_blood_inventory(blood_group);`,
            `CREATE INDEX IF NOT EXISTS idx_blood_units_facility ON blood_units(facility_id);`,
            `CREATE INDEX IF NOT EXISTS idx_blood_units_expiry ON blood_units(expiry_date);`,
            `CREATE INDEX IF NOT EXISTS idx_tracking_events_unit ON tracking_events(blood_unit_id);`,
            `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);`,
            `CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);`
        ];

        for (const query of queries) {
            await pool.query(query);
        }

        console.log("All tables, columns, and indexes migrated successfully!");
    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        await pool.end();
    }
}

migrate();
