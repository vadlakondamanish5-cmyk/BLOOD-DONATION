const pool = require("../db/pool");

/**
 * Broadcast emergency notification to top ranked matched donors for a request
 * @param {number} requestId
 * @param {number} topN Max number of donors to notify (default 5)
 * @param {string} channel 'SMS', 'PUSH', or 'EMAIL'
 * @returns {Promise<Array>} List of generated notifications
 */
async function broadcastToMatchedDonors(requestId, topN = 5, channel = "SMS") {
    // 1. Fetch request and hospital details
    const reqRes = await pool.query(
        `SELECT r.*, h.hospital_name, h.phone as hospital_phone
         FROM blood_requests r
         JOIN hospitals h ON r.hospital_id = h.id
         WHERE r.id = $1`,
        [requestId]
    );

    if (reqRes.rows.length === 0) {
        throw new Error(`Blood request #${requestId} not found`);
    }

    const request = reqRes.rows[0];

    // 2. Fetch top pending matches
    const matchesRes = await pool.query(
        `SELECT m.id as match_id, m.donor_id, m.rank_position, m.total_score,
                d.full_name, d.phone, d.email, d.blood_group
         FROM donor_matches m
         JOIN donors d ON m.donor_id = d.id
         WHERE m.request_id = $1 AND m.status IN ('PENDING', 'NOTIFIED')
         ORDER BY m.rank_position ASC
         LIMIT $2`,
        [requestId, topN]
    );

    const matches = matchesRes.rows;
    if (matches.length === 0) {
        return [];
    }

    const notifications = [];
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        for (const match of matches) {
            let message = "";
            if (request.urgency === "CRITICAL") {
                message = `🚨 CRITICAL SOS: ${request.hospital_name} immediately needs ${request.units_required} unit(s) of ${request.blood_group} blood. Your match rank is #${match.rank_position} (Score: ${match.total_score}%). Can you donate? Reply or tap link to confirm.`;
            } else if (request.urgency === "URGENT") {
                message = `⚠️ URGENT ALERT: ${request.hospital_name} requires ${request.blood_group} blood within hours. You are a compatible match (#${match.rank_position}). Please confirm availability in HexaVision.`;
            } else {
                message = `🩸 HexaVision Donation Request: ${request.hospital_name} is requesting ${request.blood_group} blood. We found a high match score (${match.total_score}%) for you. Thank you for your support!`;
            }

            // Insert notification log
            const notifRes = await client.query(
                `INSERT INTO notifications (donor_id, request_id, channel, message, status)
                 VALUES ($1, $2, $3, $4, 'DELIVERED')
                 RETURNING *`,
                [match.donor_id, requestId, channel, message]
            );

            // Update match status to NOTIFIED
            await client.query(
                `UPDATE donor_matches
                 SET status = 'NOTIFIED'
                 WHERE id = $1`,
                [match.match_id]
            );

            notifications.push({
                ...notifRes.rows[0],
                donor_name: match.full_name,
                phone: match.phone,
                donor_blood_group: match.blood_group,
                rank_position: match.rank_position
            });
        }

        await client.query("COMMIT");
        return notifications;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    broadcastToMatchedDonors
};
