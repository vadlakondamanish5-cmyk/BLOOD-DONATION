const pool = require("../db/pool");

// Get all matches
exports.getAllMatches = async (req, res) => {
    try {
        const { request_id, donor_id, status } = req.query;
        let query = `
            SELECT m.*,
                   d.full_name AS donor_name,
                   d.phone AS donor_phone,
                   d.blood_group AS donor_blood_group,
                   r.blood_group AS req_blood_group,
                   r.urgency,
                   r.units_required,
                   h.hospital_name
            FROM donor_matches m
            JOIN donors d ON m.donor_id = d.id
            JOIN blood_requests r ON m.request_id = r.id
            JOIN hospitals h ON r.hospital_id = h.id
            WHERE 1=1
        `;
        const params = [];

        if (request_id) {
            params.push(request_id);
            query += ` AND m.request_id = $${params.length}`;
        }

        if (donor_id) {
            params.push(donor_id);
            query += ` AND m.donor_id = $${params.length}`;
        }

        if (status) {
            params.push(status.toUpperCase());
            query += ` AND m.status = $${params.length}`;
        }

        query += " ORDER BY m.rank_position ASC, m.created_at DESC";

        const result = await pool.query(query, params);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error("Error fetching matches:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Donor response to match (Accept / Decline)
exports.respondToMatch = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { response } = req.body; // 'ACCEPTED' or 'DECLINED'

        const normResp = (response || "").toUpperCase();
        if (!['ACCEPTED', 'DECLINED'].includes(normResp)) {
            return res.status(400).json({
                success: false,
                message: "Response must be either 'ACCEPTED' or 'DECLINED'"
            });
        }

        await client.query("BEGIN");

        // Fetch match with request info
        const matchRes = await client.query(
            `SELECT m.*, r.units_required, r.id as request_id, r.blood_group as req_blood_group,
                    h.hospital_name
             FROM donor_matches m
             JOIN blood_requests r ON m.request_id = r.id
             JOIN hospitals h ON r.hospital_id = h.id
             WHERE m.id = $1`,
            [id]
        );

        if (matchRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Match record not found" });
        }

        const match = matchRes.rows[0];

        // Update match status
        const updatedMatchRes = await client.query(
            "UPDATE donor_matches SET status = $1 WHERE id = $2 RETURNING *",
            [normResp, id]
        );

        // Record consent audit log
        await client.query(
            `INSERT INTO consent_logs (donor_id, request_id, consent_type, consent_given)
             VALUES ($1, $2, $3, $4)`,
            [
                match.donor_id,
                match.request_id,
                normResp === 'ACCEPTED' ? 'EMERGENCY_DISPATCH_CONFIRMED' : 'EMERGENCY_DISPATCH_DECLINED',
                normResp === 'ACCEPTED'
            ]
        );

        // If accepted:
        if (normResp === 'ACCEPTED') {
            // Count total accepted matches for this request
            const countRes = await client.query(
                "SELECT COUNT(*) AS accepted_count FROM donor_matches WHERE request_id = $1 AND status = 'ACCEPTED'",
                [match.request_id]
            );
            const acceptedCount = parseInt(countRes.rows[0].accepted_count, 10);

            // Update request status accordingly
            if (acceptedCount >= match.units_required) {
                await client.query(
                    "UPDATE blood_requests SET status = 'FULFILLED' WHERE id = $1",
                    [match.request_id]
                );
            } else if (acceptedCount > 0) {
                await client.query(
                    "UPDATE blood_requests SET status = 'PARTIALLY_FULFILLED' WHERE id = $1",
                    [match.request_id]
                );
            }

            // Update donor availability & last donation date
            await client.query(
                `UPDATE donors 
                 SET is_available = FALSE, last_donation_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [match.donor_id]
            );
        }

        await client.query("COMMIT");

        res.json({
            success: true,
            message: `Donation match ${normResp.toLowerCase()} successfully`,
            data: updatedMatchRes.rows[0]
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error updating match response:", err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
};
