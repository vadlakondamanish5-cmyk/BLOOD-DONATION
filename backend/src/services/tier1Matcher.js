const pool = require("../db/pool");
const { calculateDistance } = require("../utils/geo");
const { getCompatibleDonors, getCompatibilityScore } = require("../utils/bloodCompatibility");

/**
 * Tier-1 Donor Matcher
 * Finds and ranks potentially eligible blood donors using:
 * 1. Blood-group compatibility
 * 2. Geographic proximity (Haversine formula)
 * 3. Donor availability & safety interval (90-day cooldown)
 * 4. Donor consent (donation_consent and emergency_contact_consent)
 * 5. Response likelihood
 *
 * @param {string} recipientBloodGroup - Blood group required (e.g., 'O+', 'A-')
 * @param {number} hospitalLatitude - Latitude of hospital / request
 * @param {number} hospitalLongitude - Longitude of hospital / request
 * @param {Object} [options] - Additional options (e.g. urgency)
 * @returns {Promise<Array>} Ranked list of matching donors (sanitized of sensitive personal data)
 */
async function findMatchingDonors(recipientBloodGroup, hospitalLatitude, hospitalLongitude, options = {}) {
    if (!recipientBloodGroup) {
        throw new Error("Recipient blood group is required for donor matching");
    }

    const normBloodGroup = recipientBloodGroup.trim().toUpperCase();
    const compatibleGroups = getCompatibleDonors(normBloodGroup);

    if (compatibleGroups.length === 0) {
        return [];
    }

    // Query candidate donors who have given general donation consent
    const query = `
        SELECT id, full_name, blood_group, latitude, longitude,
               donation_consent, emergency_contact_consent, is_available, last_donation_date
        FROM donors
        WHERE blood_group = ANY($1::varchar[])
          AND donation_consent = TRUE
    `;

    const { rows: donors } = await pool.query(query, [compatibleGroups]);

    if (donors.length === 0) {
        return [];
    }

    const now = new Date();
    const urgency = options.urgency ? options.urgency.toUpperCase() : "NORMAL";

    const scoredDonors = donors.map((donor) => {
        // 1. Geodesic Distance
        const distanceKm = calculateDistance(
            hospitalLatitude,
            hospitalLongitude,
            donor.latitude,
            donor.longitude
        ) ?? 25.0;

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

        // 2. Compatibility Score (100 for exact ABO/Rh match, 85 for compatible cross-match)
        const compatibilityScore = getCompatibilityScore(normBloodGroup, donor.blood_group);

        // 3. Availability Score (90-day cooldown interval safety)
        let availabilityScore = donor.is_available ? 100 : 20;
        if (donor.last_donation_date) {
            const lastDate = new Date(donor.last_donation_date);
            const daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
            if (daysSince < 60) {
                availabilityScore = Math.min(availabilityScore, 20);
            } else if (daysSince < 90) {
                availabilityScore = Math.min(availabilityScore, 65);
            }
        }

        // 4. Response Likelihood Score
        let responseScore = 85;
        if (donor.emergency_contact_consent) {
            responseScore = 95;
        }
        if (urgency === "CRITICAL" && donor.emergency_contact_consent) {
            responseScore = 100;
        }

        // 5. Total Weighted Score:
        // Distance: 35%, Compatibility: 30%, Availability: 20%, Response Likelihood: 15%
        const totalScore = Math.round(
            (distanceScore * 0.35 +
             compatibilityScore * 0.30 +
             availabilityScore * 0.20 +
             responseScore * 0.15) * 100
        ) / 100;

        return {
            donor_id: donor.id,
            full_name: donor.full_name,
            blood_group: donor.blood_group,
            distance_km: distanceKm,
            compatibility_score: compatibilityScore,
            availability_score: availabilityScore,
            response_score: responseScore,
            total_score: totalScore
            // NOTE: sensitive fields like phone, email, and exact home lat/lon are omitted
        };
    });

    // Sort by total_score descending, then closest distance
    scoredDonors.sort((a, b) => {
        if (b.total_score !== a.total_score) {
            return b.total_score - a.total_score;
        }
        return a.distance_km - b.distance_km;
    });

    // Assign rank positions
    return scoredDonors.map((donor, index) => ({
        ...donor,
        rank_position: index + 1
    }));
}

module.exports = {
    findMatchingDonors
};
