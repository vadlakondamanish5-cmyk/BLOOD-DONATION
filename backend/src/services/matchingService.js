const pool = require("../db/pool");
const { calculateDistance } = require("../utils/geo");
const { getCompatibleDonors, getCompatibilityScore } = require("../utils/bloodCompatibility");
const { getEligibilitySummary } = require("../utils/donorEligibility");

async function matchDonorsForRequest(requestId) {
    const requestRes = await pool.query(
        `SELECT r.*, h.hospital_name, h.phone as hospital_phone, h.latitude as hosp_lat, h.longitude as hosp_lon
         FROM blood_requests r
         JOIN hospitals h ON r.hospital_id = h.id
         WHERE r.id = $1`,
        [requestId]
    );

    if (requestRes.rows.length === 0) {
        throw new Error(`Blood request #${requestId} not found`);
    }

    const request = requestRes.rows[0];
    const reqLat = request.latitude || request.hosp_lat;
    const reqLon = request.longitude || request.hosp_lon;
    const compatibleGroups = getCompatibleDonors(request.blood_group);

    if (compatibleGroups.length === 0) {
        return [];
    }

    const query = `
        SELECT id, full_name, phone, email, blood_group, latitude, longitude,
               donation_consent, emergency_contact_consent, is_available,
               last_donation_date, next_eligibility_date,
               donation_cycle_completed, medical_verification_status, availability_status
        FROM donors
        WHERE blood_group = ANY($1::varchar[])
          AND donation_consent = TRUE
    `;

    const donorsRes = await pool.query(query, [compatibleGroups]);
    const eligibleDonors = donorsRes.rows.filter((donor) => {
        const eligibility = getEligibilitySummary(donor, request.blood_group);
        return eligibility.eligible;
    });

    if (eligibleDonors.length === 0) {
        return [];
    }

    const now = new Date();
    const scoredMatches = eligibleDonors.map((donor) => {
        const distanceKm = calculateDistance(reqLat, reqLon, donor.latitude, donor.longitude) || 15.0;
        let distanceScore = 100;
        if (distanceKm <= 3) {
            distanceScore = 100;
        } else if (distanceKm <= 7) {
            distanceScore = 92;
        } else if (distanceKm <= 15) {
            distanceScore = 80;
        } else if (distanceKm <= 30) {
            distanceScore = 60;
        } else if (distanceKm <= 50) {
            distanceScore = 40;
        } else {
            distanceScore = Math.max(10, Math.round(100 - distanceKm));
        }

        const compatScore = getCompatibilityScore(request.blood_group, donor.blood_group);
        let availScore = donor.is_available ? 100 : 20;
        if (donor.last_donation_date) {
            const lastDate = new Date(donor.last_donation_date);
            const daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
            if (daysSince < 60) {
                availScore = Math.min(availScore, 20);
            } else if (daysSince < 90) {
                availScore = Math.min(availScore, 65);
            }
        }

        let respScore = 85;
        if (donor.emergency_contact_consent) {
            respScore = 96;
        }
        if (request.urgency === 'CRITICAL' && donor.emergency_contact_consent) {
            respScore = 100;
        }

        const totalScore = Math.round(
            (distanceScore * 0.35 + compatScore * 0.30 + availScore * 0.20 + respScore * 0.15) * 100
        ) / 100;

        return {
            donor_id: donor.id,
            donor_name: donor.full_name,
            phone: donor.phone,
            blood_group: donor.blood_group,
            distance_km: distanceKm,
            response_score: respScore,
            compatibility_score: compatScore,
            availability_score: availScore,
            total_score: totalScore,
            is_available: donor.is_available,
            emergency_contact_consent: donor.emergency_contact_consent,
            eligibility_status: getEligibilitySummary(donor, request.blood_group)
        };
    });

    scoredMatches.sort((a, b) => b.total_score - a.total_score);

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(
            `DELETE FROM donor_matches 
             WHERE request_id = $1 AND status IN ('PENDING', 'NOTIFIED')`,
            [requestId]
        );

        const savedMatches = [];
        for (let i = 0; i < scoredMatches.length; i++) {
            const match = scoredMatches[i];
            const rank = i + 1;

            const insertRes = await client.query(
                `INSERT INTO donor_matches (
                    request_id, donor_id, distance_km, response_score,
                    compatibility_score, availability_score, total_score,
                    rank_position, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
                RETURNING *`,
                [
                    requestId,
                    match.donor_id,
                    match.distance_km,
                    match.response_score,
                    match.compatibility_score,
                    match.availability_score,
                    match.total_score,
                    rank
                ]
            );

            savedMatches.push({
                ...insertRes.rows[0],
                donor_name: match.donor_name,
                phone: match.phone,
                blood_group: match.blood_group,
                eligibility_status: match.eligibility_status
            });
        }

        await client.query(
            `UPDATE blood_requests 
             SET status = 'MATCHING' 
             WHERE id = $1 AND status = 'OPEN'`,
            [requestId]
        );

        await client.query("COMMIT");
        return savedMatches;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    matchDonorsForRequest
};
