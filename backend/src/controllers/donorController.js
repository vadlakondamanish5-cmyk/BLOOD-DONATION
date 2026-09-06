const pool = require("../db/pool");

// Get all donors with filtering
exports.getAllDonors = async (req, res) => {
    try {
        const { blood_group, is_available, search } = req.query;
        let query = `
            SELECT d.*,
                   (SELECT COUNT(*) FROM donor_matches m WHERE m.donor_id = d.id AND m.status = 'ACCEPTED') AS donations_completed
            FROM donors d
            WHERE 1=1
        `;
        const params = [];

        if (blood_group) {
            params.push(blood_group);
            query += ` AND d.blood_group = $${params.length}`;
        }

        if (is_available !== undefined) {
            params.push(is_available === "true" || is_available === true);
            query += ` AND d.is_available = $${params.length}`;
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (d.full_name ILIKE $${params.length} OR d.phone ILIKE $${params.length} OR d.email ILIKE $${params.length})`;
        }

        query += " ORDER BY d.created_at DESC";

        const result = await pool.query(query, params);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error("Error fetching donors:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get single donor by ID
exports.getDonorById = async (req, res) => {
    try {
        const { id } = req.params;
        const donorRes = await pool.query("SELECT * FROM donors WHERE id = $1", [id]);
        if (donorRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Donor not found" });
        }

        // Fetch matches history
        const matchesRes = await pool.query(
            `SELECT m.*, r.blood_group as req_blood_group, r.urgency, h.hospital_name
             FROM donor_matches m
             JOIN blood_requests r ON m.request_id = r.id
             JOIN hospitals h ON r.hospital_id = h.id
             WHERE m.donor_id = $1
             ORDER BY m.created_at DESC
             LIMIT 10`,
            [id]
        );

        // Fetch consent logs
        const consentRes = await pool.query(
            `SELECT * FROM consent_logs WHERE donor_id = $1 ORDER BY consent_time DESC LIMIT 10`,
            [id]
        );

        res.json({
            success: true,
            data: {
                ...donorRes.rows[0],
                matches: matchesRes.rows,
                consent_logs: consentRes.rows
            }
        });
    } catch (err) {
        console.error("Error fetching donor:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Register new donor
exports.createDonor = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            full_name,
            phone,
            email,
            blood_group,
            latitude,
            longitude,
            donation_consent = false,
            emergency_contact_consent = false,
            is_available = true,
            last_donation_date = null
        } = req.body;

        if (!full_name || !phone || !blood_group) {
            return res.status(400).json({
                success: false,
                message: "Full name, phone, and blood group are required"
            });
        }

        await client.query("BEGIN");

        const insertDonorQuery = `
            INSERT INTO donors (
                full_name, phone, email, blood_group, latitude, longitude,
                donation_consent, emergency_contact_consent, is_available, last_donation_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const donorRes = await client.query(insertDonorQuery, [
            full_name,
            phone,
            email || null,
            blood_group.toUpperCase(),
            latitude || 12.9716,
            longitude || 77.5946,
            Boolean(donation_consent),
            Boolean(emergency_contact_consent),
            Boolean(is_available),
            last_donation_date || null
        ]);

        const donor = donorRes.rows[0];

        // Record initial consent in consent_logs
        await client.query(
            `INSERT INTO consent_logs (donor_id, consent_type, consent_given)
             VALUES ($1, 'GENERAL_DONATION', $2),
                    ($1, 'EMERGENCY_CONTACT', $3)`,
            [donor.id, Boolean(donation_consent), Boolean(emergency_contact_consent)]
        );

        await client.query("COMMIT");
        res.status(201).json({ success: true, data: donor });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error creating donor:", err);
        if (err.code === "23505") { // Unique constraint on phone
            return res.status(409).json({ success: false, message: "Phone number already registered" });
        }
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
};

// Update donor details & consent
exports.updateDonor = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const {
            full_name,
            phone,
            email,
            blood_group,
            latitude,
            longitude,
            donation_consent,
            emergency_contact_consent,
            is_available,
            last_donation_date
        } = req.body;

        await client.query("BEGIN");

        // Fetch current
        const currentRes = await client.query("SELECT * FROM donors WHERE id = $1", [id]);
        if (currentRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Donor not found" });
        }
        const current = currentRes.rows[0];

        const updateQuery = `
            UPDATE donors SET
                full_name = COALESCE($1, full_name),
                phone = COALESCE($2, phone),
                email = COALESCE($3, email),
                blood_group = COALESCE($4, blood_group),
                latitude = COALESCE($5, latitude),
                longitude = COALESCE($6, longitude),
                donation_consent = COALESCE($7, donation_consent),
                emergency_contact_consent = COALESCE($8, emergency_contact_consent),
                is_available = COALESCE($9, is_available),
                last_donation_date = COALESCE($10, last_donation_date),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $11
            RETURNING *
        `;

        const result = await client.query(updateQuery, [
            full_name || null,
            phone || null,
            email || null,
            blood_group ? blood_group.toUpperCase() : null,
            latitude !== undefined ? latitude : null,
            longitude !== undefined ? longitude : null,
            donation_consent !== undefined ? Boolean(donation_consent) : null,
            emergency_contact_consent !== undefined ? Boolean(emergency_contact_consent) : null,
            is_available !== undefined ? Boolean(is_available) : null,
            last_donation_date !== undefined ? last_donation_date : null,
            id
        ]);

        // If consent was toggled, record audit entry
        if (donation_consent !== undefined && donation_consent !== current.donation_consent) {
            await client.query(
                `INSERT INTO consent_logs (donor_id, consent_type, consent_given)
                 VALUES ($1, 'GENERAL_DONATION_CHANGE', $2)`,
                [id, Boolean(donation_consent)]
            );
        }

        if (emergency_contact_consent !== undefined && emergency_contact_consent !== current.emergency_contact_consent) {
            await client.query(
                `INSERT INTO consent_logs (donor_id, consent_type, consent_given)
                 VALUES ($1, 'EMERGENCY_CONTACT_CHANGE', $2)`,
                [id, Boolean(emergency_contact_consent)]
            );
        }

        await client.query("COMMIT");
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error updating donor:", err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
};

// Delete donor
exports.deleteDonor = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("DELETE FROM donors WHERE id = $1 RETURNING id", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Donor not found" });
        }
        res.json({ success: true, message: "Donor removed successfully" });
    } catch (err) {
        console.error("Error deleting donor:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
