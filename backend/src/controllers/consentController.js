const pool = require("../db/pool");

// Get all consent audit logs
exports.getConsentLogs = async (req, res) => {
    try {
        const { donor_id, request_id } = req.query;
        let query = `
            SELECT c.*,
                   d.full_name AS donor_name,
                   d.phone AS donor_phone,
                   d.blood_group AS donor_blood_group,
                   r.blood_group AS req_blood_group,
                   h.hospital_name
            FROM consent_logs c
            JOIN donors d ON c.donor_id = d.id
            LEFT JOIN blood_requests r ON c.request_id = r.id
            LEFT JOIN hospitals h ON r.hospital_id = h.id
            WHERE 1=1
        `;
        const params = [];

        if (donor_id) {
            params.push(donor_id);
            query += ` AND c.donor_id = $${params.length}`;
        }

        if (request_id) {
            params.push(request_id);
            query += ` AND c.request_id = $${params.length}`;
        }

        query += " ORDER BY c.consent_time DESC LIMIT 100";

        const result = await pool.query(query, params);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error("Error fetching consent logs:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Explicitly record consent change
exports.recordConsentLog = async (req, res) => {
    try {
        const { donor_id, request_id, consent_type, consent_given } = req.body;
        if (!donor_id || !consent_type || consent_given === undefined) {
            return res.status(400).json({
                success: false,
                message: "donor_id, consent_type, and consent_given are required"
            });
        }

        const query = `
            INSERT INTO consent_logs (donor_id, request_id, consent_type, consent_given)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await pool.query(query, [
            donor_id,
            request_id || null,
            consent_type,
            Boolean(consent_given)
        ]);

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error("Error recording consent log:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
