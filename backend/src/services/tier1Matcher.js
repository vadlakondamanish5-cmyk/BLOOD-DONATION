const pool = require("../db/pool");
const { calculateDistance } = require("../utils/geo");
const { getCompatibleDonors, getCompatibilityScore } = require("../utils/bloodCompatibility");
const { getEligibilitySummary } = require("../utils/donorEligibility");

async function findMatchingDonors(recipientBloodGroup, hospitalLatitude, hospitalLongitude, options = {}) {
    if (!recipientBloodGroup) {
        throw new Error("Recipient blood group is required for donor matching");
    }

    const normBloodGroup = recipientBloodGroup.trim().toUpperCase();
    const compatibleGroups = getCompatibleDonors(normBloodGroup);

    if (compatibleGroups.length === 0) {
        return [];
    }

    const query = `
        SELECT id, full_name, blood_group, latitude, longitude,
               donation_consent, emergency_contact_consent, is_available,
               last_donation_date, next_eligibility_date, donation_cycle_completed,
               medical_verification_status, availability_status
        FROM donors
        WHERE blood_group = ANY($1::varchar[])
          AND donation_consent = TRUE
          AND is_available = TRUE
    `;

    const { rows: donors } = await pool.query(query, [compatibleGroups]);
    const eligibleDonors = donors.filter((donor) => {
        const eligibility = getEligibilitySummary(donor, normBloodGroup);
        return eligibility.eligible && donor.is_available === true && donor.donation_consent === true;
    });

    if (eligibleDonors.length === 0) {
        return [];
    }

    const now = new Date();
    const urgency = options.urgency ? options.urgency.toUpperCase() : "NORMAL";

    const scoredDonors = eligibleDonors.map((donor) => {
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

        const compatibilityScore = getCompatibilityScore(normBloodGroup, donor.blood_group);
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

        let responseScore = 85;
        if (donor.emergency_contact_consent) {
            responseScore = 95;
        }
        if (urgency === "CRITICAL" && donor.emergency_contact_consent) {
            responseScore = 100;
        }

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
            total_score: totalScore,
            eligibility_status: getEligibilitySummary(donor, normBloodGroup)
        };
    });

    scoredDonors.sort((a, b) => {
        if (b.total_score !== a.total_score) {
            return b.total_score - a.total_score;
        }
        return a.distance_km - b.distance_km;
    });

    return scoredDonors.map((donor, index) => ({
        ...donor,
        rank_position: index + 1
    }));
}

module.exports = {
    findMatchingDonors
};
