const pool = require("../db/pool");
const { findMatchingDonors } = require("../services/tier1Matcher");
const { broadcastToMatchedDonors } = require("../services/notificationService");
const { calculateDistance } = require("../utils/geo");
const { getCompatibleDonors } = require("../utils/bloodCompatibility");
const { getEligibilitySummary } = require("../utils/donorEligibility");

const VALID_BLOOD_GROUPS = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
const VALID_URGENCIES = ["NORMAL", "URGENT", "CRITICAL"];

/**
 * POST /api/requests
 * Creates an emergency blood request for a verified hospital,
 * executes Tier-1 matching, and stores top 10 ranked candidate donors.
 */
exports.createRequest = async (req, res) => {
    try {
        const {
            hospital_id,
            blood_group,
            units_required,
            urgency,
            required_by,
            latitude,
            longitude
        } = req.body;

        // 1. Validate Input Fields
        if (!hospital_id || isNaN(parseInt(hospital_id, 10))) {
            return res.status(400).json({
                success: false,
                message: "hospital_id is required and must be a valid integer"
            });
        }

        if (!blood_group || typeof blood_group !== "string") {
            return res.status(400).json({
                success: false,
                message: "blood_group is required"
            });
        }

        const normBloodGroup = blood_group.trim().toUpperCase();
        if (!VALID_BLOOD_GROUPS.includes(normBloodGroup)) {
            return res.status(400).json({
                success: false,
                message: `blood_group must be one of: ${VALID_BLOOD_GROUPS.join(", ")}`
            });
        }

        const units = parseInt(units_required, 10);
        if (isNaN(units) || units <= 0) {
            return res.status(400).json({
                success: false,
                message: "units_required must be an integer greater than 0"
            });
        }

        if (!urgency || typeof urgency !== "string") {
            return res.status(400).json({
                success: false,
                message: "urgency is required"
            });
        }

        const normUrgency = urgency.trim().toUpperCase();
        if (!VALID_URGENCIES.includes(normUrgency)) {
            return res.status(400).json({
                success: false,
                message: `urgency must be one of: ${VALID_URGENCIES.join(", ")}`
            });
        }

        if (!required_by || isNaN(Date.parse(required_by))) {
            return res.status(400).json({
                success: false,
                message: "required_by must be a valid date/time ISO string or timestamp"
            });
        }

        let reqLat = latitude !== undefined && latitude !== null && latitude !== "" ? parseFloat(latitude) : null;
        let reqLon = longitude !== undefined && longitude !== null && longitude !== "" ? parseFloat(longitude) : null;

        if (reqLat !== null && (isNaN(reqLat) || reqLat < -90 || reqLat > 90)) {
            return res.status(400).json({
                success: false,
                message: "latitude must be a valid number between -90 and 90"
            });
        }

        if (reqLon !== null && (isNaN(reqLon) || reqLon < -180 || reqLon > 180)) {
            return res.status(400).json({
                success: false,
                message: "longitude must be a valid number between -180 and 180"
            });
        }

        // 2. Verify Hospital
        const hospitalQuery = `
            SELECT id, hospital_name, contact_person, phone, email, latitude, longitude, verified
            FROM hospitals
            WHERE id = $1
        `;
        const { rows: hospitalRows } = await pool.query(hospitalQuery, [hospital_id]);

        if (hospitalRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Hospital with ID ${hospital_id} does not exist`
            });
        }

        const hospital = hospitalRows[0];

        if (!hospital.verified) {
            return res.status(403).json({
                success: false,
                message: "Hospital is not verified to create blood requests. Verification required."
            });
        }

        // Fall back to hospital coordinates if not explicitly supplied in request
        if (reqLat === null || reqLon === null) {
            reqLat = parseFloat(hospital.latitude);
            reqLon = parseFloat(hospital.longitude);
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // 3. Create Blood Request (Initial status: OPEN)
            const insertRequestQuery = `
                INSERT INTO blood_requests (
                    hospital_id, blood_group, units_required, urgency,
                    required_by, status, latitude, longitude
                ) VALUES ($1, $2, $3, $4, $5, 'OPEN', $6, $7)
                RETURNING *
            `;
            const { rows: reqRows } = await client.query(insertRequestQuery, [
                hospital.id,
                normBloodGroup,
                units,
                normUrgency,
                new Date(required_by).toISOString(),
                reqLat,
                reqLon
            ]);
            let createdRequest = reqRows[0];

            // 4. Automatic Tier-1 Matching
            const candidateDonors = await findMatchingDonors(
                normBloodGroup,
                reqLat,
                reqLon,
                { urgency: normUrgency }
            );

            // 5. Save Top 10 Matches
            const top10Matches = candidateDonors.slice(0, 10);
            const savedRankedMatches = [];

            for (let i = 0; i < top10Matches.length; i++) {
                const candidate = top10Matches[i];
                const rank = i + 1;

                const insertMatchQuery = `
                    INSERT INTO donor_matches (
                        request_id, donor_id, distance_km, response_score,
                        compatibility_score, availability_score, total_score,
                        rank_position, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
                    RETURNING id, request_id, donor_id, distance_km, total_score, rank_position, status, created_at
                `;

                const { rows: matchRows } = await client.query(insertMatchQuery, [
                    createdRequest.id,
                    candidate.donor_id,
                    candidate.distance_km,
                    candidate.response_score,
                    candidate.compatibility_score,
                    candidate.availability_score,
                    candidate.total_score,
                    rank
                ]);

                // Sanitize response: do NOT expose donor phone numbers, emails, or passwords
                savedRankedMatches.push({
                    match_id: matchRows[0].id,
                    rank_position: rank,
                    donor_id: candidate.donor_id,
                    full_name: candidate.full_name,
                    blood_group: candidate.blood_group,
                    distance_km: parseFloat(candidate.distance_km),
                    total_score: parseFloat(candidate.total_score),
                    status: matchRows[0].status
                });
            }

            // 6. Emergency Priority: update status to MATCHING for URGENT and CRITICAL
            if (normUrgency === "URGENT" || normUrgency === "CRITICAL") {
                const updateStatusQuery = `
                    UPDATE blood_requests
                    SET status = 'MATCHING'
                    WHERE id = $1
                    RETURNING *
                `;
                const { rows: updatedRows } = await client.query(updateStatusQuery, [createdRequest.id]);
                createdRequest = updatedRows[0];
            }

            await client.query("COMMIT");

            // 7. Return 201 with created request & ranked matches
            return res.status(201).json({
                success: true,
                message: "Blood request created successfully",
                data: {
                    request: createdRequest,
                    hospital: {
                        id: hospital.id,
                        hospital_name: hospital.hospital_name,
                        contact_person: hospital.contact_person,
                        phone: hospital.phone
                    },
                    matched_donor_count: savedRankedMatches.length,
                    ranked_matches: savedRankedMatches
                }
            });
        } catch (txError) {
            await client.query("ROLLBACK");
            throw txError;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Error creating blood request:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error occurred while creating blood request"
        });
    }
};

/**
 * GET /api/requests/:id
 * Returns blood request details, requesting hospital info,
 * current status, units required, matched donor count, and sanitized ranked results.
 */
exports.getRequestById = async (req, res) => {
    try {
        const { id } = req.params;
        const requestId = parseInt(id, 10);

        if (isNaN(requestId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid request ID parameter"
            });
        }

        const requestQuery = `
            SELECT r.*,
                   h.hospital_name,
                   h.contact_person,
                   h.phone AS hospital_phone,
                   h.email AS hospital_email,
                   h.latitude AS hospital_latitude,
                   h.longitude AS hospital_longitude,
                   h.verified AS hospital_verified
            FROM blood_requests r
            JOIN hospitals h ON r.hospital_id = h.id
            WHERE r.id = $1
        `;
        const { rows: requestRows } = await pool.query(requestQuery, [requestId]);

        if (requestRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Blood request #${requestId} not found`
            });
        }

        const request = requestRows[0];

        const matchesQuery = `
            SELECT m.id AS match_id,
                   m.rank_position,
                   m.donor_id,
                   d.full_name,
                   d.blood_group,
                   m.distance_km,
                   m.compatibility_score,
                   m.availability_score,
                   m.response_score,
                   m.total_score,
                   m.status,
                   m.created_at
            FROM donor_matches m
            JOIN donors d ON m.donor_id = d.id
            WHERE m.request_id = $1
            ORDER BY m.rank_position ASC, m.total_score DESC
        `;
        const { rows: rankedMatches } = await pool.query(matchesQuery, [requestId]);

        const compatibleGroups = getCompatibleDonors(request.blood_group);
        const donorCandidatesRes = compatibleGroups.length
            ? await pool.query(
                `SELECT * FROM donors
                 WHERE blood_group = ANY($1::varchar[])
                   AND donation_consent = TRUE`,
                [compatibleGroups]
            )
            : { rows: [] };

        const donorCards = donorCandidatesRes.rows.map((donor) => {
            const summary = getEligibilitySummary(donor, request.blood_group);
            const distanceKm = donor.latitude && donor.longitude && request.latitude && request.longitude
                ? calculateDistance(request.latitude, request.longitude, donor.latitude, donor.longitude)
                : null;
            return {
                donor_id: donor.id,
                full_name: donor.full_name,
                blood_group: donor.blood_group,
                distance_km: distanceKm,
                availability: donor.is_available,
                medical_verification_status: donor.medical_verification_status || "PENDING",
                availability_status: donor.availability_status || (donor.is_available ? "AVAILABLE" : "UNAVAILABLE"),
                next_eligibility_date: donor.next_eligibility_date || null,
                last_donation_date: donor.last_donation_date,
                ...summary
            };
        });

        const eligibleDonors = donorCards.filter((donor) => donor.eligible);
        const ineligibleDonors = donorCards.filter((donor) => !donor.eligible);

        return res.json({
            success: true,
            message: "Blood request details retrieved successfully",
            data: {
                request: {
                    id: request.id,
                    hospital_id: request.hospital_id,
                    blood_group: request.blood_group,
                    units_required: request.units_required,
                    urgency: request.urgency,
                    status: request.status,
                    required_by: request.required_by,
                    latitude: request.latitude,
                    longitude: request.longitude,
                    created_at: request.created_at
                },
                hospital: {
                    id: request.hospital_id,
                    hospital_name: request.hospital_name,
                    contact_person: request.contact_person,
                    phone: request.hospital_phone,
                    verified: request.hospital_verified
                },
                current_status: request.status,
                units_required: request.units_required,
                matched_donor_count: rankedMatches.length,
                eligible_donors: eligibleDonors,
                ineligible_donors: ineligibleDonors,
                ranked_matches: rankedMatches.map((m) => ({
                    match_id: m.match_id,
                    rank_position: m.rank_position,
                    donor_id: m.donor_id,
                    full_name: m.full_name,
                    blood_group: m.blood_group,
                    distance_km: parseFloat(m.distance_km),
                    compatibility_score: parseFloat(m.compatibility_score),
                    availability_score: parseFloat(m.availability_score),
                    response_score: parseFloat(m.response_score),
                    total_score: parseFloat(m.total_score),
                    status: m.status,
                    created_at: m.created_at
                }))
            }
        });
    } catch (err) {
        console.error("Error retrieving blood request:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error occurred while retrieving blood request"
        });
    }
};

/**
 * GET /api/requests
 * Returns currently open or matching emergency requests.
 * Supports optional filtering:
 *   ?urgency=CRITICAL
 *   ?blood_group=O+
 *   ?status=OPEN (or status=ALL)
 */
exports.getAllRequests = async (req, res) => {
    try {
        const { urgency, blood_group, status } = req.query;

        let query = `
            SELECT r.*,
                   h.hospital_name,
                   h.phone AS hospital_phone,
                   h.latitude AS hospital_latitude,
                   h.longitude AS hospital_longitude,
                   COUNT(m.id) AS matched_donor_count
            FROM blood_requests r
            JOIN hospitals h ON r.hospital_id = h.id
            LEFT JOIN donor_matches m ON r.id = m.request_id
            WHERE 1=1
        `;
        const params = [];

        // By default, return OPEN or MATCHING emergency requests
        if (status) {
            if (status.toUpperCase() !== "ALL") {
                params.push(status.toUpperCase());
                query += ` AND r.status = $${params.length}`;
            }
        } else {
            query += " AND r.status IN ('OPEN', 'MATCHING')";
        }

        if (urgency) {
            const normUrgency = urgency.trim().toUpperCase();
            if (VALID_URGENCIES.includes(normUrgency)) {
                params.push(normUrgency);
                query += ` AND r.urgency = $${params.length}`;
            }
        }

        if (blood_group) {
            const normBg = blood_group.trim().toUpperCase();
            if (VALID_BLOOD_GROUPS.includes(normBg)) {
                params.push(normBg);
                query += ` AND r.blood_group = $${params.length}`;
            }
        }

        query += `
            GROUP BY r.id, h.hospital_name, h.phone, h.latitude, h.longitude
            ORDER BY
                CASE r.urgency
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'URGENT' THEN 2
                    WHEN 'NORMAL' THEN 3
                    ELSE 4
                END ASC,
                r.created_at DESC
        `;

        const { rows } = await pool.query(query, params);

        return res.json({
            success: true,
            message: "Open blood requests retrieved successfully",
            count: rows.length,
            data: rows.map((row) => ({
                id: row.id,
                hospital_id: row.hospital_id,
                hospital_name: row.hospital_name,
                hospital_phone: row.hospital_phone,
                blood_group: row.blood_group,
                units_required: row.units_required,
                urgency: row.urgency,
                status: row.status,
                required_by: row.required_by,
                latitude: row.latitude,
                longitude: row.longitude,
                matched_donor_count: parseInt(row.matched_donor_count, 10) || 0,
                created_at: row.created_at
            }))
        });
    } catch (err) {
        console.error("Error retrieving open blood requests:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error occurred while retrieving blood requests"
        });
    }
};

/**
 * PATCH /api/requests/:id/status
 * Updates request status (e.g. FULFILLED, CANCELLED)
 */
exports.updateRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowed = ['OPEN', 'MATCHING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'];
        if (!status || !allowed.includes(status.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${allowed.join(", ")}`
            });
        }

        const { rows } = await pool.query(
            "UPDATE blood_requests SET status = $1 WHERE id = $2 RETURNING *",
            [status.toUpperCase(), id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Blood request #${id} not found`
            });
        }

        return res.json({
            success: true,
            message: `Blood request status updated to ${status.toUpperCase()}`,
            data: rows[0]
        });
    } catch (err) {
        console.error("Error updating request status:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error occurred while updating request status"
        });
    }
};

/**
 * POST /api/requests/:id/match
 * Re-runs Tier-1 matching engine for an existing request
 */
exports.triggerMatching = async (req, res) => {
    try {
        const { id } = req.params;
        const requestId = parseInt(id, 10);

        const reqQuery = "SELECT * FROM blood_requests WHERE id = $1";
        const { rows: reqRows } = await pool.query(reqQuery, [requestId]);
        if (reqRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Blood request #${id} not found`
            });
        }

        const request = reqRows[0];
        const candidates = await findMatchingDonors(
            request.blood_group,
            request.latitude,
            request.longitude,
            { urgency: request.urgency }
        );

        const top10 = candidates.slice(0, 10);

        // Replace pending matches
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query(
                "DELETE FROM donor_matches WHERE request_id = $1 AND status IN ('PENDING', 'NOTIFIED')",
                [requestId]
            );

            for (let i = 0; i < top10.length; i++) {
                const match = top10[i];
                await client.query(
                    `INSERT INTO donor_matches (
                        request_id, donor_id, distance_km, response_score,
                        compatibility_score, availability_score, total_score,
                        rank_position, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')`,
                    [
                        requestId,
                        match.donor_id,
                        match.distance_km,
                        match.response_score,
                        match.compatibility_score,
                        match.availability_score,
                        match.total_score,
                        i + 1
                    ]
                );
            }
            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }

        return res.json({
            success: true,
            message: `Matched and ranked ${top10.length} donor(s)`,
            count: top10.length,
            data: top10
        });
    } catch (err) {
        console.error("Error re-running matching:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error occurred during matching"
        });
    }
};

/**
 * POST /api/requests/:id/broadcast
 * Broadcasts emergency alert notifications to top ranked matches
 */
exports.broadcastAlerts = async (req, res) => {
    try {
        const { id } = req.params;
        const { top_n = 5, channel = "SMS" } = req.body;

        const notifications = await broadcastToMatchedDonors(id, top_n, channel);
        return res.json({
            success: true,
            message: `Dispatched ${notifications.length} emergency alert(s) via ${channel}`,
            count: notifications.length,
            data: notifications
        });
    } catch (err) {
        console.error("Error broadcasting alerts:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal server error occurred while broadcasting alerts"
        });
    }
};
