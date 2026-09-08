const pool = require("../db/pool");
const { logAudit } = require("../utils/auditLogger");
const crypto = require("crypto");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENTS = ["RBC", "WHOLE_BLOOD", "PLASMA", "PLATELETS"];

const emitSocket = (eventName, data) => {
    if (global.__hexavisionIo) {
        global.__hexavisionIo.emit(eventName, data);
    }
};

// 1. GET ALL FACILITIES (WITH FILTERS & DEBOARDING TOGGLE)
exports.getAllFacilities = async (req, res) => {
    try {
        const {
            search,
            facility_type,
            type,
            ownership,
            verification_status,
            operating_status,
            city,
            district,
            state,
            include_deboarded = "false",
            limit = 200,
            offset = 0
        } = req.query;

        const effectiveType = facility_type || type;
        const showDeboarded = include_deboarded === "true" || include_deboarded === true;

        let query = `
            SELECT 
                f.*,
                COALESCE(SUM(inv.total_units), 0)::INT AS total_inventory_units,
                COALESCE(SUM(inv.available_units), 0)::INT AS available_inventory_units,
                COALESCE(SUM(inv.expiring_soon_units), 0)::INT AS expiring_soon_units,
                COALESCE(attached.attached_count, 0)::INT AS attached_centres_count
            FROM facilities f
            LEFT JOIN facility_blood_inventory inv ON f.id = inv.facility_id
            LEFT JOIN (
                SELECT parent_facility_id, COUNT(*) AS attached_count 
                FROM facilities 
                WHERE is_attached_centre = TRUE 
                GROUP BY parent_facility_id
            ) attached ON f.id = attached.parent_facility_id
            WHERE 1=1
        `;

        const values = [];
        let pIndex = 1;

        if (!showDeboarded) {
            query += ` AND f.operating_status != 'DEBOARDED' AND f.is_active = TRUE`;
        }

        if (effectiveType) {
            query += ` AND f.facility_type = $${pIndex++}`;
            values.push(effectiveType);
        }

        if (ownership) {
            query += ` AND f.ownership = $${pIndex++}`;
            values.push(ownership);
        }

        if (verification_status) {
            query += ` AND f.verification_status = $${pIndex++}`;
            values.push(verification_status);
        }

        if (operating_status) {
            query += ` AND f.operating_status = $${pIndex++}`;
            values.push(operating_status);
        }

        if (city) {
            query += ` AND f.city ILIKE $${pIndex++}`;
            values.push(`%${city}%`);
        }

        if (district) {
            query += ` AND f.district ILIKE $${pIndex++}`;
            values.push(`%${district}%`);
        }

        if (state) {
            query += ` AND f.state ILIKE $${pIndex++}`;
            values.push(`%${state}%`);
        }

        if (search) {
            query += ` AND (
                f.facility_name ILIKE $${pIndex} 
                OR f.facility_code ILIKE $${pIndex} 
                OR f.address ILIKE $${pIndex} 
                OR f.area ILIKE $${pIndex} 
                OR f.phone ILIKE $${pIndex}
            )`;
            values.push(`%${search}%`);
            pIndex++;
        }

        query += `
            GROUP BY f.id, attached.attached_count
            ORDER BY 
                CASE WHEN f.operating_status = 'DEBOARDED' THEN 1 ELSE 0 END ASC,
                f.facility_name ASC
            LIMIT $${pIndex++} OFFSET $${pIndex++}
        `;
        values.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, values);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (err) {
        console.error("Error in getAllFacilities:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 2. GET FACILITY BY ID
exports.getFacilityById = async (req, res) => {
    try {
        const { id } = req.params;

        const facRes = await pool.query(`
            SELECT f.*,
                   p.facility_name AS parent_facility_name,
                   m.facility_name AS merged_into_facility_name
            FROM facilities f
            LEFT JOIN facilities p ON f.parent_facility_id = p.id
            LEFT JOIN facilities m ON f.merged_into_facility_id = m.id
            WHERE f.id = $1
        `, [id]);

        if (facRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Facility not found" });
        }

        const facility = facRes.rows[0];

        // Attached centres
        const attachedRes = await pool.query(`
            SELECT id, facility_code, facility_name, facility_type, operating_status, phone, address
            FROM facilities
            WHERE parent_facility_id = $1 AND is_attached_centre = TRUE
            ORDER BY facility_name ASC
        `, [id]);

        // Inventory breakdown
        const invRes = await pool.query(`
            SELECT blood_group, component, total_units, available_units, reserved_units, dispatched_units, in_transit_units, expired_units, expiring_soon_units, critical_threshold, last_updated
            FROM facility_blood_inventory
            WHERE facility_id = $1
            ORDER BY blood_group, component
        `, [id]);

        // Recent tracking activity
        const trackingRes = await pool.query(`
            SELECT te.*, bu.unit_id, bu.blood_group, bu.component
            FROM tracking_events te
            JOIN blood_units bu ON te.blood_unit_id = bu.id
            WHERE bu.facility_id = $1 OR bu.source_facility_id = $1 OR bu.destination_facility_id = $1
            ORDER BY te.event_time DESC
            LIMIT 15
        `, [id]);

        // Aggregate counts
        let totalUnits = 0;
        let availableUnits = 0;
        let reservedUnits = 0;
        let expiringSoonUnits = 0;

        invRes.rows.forEach(item => {
            totalUnits += Number(item.total_units || 0);
            availableUnits += Number(item.available_units || 0);
            reservedUnits += Number(item.reserved_units || 0);
            expiringSoonUnits += Number(item.expiring_soon_units || 0);
        });

        res.json({
            success: true,
            data: {
                ...facility,
                summary: {
                    totalUnits,
                    availableUnits,
                    reservedUnits,
                    expiringSoonUnits
                },
                attachedCentres: attachedRes.rows,
                inventory: invRes.rows,
                recentTracking: trackingRes.rows
            }
        });
    } catch (err) {
        console.error("Error in getFacilityById:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. ONBOARD FACILITY (WITH DUPLICATE DETECTION)
exports.createFacility = async (req, res) => {
    try {
        const {
            facility_name,
            facility_type,
            ownership = "PRIVATE",
            parent_facility_id = null,
            is_attached_centre = false,
            country = "India",
            state = "Telangana",
            district = "Hyderabad",
            city = "Hyderabad",
            area,
            address,
            latitude = 17.3850,
            longitude = 78.4867,
            phone,
            email,
            contact_person,
            established_year,
            registration_number,
            license_information,
            authorized_contact,
            website,
            force_create = false
        } = req.body;

        if (!facility_name || !facility_type || !address) {
            return res.status(400).json({
                success: false,
                message: "facility_name, facility_type, and address are required"
            });
        }

        // Duplicate Detection Check
        let possibleDuplicate = false;
        let duplicateGroup = null;

        if (registration_number || phone || facility_name) {
            const dupCheck = await pool.query(`
                SELECT id, facility_name, facility_code, registration_number, phone
                FROM facilities
                WHERE 
                    (registration_number IS NOT NULL AND registration_number = $1)
                    OR (phone IS NOT NULL AND phone = $2)
                    OR (LOWER(TRIM(facility_name)) = LOWER(TRIM($3)) AND city = $4)
                LIMIT 1
            `, [registration_number || "", phone || "", facility_name, city]);

            if (dupCheck.rows.length > 0) {
                possibleDuplicate = true;
                duplicateGroup = `DUP-${dupCheck.rows[0].id}-${Date.now()}`;
                if (!force_create) {
                    return res.status(409).json({
                        success: false,
                        duplicateDetected: true,
                        existingFacility: dupCheck.rows[0],
                        message: `Possible duplicate facility detected: "${dupCheck.rows[0].facility_name}" (${dupCheck.rows[0].facility_code}). Use force_create: true to proceed or merge instead.`
                    });
                }
            }
        }

        const facility_code = `FAC-HYD-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

        const insertQuery = `
            INSERT INTO facilities (
                facility_code, facility_name, facility_type, ownership,
                parent_facility_id, is_attached_centre,
                country, state, district, city, area, address,
                latitude, longitude, phone, email, contact_person,
                established_year, registration_number, license_information,
                authorized_contact, website,
                verification_status, operating_status, is_active,
                possible_duplicate, duplicate_group
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
                'PENDING_VERIFICATION', 'ONLINE', TRUE, $23, $24
            ) RETURNING *
        `;

        const insertValues = [
            facility_code, facility_name, facility_type, ownership,
            parent_facility_id || null, Boolean(is_attached_centre),
            country, state, district, city, area || null, address,
            latitude, longitude, phone || null, email || null, contact_person || null,
            established_year || null, registration_number || null, license_information || null,
            authorized_contact || null, website || null,
            possibleDuplicate, duplicateGroup
        ];

        const result = await pool.query(insertQuery, insertValues);
        const newFacility = result.rows[0];

        // Seed empty inventory rows for standard components
        for (const bg of BLOOD_GROUPS) {
            for (const comp of COMPONENTS) {
                await pool.query(`
                    INSERT INTO facility_blood_inventory (facility_id, blood_group, component, total_units, available_units, critical_threshold)
                    VALUES ($1, $2, $3, 0, 0, 10)
                    ON CONFLICT (facility_id, blood_group, component) DO NOTHING
                `, [newFacility.id, bg, comp]);
            }
        }

        // Mirror to hospitals table for backward compatibility if hospital or blood bank
        try {
            await pool.query(`
                INSERT INTO hospitals (hospital_name, contact_person, phone, email, latitude, longitude, verified)
                VALUES ($1, $2, $3, $4, $5, $6, FALSE)
                ON CONFLICT DO NOTHING
            `, [newFacility.facility_name, newFacility.contact_person, newFacility.phone || "040-0000000", newFacility.email, newFacility.latitude, newFacility.longitude]);
        } catch (mErr) {
            console.warn("Legacy hospital mirror warning:", mErr.message);
        }

        // Audit Log
        await logAudit({
            actor_id: req.user?.id || "ADMIN",
            actor_name: req.user?.name || "Network Officer",
            action: "FACILITY_ONBOARDED",
            entity_type: "FACILITY",
            entity_id: newFacility.id,
            reason: "New facility onboarded to Unified Blood Network",
            metadata: { facility_code, facility_name, facility_type, ownership }
        });

        emitSocket("facility-onboarded", newFacility);

        res.status(201).json({
            success: true,
            message: "Facility successfully onboarded (Verification Pending)",
            data: newFacility
        });
    } catch (err) {
        console.error("Error in createFacility:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 4. UPDATE FACILITY
exports.updateFacility = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowedFields = [
            "facility_name", "facility_type", "ownership", "parent_facility_id",
            "is_attached_centre", "country", "state", "district", "city", "area",
            "address", "latitude", "longitude", "phone", "email", "contact_person",
            "established_year", "registration_number", "license_information",
            "authorized_contact", "website"
        ];

        const setClauses = [];
        const values = [id];
        let pIndex = 2;

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                setClauses.push(`${field} = $${pIndex++}`);
                values.push(updates[field]);
            }
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ success: false, message: "No valid fields provided for update" });
        }

        setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

        const query = `
            UPDATE facilities
            SET ${setClauses.join(", ")}
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Facility not found" });
        }

        await logAudit({
            actor_id: req.user?.id || "ADMIN",
            actor_name: req.user?.name || "Network Officer",
            action: "FACILITY_UPDATED",
            entity_type: "FACILITY",
            entity_id: id,
            reason: req.body.reason || "Facility profile updated",
            metadata: updates
        });

        emitSocket("facility-updated", result.rows[0]);

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error("Error in updateFacility:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 5. VERIFY FACILITY
exports.verifyFacility = async (req, res) => {
    try {
        const { id } = req.params;
        const { status = "VERIFIED", notes } = req.body;

        if (!["VERIFIED", "PENDING_VERIFICATION", "UNVERIFIED", "REJECTED"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid verification status" });
        }

        const result = await pool.query(`
            UPDATE facilities
            SET verification_status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Facility not found" });
        }

        await logAudit({
            actor_id: req.user?.id || "ADMIN",
            actor_name: req.user?.name || "Network Quality Auditor",
            action: `FACILITY_VERIFICATION_${status}`,
            entity_type: "FACILITY",
            entity_id: id,
            reason: notes || `Verification status updated to ${status}`,
            metadata: { previousStatus: result.rows[0].verification_status, newStatus: status }
        });

        emitSocket("facility-updated", result.rows[0]);

        res.json({ success: true, message: `Facility verification status set to ${status}`, data: result.rows[0] });
    } catch (err) {
        console.error("Error in verifyFacility:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 6. SUSPEND / RESUME FACILITY
exports.suspendFacility = async (req, res) => {
    try {
        const { id } = req.params;
        const { status = "SUSPENDED", reason } = req.body;

        if (!["SUSPENDED", "ONLINE", "MAINTENANCE"].includes(status)) {
            return res.status(400).json({ success: false, message: "Status must be SUSPENDED, ONLINE, or MAINTENANCE" });
        }

        const result = await pool.query(`
            UPDATE facilities
            SET operating_status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Facility not found" });
        }

        await logAudit({
            actor_id: req.user?.id || "ADMIN",
            actor_name: req.user?.name || "Network Supervisor",
            action: `FACILITY_${status}`,
            entity_type: "FACILITY",
            entity_id: id,
            reason: reason || `Operating status changed to ${status}`,
            metadata: { operating_status: status }
        });

        emitSocket("facility-updated", result.rows[0]);

        res.json({ success: true, message: `Facility operating status updated to ${status}`, data: result.rows[0] });
    } catch (err) {
        console.error("Error in suspendFacility:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 7. DEBOARD FACILITY (SOFT-DELETION WITH MANDATORY REASON & AUDIT TRAIL)
exports.deboardFacility = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, approved_by } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: "Deboarding requires a mandatory documented reason (e.g. License revocation, Voluntary closure, Inactivity, Relocation)"
            });
        }

        // Fetch facility to ensure it exists and is not already deboarded
        const existing = await pool.query("SELECT * FROM facilities WHERE id = $1", [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Facility not found" });
        }

        const facility = existing.rows[0];
        if (facility.operating_status === "DEBOARDED" || !facility.is_active) {
            return res.status(400).json({ success: false, message: "Facility is already deboarded" });
        }

        const actorName = req.user?.name || "Network Administrator";
        const approver = approved_by || actorName;

        const updateQuery = `
            UPDATE facilities
            SET 
                operating_status = 'DEBOARDED',
                is_active = FALSE,
                deboarded_at = CURRENT_TIMESTAMP,
                deboarded_by = $1,
                deboard_reason = $2,
                deboard_approved_by = $3,
                deboard_approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `;

        const updateRes = await pool.query(updateQuery, [actorName, reason.trim(), approver, id]);
        const deboardedFacility = updateRes.rows[0];

        // Audit Trail (Immutable Log)
        await logAudit({
            actor_id: req.user?.id || "ADMIN",
            actor_name: actorName,
            action: "FACILITY_DEBOARDED",
            entity_type: "FACILITY",
            entity_id: id,
            reason: reason.trim(),
            metadata: {
                facility_code: facility.facility_code,
                facility_name: facility.facility_name,
                facility_type: facility.facility_type,
                deboarded_by: actorName,
                deboard_approved_by: approver
            }
        });

        // Broadcast to clients so live map and lists update immediately
        emitSocket("facility-deboarded", {
            id: Number(id),
            facility_code: facility.facility_code,
            facility_name: facility.facility_name,
            reason: reason.trim()
        });

        res.json({
            success: true,
            message: `Facility "${facility.facility_name}" has been safely deboarded. Historical units and logs preserved.`,
            data: deboardedFacility
        });
    } catch (err) {
        console.error("Error in deboardFacility:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 8. RESTORE FACILITY WORKFLOW
exports.restoreFacility = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const existing = await pool.query("SELECT * FROM facilities WHERE id = $1", [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Facility not found" });
        }

        const facility = existing.rows[0];
        if (facility.operating_status !== "DEBOARDED" && facility.is_active) {
            return res.status(400).json({ success: false, message: "Facility is not currently deboarded" });
        }

        const actorName = req.user?.name || "Network Administrator";

        const updateQuery = `
            UPDATE facilities
            SET 
                operating_status = 'ONLINE',
                is_active = TRUE,
                verification_status = 'PENDING_VERIFICATION',
                deboarded_at = NULL,
                deboard_reason = NULL,
                deboarded_by = NULL,
                deboard_approved_by = NULL,
                deboard_approved_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const updateRes = await pool.query(updateQuery, [id]);
        const restoredFacility = updateRes.rows[0];

        // Audit Log
        await logAudit({
            actor_id: req.user?.id || "ADMIN",
            actor_name: actorName,
            action: "FACILITY_RESTORED",
            entity_type: "FACILITY",
            entity_id: id,
            reason: reason || "Facility restored to network; inventory verification pending",
            metadata: {
                facility_code: facility.facility_code,
                facility_name: facility.facility_name
            }
        });

        emitSocket("facility-restored", restoredFacility);

        res.json({
            success: true,
            message: `Facility "${facility.facility_name}" restored to network. Verification is pending.`,
            data: restoredFacility
        });
    } catch (err) {
        console.error("Error in restoreFacility:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 9. MERGE FACILITIES (DUPLICATE RESOLUTION)
exports.mergeFacilities = async (req, res) => {
    try {
        const { primary_facility_id, duplicate_facility_id, reason } = req.body;

        if (!primary_facility_id || !duplicate_facility_id) {
            return res.status(400).json({
                success: false,
                message: "primary_facility_id and duplicate_facility_id are required"
            });
        }

        if (Number(primary_facility_id) === Number(duplicate_facility_id)) {
            return res.status(400).json({
                success: false,
                message: "Primary and duplicate facilities cannot be the same"
            });
        }

        const primaryRes = await pool.query("SELECT * FROM facilities WHERE id = $1", [primary_facility_id]);
        const dupRes = await pool.query("SELECT * FROM facilities WHERE id = $1", [duplicate_facility_id]);

        if (primaryRes.rows.length === 0 || dupRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "One or both facilities not found" });
        }

        const primary = primaryRes.rows[0];
        const duplicate = dupRes.rows[0];
        const actorName = req.user?.name || "Network Administrator";
        const mergeReason = reason || `Merged duplicate ${duplicate.facility_code} into primary ${primary.facility_code}`;

        // 1. Repoint blood units to primary facility
        await pool.query(`
            UPDATE blood_units
            SET facility_id = $1
            WHERE facility_id = $2
        `, [primary.id, duplicate.id]);

        // 2. Repoint attached centres
        await pool.query(`
            UPDATE facilities
            SET parent_facility_id = $1
            WHERE parent_facility_id = $2
        `, [primary.id, duplicate.id]);

        // 3. Mark duplicate as deboarded and merged
        await pool.query(`
            UPDATE facilities
            SET 
                operating_status = 'DEBOARDED',
                is_active = FALSE,
                merged_into_facility_id = $1,
                merged_at = CURRENT_TIMESTAMP,
                merged_by = $2,
                deboard_reason = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
        `, [primary.id, actorName, mergeReason, duplicate.id]);

        // 4. Audit Log
        await logAudit({
            actor_id: req.user?.id || "ADMIN",
            actor_name: actorName,
            action: "FACILITY_MERGED",
            entity_type: "FACILITY",
            entity_id: duplicate.id,
            reason: mergeReason,
            metadata: {
                primary_facility_id: primary.id,
                primary_facility_name: primary.facility_name,
                duplicate_facility_id: duplicate.id,
                duplicate_facility_name: duplicate.facility_name
            }
        });

        emitSocket("facility-merged", {
            primary_id: primary.id,
            duplicate_id: duplicate.id
        });

        res.json({
            success: true,
            message: `Successfully merged "${duplicate.facility_name}" into "${primary.facility_name}". Duplicate marked as merged/deboarded.`,
            primary: primary,
            mergedFacilityId: duplicate.id
        });
    } catch (err) {
        console.error("Error in mergeFacilities:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 10. GET FACILITY BLOOD INVENTORY (HIERARCHICAL MATRIX)
exports.getFacilityInventory = async (req, res) => {
    try {
        const { id } = req.params;

        const facRes = await pool.query("SELECT id, facility_name, facility_code, operating_status FROM facilities WHERE id = $1", [id]);
        if (facRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Facility not found" });
        }

        const invRes = await pool.query(`
            SELECT blood_group, component, total_units, available_units, reserved_units, dispatched_units, in_transit_units, expired_units, expiring_soon_units, critical_threshold, last_updated
            FROM facility_blood_inventory
            WHERE facility_id = $1
            ORDER BY blood_group, component
        `, [id]);

        // Transform into structured 8x4 matrix
        const matrix = {};
        for (const bg of BLOOD_GROUPS) {
            matrix[bg] = {};
            for (const comp of COMPONENTS) {
                matrix[bg][comp] = {
                    total_units: 0,
                    available_units: 0,
                    reserved_units: 0,
                    expiring_soon_units: 0,
                    critical_threshold: 10
                };
            }
        }

        invRes.rows.forEach(item => {
            if (matrix[item.blood_group]) {
                const cKey = COMPONENTS.includes(item.component) ? item.component : "WHOLE_BLOOD";
                matrix[item.blood_group][cKey] = {
                    total_units: Number(item.total_units || 0),
                    available_units: Number(item.available_units || 0),
                    reserved_units: Number(item.reserved_units || 0),
                    expiring_soon_units: Number(item.expiring_soon_units || 0),
                    critical_threshold: Number(item.critical_threshold || 10)
                };
            }
        });

        res.json({
            success: true,
            facility: facRes.rows[0],
            inventory: invRes.rows,
            matrix
        });
    } catch (err) {
        console.error("Error in getFacilityInventory:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 11. GET INDIVIDUAL BLOOD UNITS FOR FACILITY (NO DONOR IDENTITY PII)
exports.getFacilityBloodUnits = async (req, res) => {
    try {
        const { id } = req.params;
        const { blood_group, component, status, search, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT 
                bu.id,
                bu.unit_id,
                bu.blood_group,
                bu.component,
                bu.status,
                bu.collection_date,
                bu.expiry_date,
                ROUND(EXTRACT(EPOCH FROM (bu.expiry_date::timestamp - CURRENT_TIMESTAMP))/86400)::INT AS days_remaining,
                CASE 
                    WHEN bu.expiry_date < CURRENT_DATE THEN 'EXPIRED'
                    WHEN bu.expiry_date <= CURRENT_DATE + INTERVAL '5 days' THEN 'EXPIRING_SOON'
                    ELSE 'VALID'
                END AS expiry_status,
                bu.storage_location,
                bu.current_location,
                bu.destination,
                bu.transport_id,
                bu.dispatch_id,
                bu.eta,
                bu.temperature_celsius,
                bu.target_temperature_c,
                bu.current_latitude,
                bu.current_longitude,
                bu.qr_code,
                bu.last_scan_at,
                bu.created_at,
                bu.updated_at
            FROM blood_units bu
            WHERE (bu.facility_id = $1 OR bu.source_facility_id = $1)
        `;

        const values = [id];
        let pIndex = 2;

        if (blood_group) {
            query += ` AND bu.blood_group = $${pIndex++}`;
            values.push(blood_group);
        }

        if (component) {
            query += ` AND bu.component = $${pIndex++}`;
            values.push(component);
        }

        if (status) {
            query += ` AND bu.status = $${pIndex++}`;
            values.push(status);
        }

        if (search) {
            query += ` AND (bu.unit_id ILIKE $${pIndex} OR bu.storage_location ILIKE $${pIndex})`;
            values.push(`%${search}%`);
            pIndex++;
        }

        query += ` ORDER BY bu.expiry_date ASC LIMIT $${pIndex++} OFFSET $${pIndex++}`;
        values.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, values);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (err) {
        console.error("Error in getFacilityBloodUnits:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 12. GET NETWORK-WIDE INVENTORY SUMMARY (EXCLUDES DEBOARDED)
exports.getNetworkInventorySummary = async (req, res) => {
    try {
        const query = `
            SELECT 
                inv.blood_group,
                inv.component,
                COALESCE(SUM(inv.total_units), 0)::INT AS total_units,
                COALESCE(SUM(inv.available_units), 0)::INT AS available_units,
                COALESCE(SUM(inv.reserved_units), 0)::INT AS reserved_units,
                COALESCE(SUM(inv.expiring_soon_units), 0)::INT AS expiring_soon_units,
                COALESCE(SUM(inv.expired_units), 0)::INT AS expired_units
            FROM facility_blood_inventory inv
            JOIN facilities f ON inv.facility_id = f.id
            WHERE f.operating_status != 'DEBOARDED' AND f.is_active = TRUE
            GROUP BY inv.blood_group, inv.component
            ORDER BY inv.blood_group, inv.component
        `;

        const result = await pool.query(query);

        // Group-level totals
        const groupTotals = {};
        BLOOD_GROUPS.forEach(bg => {
            groupTotals[bg] = { total: 0, available: 0, reserved: 0, expiring_soon: 0, is_shortage: false };
        });

        result.rows.forEach(r => {
            if (groupTotals[r.blood_group]) {
                groupTotals[r.blood_group].total += r.total_units;
                groupTotals[r.blood_group].available += r.available_units;
                groupTotals[r.blood_group].reserved += r.reserved_units;
                groupTotals[r.blood_group].expiring_soon += r.expiring_soon_units;
            }
        });

        // Determine shortages (if available < 50 units across network for any group)
        Object.keys(groupTotals).forEach(bg => {
            if (groupTotals[bg].available < 50) {
                groupTotals[bg].is_shortage = true;
            }
        });

        res.json({
            success: true,
            networkMatrix: result.rows,
            groupTotals
        });
    } catch (err) {
        console.error("Error in getNetworkInventorySummary:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
