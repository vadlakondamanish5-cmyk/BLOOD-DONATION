const pool = require("../db/pool");
const { getEligibilitySummary } = require("../utils/donorEligibility");

// Get executive command center metrics
exports.getDashboardStats = async (req, res) => {
    try {
        const donorStatsRes = await pool.query(`
            SELECT 
                COUNT(*) AS total_donors,
                COUNT(*) FILTER (WHERE is_available = TRUE) AS available_donors,
                COUNT(*) FILTER (WHERE donation_consent = TRUE) AS consented_donors,
                COUNT(*) FILTER (WHERE emergency_contact_consent = TRUE) AS emergency_ready_donors
            FROM donors
        `);

        const donorRowsRes = await pool.query("SELECT * FROM donors");
        const donorEligibilitySummary = donorRowsRes.rows.reduce((summary, donor) => {
            const eligibility = getEligibilitySummary(donor);
            if (eligibility.eligible) {
                summary.eligible_donors += 1;
            } else {
                summary.not_eligible_donors += 1;
            }
            if (!eligibility.isDonationCycleCompleted) summary.waiting_for_donation_cycle += 1;
            if (eligibility.isTemporarilyIneligible) summary.medically_ineligible += 1;
            return summary;
        }, { eligible_donors: 0, not_eligible_donors: 0, waiting_for_donation_cycle: 0, medically_ineligible: 0 });

        // 2. Donors by blood group
        const bloodGroupRes = await pool.query(`
            SELECT blood_group, 
                   COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE is_available = TRUE) AS available
            FROM donors
            GROUP BY blood_group
            ORDER BY blood_group ASC
        `);

        // 3. Requests stats
        const requestStatsRes = await pool.query(`
            SELECT 
                COUNT(*) AS total_requests,
                COUNT(*) FILTER (WHERE status IN ('OPEN', 'MATCHING')) AS active_requests,
                COUNT(*) FILTER (WHERE status = 'FULFILLED') AS fulfilled_requests,
                COUNT(*) FILTER (WHERE urgency = 'CRITICAL' AND status IN ('OPEN', 'MATCHING')) AS critical_active_requests,
                COUNT(*) FILTER (WHERE urgency = 'URGENT' AND status IN ('OPEN', 'MATCHING')) AS urgent_active_requests,
                COALESCE(SUM(units_required), 0) AS total_units_required,
                COALESCE(SUM(units_required) FILTER (WHERE status = 'FULFILLED'), 0) AS units_fulfilled
            FROM blood_requests
        `);

        // 4. Matches & Notifications stats
        const matchStatsRes = await pool.query(`
            SELECT 
                COUNT(*) AS total_matches,
                COUNT(*) FILTER (WHERE status = 'ACCEPTED') AS accepted_matches,
                COUNT(*) FILTER (WHERE status = 'NOTIFIED') AS notified_matches,
                ROUND(AVG(total_score), 1) AS avg_match_score
            FROM donor_matches
        `);

        const notifStatsRes = await pool.query(`
            SELECT COUNT(*) AS total_alerts_dispatched FROM notifications
        `);

        const hospitalsRes = await pool.query(`
            SELECT COUNT(*) AS total_hospitals FROM hospitals
        `);

        // Facilities Breakdown
        const facilitiesRes = await pool.query(`
            SELECT 
                COUNT(*) AS total_facilities,
                COUNT(*) FILTER (WHERE is_active = TRUE AND operating_status != 'DEBOARDED') AS active_facilities,
                COUNT(*) FILTER (WHERE operating_status = 'DEBOARDED') AS deboarded_facilities,
                COUNT(*) FILTER (WHERE facility_type IN ('GOVERNMENT_BLOOD_BANK', 'PRIVATE_BLOOD_BANK')) AS blood_banks,
                COUNT(*) FILTER (WHERE facility_type IN ('GOVERNMENT_HOSPITAL', 'PRIVATE_HOSPITAL', 'MEDICAL_COLLEGE_HOSPITAL')) AS hospital_centres,
                COUNT(*) FILTER (WHERE facility_type = 'BLOOD_STORAGE_CENTRE') AS storage_centres,
                COUNT(*) FILTER (WHERE ownership = 'GOVERNMENT') AS govt_facilities,
                COUNT(*) FILTER (WHERE verification_status = 'VERIFIED') AS verified_facilities
            FROM facilities
        `);

        // Total blood units across active network
        const networkUnitsRes = await pool.query(`
            SELECT 
                COALESCE(SUM(inv.total_units), 0)::INT AS total_network_units,
                COALESCE(SUM(inv.available_units), 0)::INT AS available_network_units,
                COALESCE(SUM(inv.expiring_soon_units), 0)::INT AS expiring_soon_network_units
            FROM facility_blood_inventory inv
            JOIN facilities f ON inv.facility_id = f.id
            WHERE f.is_active = TRUE AND f.operating_status != 'DEBOARDED'
        `);

        // 5. Recent active emergency requests
        const recentEmergencyRes = await pool.query(`
            SELECT r.*, h.hospital_name,
                   (SELECT COUNT(*) FROM donor_matches m WHERE m.request_id = r.id) AS match_count
            FROM blood_requests r
            JOIN hospitals h ON r.hospital_id = h.id
            WHERE r.status IN ('OPEN', 'MATCHING', 'PARTIALLY_FULFILLED')
            ORDER BY 
                CASE r.urgency
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'URGENT' THEN 2
                    ELSE 3
                END ASC,
                r.created_at DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                donors: {
                    ...donorStatsRes.rows[0],
                    ...donorEligibilitySummary
                },
                blood_inventory: bloodGroupRes.rows,
                requests: requestStatsRes.rows[0],
                matches: matchStatsRes.rows[0],
                alerts: notifStatsRes.rows[0],
                hospitals: hospitalsRes.rows[0],
                facilities: {
                    ...facilitiesRes.rows[0],
                    ...networkUnitsRes.rows[0]
                },
                recent_emergencies: recentEmergencyRes.rows
            }
        });
    } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get map visualization data (facilities, hospitals, donors, active match vectors)
exports.getMapData = async (req, res) => {
    try {
        // Facilities (only active, non-deboarded)
        const facilitiesRes = await pool.query(`
            SELECT 
                f.id, f.facility_code, f.facility_name, f.facility_type, f.ownership,
                f.verification_status, f.operating_status, f.phone, f.address,
                f.latitude, f.longitude,
                COALESCE(SUM(inv.available_units), 0)::INT AS available_units,
                COALESCE(SUM(inv.total_units), 0)::INT AS total_units
            FROM facilities f
            LEFT JOIN facility_blood_inventory inv ON f.id = inv.facility_id
            WHERE f.latitude IS NOT NULL AND f.longitude IS NOT NULL
              AND f.is_active = TRUE AND f.operating_status != 'DEBOARDED'
            GROUP BY f.id
        `);

        // Hospitals
        const hospitalsRes = await pool.query(`
            SELECT h.id, h.hospital_name, h.phone, h.latitude, h.longitude, h.verified,
                   COUNT(r.id) FILTER (WHERE r.status IN ('OPEN', 'MATCHING')) AS active_requests
            FROM hospitals h
            LEFT JOIN blood_requests r ON h.id = r.hospital_id
            WHERE h.latitude IS NOT NULL AND h.longitude IS NOT NULL
            GROUP BY h.id
        `);

        // Active donors with coordinates
        const donorsRes = await pool.query(`
            SELECT id, full_name, blood_group, latitude, longitude, is_available, emergency_contact_consent
            FROM donors
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        `);

        // Active requests
        const requestsRes = await pool.query(`
            SELECT r.id, r.blood_group, r.units_required, r.urgency, r.status,
                   r.latitude, r.longitude, h.hospital_name
            FROM blood_requests r
            JOIN hospitals h ON r.hospital_id = h.id
            WHERE r.status IN ('OPEN', 'MATCHING', 'PARTIALLY_FULFILLED')
              AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
        `);

        // Top match connections for open/matching requests
        const matchVectorsRes = await pool.query(`
            SELECT m.id, m.request_id, m.donor_id, m.distance_km, m.total_score, m.status,
                   r.latitude AS hosp_lat, r.longitude AS hosp_lon, r.urgency,
                   d.latitude AS donor_lat, d.longitude AS donor_lon, d.blood_group AS donor_blood_group,
                   h.hospital_name
            FROM donor_matches m
            JOIN blood_requests r ON m.request_id = r.id
            JOIN hospitals h ON r.hospital_id = h.id
            JOIN donors d ON m.donor_id = d.id
            WHERE r.status IN ('OPEN', 'MATCHING')
              AND m.rank_position <= 3
              AND r.latitude IS NOT NULL AND d.latitude IS NOT NULL
        `);

        res.json({
            success: true,
            data: {
                facilities: facilitiesRes.rows,
                hospitals: hospitalsRes.rows,
                donors: donorsRes.rows,
                requests: requestsRes.rows,
                match_vectors: matchVectorsRes.rows
            }
        });
    } catch (err) {
        console.error("Error fetching map data:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
