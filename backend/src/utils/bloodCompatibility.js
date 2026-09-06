/**
 * ABO and Rh blood group compatibility logic for HexaVision
 */

const COMPATIBILITY_MAP = {
    // Key: Recipient Blood Group -> Value: Array of compatible donor blood groups
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
    'AB-': ['AB-', 'A-', 'B-', 'O-'],
    'O+': ['O+', 'O-'],
    'O-': ['O-']
};

/**
 * Check if a donor's blood group is compatible with a recipient's requested blood group.
 * @param {string} recipientGroup Blood group needed by recipient
 * @param {string} donorGroup Blood group of potential donor
 * @returns {boolean}
 */
function isCompatible(recipientGroup, donorGroup) {
    if (!recipientGroup || !donorGroup) return false;
    const normRecipient = recipientGroup.trim().toUpperCase();
    const normDonor = donorGroup.trim().toUpperCase();

    const allowed = COMPATIBILITY_MAP[normRecipient];
    return allowed ? allowed.includes(normDonor) : false;
}

/**
 * Calculate compatibility score between 0 and 100
 * @param {string} recipientGroup
 * @param {string} donorGroup
 * @returns {number}
 */
function getCompatibilityScore(recipientGroup, donorGroup) {
    if (!recipientGroup || !donorGroup) return 0;
    const normRecipient = recipientGroup.trim().toUpperCase();
    const normDonor = donorGroup.trim().toUpperCase();

    if (normRecipient === normDonor) {
        return 100; // Perfect match
    }

    if (isCompatible(normRecipient, normDonor)) {
        return 85; // Fully compatible alternative (e.g. O- to A+)
    }

    return 0; // Incompatible
}

/**
 * Get all compatible donor types for a recipient
 * @param {string} recipientGroup
 * @returns {string[]}
 */
function getCompatibleDonors(recipientGroup) {
    if (!recipientGroup) return [];
    return COMPATIBILITY_MAP[recipientGroup.trim().toUpperCase()] || [];
}

module.exports = {
    COMPATIBILITY_MAP,
    isCompatible,
    getCompatibilityScore,
    getCompatibleDonors
};