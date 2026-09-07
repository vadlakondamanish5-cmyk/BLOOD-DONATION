const pool = require("../db/pool");
const { buildNextEligibilityDate, getEligibilitySummary, normalizeStatus } = require("../utils/donorEligibility");

const VALID_MEDICAL_CONDITIONS = new Set([
    "diabetes",
    "high blood pressure",
    "asthma",
    "thyroid disorder",
    "anemia low hemoglobin",
    "migraine",
    "heart disease",
    "kidney disease",
    "liver disease",
    "bleeding clotting disorder",
    "epilepsy seizure disorder",
    "infectious disease",
    "cancer",
    "other"
]);

const canonicalizeCondition = (value) => String(value || "")
    .toLowerCase()
    .replace(/[\/&()]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getMedicalConditionsInput = (body = {}) => {
    const candidates = [
        body.medicalConditions,
        body.medical_conditions,
        body.healthConditions,
        body.health_condition,
        body.illness,
        body.illnesses,
        body.disease,
        body.diseases,
        body.conditions,
        body.condition,
        body.medical_history
    ];

    for (const item of candidates) {
        if (item !== undefined && item !== null && item !== "") {
            return item;
        }
    }

    return [];
};

const normalizeMedicalConditions = (rawValue) => {
    if (!rawValue) return null;
    const values = [];
    const queue = Array.isArray(rawValue) ? [...rawValue] : [rawValue];

    while (queue.length > 0) {
        const item = queue.shift();
        if (item === undefined || item === null || item === "") continue;
        if (Array.isArray(item)) {
            queue.push(...item);
            continue;
        }

        if (typeof item === "object") {
            if (Array.isArray(item.value)) {
                queue.push(...item.value);
            } else if (item.value !== undefined) {
                queue.push(item.value);
            } else if (item.name) {
                queue.push(item.name);
            }
            continue;
        }

        const pieces = String(item)
            .split(/[\n;]+/)
            .map((segment) => segment.trim())
            .filter(Boolean);

        values.push(...pieces);
    }

    const cleaned = [];
    for (const value of values) {
        const normalized = String(value).trim();
        if (!normalized) continue;

        const canonical = canonicalizeCondition(normalized);
        if (canonical === "none of the above" || canonical === "none") continue;

        cleaned.push(normalized);
    }

    return cleaned.length > 0 ? [...new Set(cleaned)].join(", ") : null;
};

const attachEligibility = (donor, requestBloodGroup = null) => {
    if (!donor) return donor;
    const eligibilitySummary = getEligibilitySummary(donor, requestBloodGroup);
    return {
        ...donor,
        ...eligibilitySummary,
        isEligible: eligibilitySummary.eligible,
        availability: donor.is_available,
        consent: donor.donation_consent,
        next_eligibility_date: donor.next_eligibility_date || buildNextEligibilityDate(donor.last_donation_date),
        donation_cycle_completed: eligibilitySummary.isDonationCycleCompleted,
        medical_verification_status: donor.medical_verification_status || "VERIFIED",
        availability_status: donor.availability_status || (donor.is_available ? "AVAILABLE" : "UNAVAILABLE")
    };
};

const normalizeDonorValues = (body = {}, currentDonor = null) => {
    const lastDonationDate = body.last_donation_date !== undefined ? body.last_donation_date : (currentDonor?.last_donation_date || null);
    const donationCount = Number(body.donation_count ?? currentDonor?.donation_count ?? 0);
    const nextEligibilityDate = body.next_eligibility_date !== undefined
        ? body.next_eligibility_date
        : (lastDonationDate ? buildNextEligibilityDate(lastDonationDate) : (currentDonor?.next_eligibility_date || null));
    
    // Check cycle completion dynamically
    const cycleCompleted = body.donation_cycle_completed !== undefined
        ? Boolean(body.donation_cycle_completed)
        : (lastDonationDate ? (nextEligibilityDate ? new Date() >= new Date(nextEligibilityDate) : true) : true);

    const medicalVerificationStatus = normalizeStatus(body.medical_verification_status ?? currentDonor?.medical_verification_status ?? "VERIFIED");
    const rawAvailability = body.is_available ?? currentDonor?.is_available ?? true;
    const isAvailable = cycleCompleted ? Boolean(rawAvailability) : false;
    const availabilityStatus = normalizeStatus(
        body.availability_status ?? currentDonor?.availability_status ?? (cycleCompleted ? (isAvailable ? "AVAILABLE" : "UNAVAILABLE") : "ON_COOLDOWN")
    );

    return {
        lastDonationDate,
        donationCount,
        nextEligibilityDate,
        cycleCompleted,
        medicalVerificationStatus,
        availabilityStatus,
        isAvailable
    };
};

exports.getAllDonors = async (req, res) => {
    try {
        const { blood_group, is_available, search, eligible } = req.query;
        let query = `
            SELECT d.*,
                   (SELECT COUNT(*) FROM donor_matches m WHERE m.donor_id = d.id AND m.status = 'ACCEPTED') AS donations_completed
            FROM donors d
            WHERE 1=1
        `;
        const params = [];

        if (blood_group && blood_group !== "ALL") {
            params.push(blood_group);
            query += ` AND d.blood_group = $${params.length}`;
        }

        if (is_available !== undefined && is_available !== "") {
            params.push(is_available === "true" || is_available === true);
            query += ` AND d.is_available = $${params.length}`;
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (d.full_name ILIKE $${params.length} OR d.phone ILIKE $${params.length} OR d.email ILIKE $${params.length})`;
        }

        query += " ORDER BY d.created_at DESC";

        const result = await pool.query(query, params);
        let mapped = result.rows.map((donor) => attachEligibility(donor));

        if (eligible !== undefined && eligible !== "") {
            const wantEligible = eligible === "true" || eligible === true;
            mapped = mapped.filter((d) => d.eligible === wantEligible);
        }

        const eligibleCount = mapped.filter((d) => d.eligible).length;
        const notEligibleCount = mapped.length - eligibleCount;
        const availableCount = mapped.filter((d) => d.eligible && d.is_available && d.donation_consent).length;

        res.json({
            success: true,
            count: mapped.length,
            summary: {
                total: mapped.length,
                eligible: eligibleCount,
                not_eligible: notEligibleCount,
                available: availableCount
            },
            data: mapped
        });
    } catch (err) {
        console.error("Error fetching donors:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getDonorById = async (req, res) => {
    try {
        const { id } = req.params;
        const donorRes = await pool.query("SELECT * FROM donors WHERE id = $1", [id]);
        if (donorRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Donor not found" });
        }

        const donor = donorRes.rows[0];
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

        const consentRes = await pool.query(
            `SELECT * FROM consent_logs WHERE donor_id = $1 ORDER BY consent_time DESC LIMIT 10`,
            [id]
        );

        res.json({
            success: true,
            data: {
                ...attachEligibility(donor),
                matches: matchesRes.rows,
                consent_logs: consentRes.rows
            }
        });
    } catch (err) {
        console.error("Error fetching donor:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getDonorEligibility = async (req, res) => {
    try {
        const { id } = req.params;
        const { request_blood_group } = req.query;
        const donorRes = await pool.query("SELECT * FROM donors WHERE id = $1", [id]);
        if (donorRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Donor not found" });
        }

        const donor = donorRes.rows[0];
        const summary = getEligibilitySummary(donor, request_blood_group || null);

        return res.json({ success: true, data: { ...donor, ...summary } });
    } catch (err) {
        console.error("Error fetching donor eligibility:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getDonorDonationSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const donorRes = await pool.query("SELECT * FROM donors WHERE id = $1", [id]);
        if (donorRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Donor not found" });
        }

        const donor = donorRes.rows[0];
        return res.json({
            success: true,
            data: {
                donor_id: donor.id,
                last_donation_date: donor.last_donation_date,
                next_eligibility_date: donor.next_eligibility_date || buildNextEligibilityDate(donor.last_donation_date),
                donation_count: Number(donor.donation_count || 0),
                donation_cycle_completed: donor.donation_cycle_completed || (donor.last_donation_date ? new Date() >= new Date(donor.next_eligibility_date || buildNextEligibilityDate(donor.last_donation_date)) : true),
                donation_status: donordonorStatus(donor)
            }
        });
    } catch (err) {
        console.error("Error fetching donor donation summary:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

const donordonorStatus = (donor) => {
    const cycleCompleted = donor.last_donation_date ? new Date() >= new Date(donor.next_eligibility_date || buildNextEligibilityDate(donor.last_donation_date)) : true;
    if (!donor.last_donation_date) return "FIRST_TIME_ELIGIBLE";
    if (!cycleCompleted) return "NOT_COMPLETED";
    if (donor.medical_verification_status && normalizeStatus(donor.medical_verification_status) !== "VERIFIED") return "PRELIMINARY_ELIGIBILITY_COMPLETED";
    return "ELIGIBLE_AVAILABLE";
};

exports.recordDonation = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        const donorRes = await client.query("SELECT * FROM donors WHERE id = $1", [id]);
        if (donorRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Donor not found" });
        }

        const currentDonor = donorRes.rows[0];
        const donationDate = req.body.donation_date || new Date().toISOString().slice(0, 10);
        const nextEligibilityDate = req.body.next_eligibility_date || buildNextEligibilityDate(donationDate);
        const updatedCount = Number(currentDonor.donation_count || 0) + 1;
        const updated = await client.query(
            `UPDATE donors
             SET last_donation_date = $1,
                 donation_count = $2,
                 next_eligibility_date = $3,
                 donation_cycle_completed = FALSE,
                 is_available = FALSE,
                 availability_status = 'ON_COOLDOWN',
                 medical_verification_status = COALESCE($4, medical_verification_status),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [donationDate, updatedCount, nextEligibilityDate, normalizeStatus(req.body.medical_verification_status || currentDonor.medical_verification_status || "PENDING"), id]
        );

        await client.query("COMMIT");
        return res.json({ success: true, data: attachEligibility(updated.rows[0]) });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error recording donor donation:", err);
        return res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
};

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
            last_donation_date = null,
            donation_count = 0,
            next_eligibility_date = null,
            donation_cycle_completed,
            medical_verification_status,
            availability_status
        } = req.body;

        if (!full_name || !phone || !blood_group) {
            return res.status(400).json({
                success: false,
                message: "Full name, phone, and blood group are required"
            });
        }

        // Log incoming medical fields for debugging and diagnostics (no sensitive data)
        try {
            console.debug("Incoming medical fields:", {
                medical_conditions: req.body.medical_conditions,
                medicalConditions: req.body.medicalConditions,
                healthConditions: req.body.healthConditions,
                illness: req.body.illness,
                diseases: req.body.diseases
            });
        } catch (logErr) {
            console.debug("Unable to serialize incoming medical fields");
        }

        let medicalConditionsValue = null;
        try {
            medicalConditionsValue = normalizeMedicalConditions(getMedicalConditionsInput(req.body));
        } catch (error) {
            console.warn("Invalid medical condition provided during registration:", error.message);
            return res.status(400).json({
                success: false,
                message: error.message || "Invalid medical condition"
            });
        }

        const donorFields = normalizeDonorValues(req.body);

        await client.query("BEGIN");

        const insertDonorQuery = `
            INSERT INTO donors (
                full_name, phone, email, blood_group, medical_conditions, latitude, longitude,
                donation_consent, emergency_contact_consent, is_available, last_donation_date,
                donation_count, next_eligibility_date, donation_cycle_completed,
                medical_verification_status, availability_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `;

        const donorRes = await client.query(insertDonorQuery, [
            full_name,
            phone,
            email || null,
            blood_group.toUpperCase(),
            medicalConditionsValue,
            latitude || 12.9716,
            longitude || 77.5946,
            Boolean(donation_consent),
            Boolean(emergency_contact_consent),
            Boolean(donorFields.isAvailable),
            donorFields.lastDonationDate,
            Number(donation_count || donorFields.donationCount || 0),
            donorFields.nextEligibilityDate,
            donorFields.cycleCompleted,
            donorFields.medicalVerificationStatus,
            donorFields.availabilityStatus
        ]);

        const donor = donorRes.rows[0];

        await client.query(
            `INSERT INTO consent_logs (donor_id, consent_type, consent_given)
             VALUES ($1, 'GENERAL_DONATION', $2),
                    ($1, 'EMERGENCY_CONTACT', $3)`,
            [donor.id, Boolean(donation_consent), Boolean(emergency_contact_consent)]
        );

        await client.query("COMMIT");
        return res.status(201).json({
            success: true,
            message: "Donor registered successfully",
            donor: attachEligibility(donor)
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("DONOR REGISTRATION ERROR:", err);
        if (err.code === "23505") {
            return res.status(409).json({ success: false, message: "Phone number already registered" });
        }
        return res.status(500).json({
            success: false,
            message: "Unable to register donor",
            error: process.env.NODE_ENV === "development" ? err.message : undefined
        });
    } finally {
        client.release();
    }
};

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
            last_donation_date,
            donation_count,
            next_eligibility_date,
            donation_cycle_completed,
            medical_verification_status,
            availability_status
        } = req.body;

        await client.query("BEGIN");

        const currentRes = await client.query("SELECT * FROM donors WHERE id = $1", [id]);
        if (currentRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Donor not found" });
        }
        const current = currentRes.rows[0];
        let nextMedicalConditions = current.medical_conditions;
        if (req.body.medical_conditions !== undefined || req.body.medicalConditions !== undefined || req.body.healthConditions !== undefined || req.body.illness !== undefined || req.body.disease !== undefined) {
            try {
                try {
                    console.debug("Updating medical fields for donor id", id, {
                        medical_conditions: req.body.medical_conditions,
                        medicalConditions: req.body.medicalConditions,
                        healthConditions: req.body.healthConditions,
                        illness: req.body.illness,
                        diseases: req.body.diseases
                    });
                } catch (logErr) {
                    /* ignore logging errors */
                }
                nextMedicalConditions = normalizeMedicalConditions(getMedicalConditionsInput(req.body));
            } catch (error) {
                await client.query("ROLLBACK");
                return res.status(400).json({ success: false, message: error.message || "Invalid medical condition" });
            }
        }
        const computed = normalizeDonorValues(req.body, current);

        const updateQuery = `
            UPDATE donors SET
                full_name = COALESCE($1, full_name),
                phone = COALESCE($2, phone),
                email = COALESCE($3, email),
                blood_group = COALESCE($4, blood_group),
                medical_conditions = COALESCE($5, medical_conditions),
                latitude = COALESCE($6, latitude),
                longitude = COALESCE($7, longitude),
                donation_consent = COALESCE($8, donation_consent),
                emergency_contact_consent = COALESCE($9, emergency_contact_consent),
                is_available = COALESCE($10, is_available),
                last_donation_date = COALESCE($11, last_donation_date),
                donation_count = COALESCE($12, donation_count),
                next_eligibility_date = COALESCE($13, next_eligibility_date),
                donation_cycle_completed = COALESCE($14, donation_cycle_completed),
                medical_verification_status = COALESCE($15, medical_verification_status),
                availability_status = COALESCE($16, availability_status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $17
            RETURNING *
        `;

        const result = await client.query(updateQuery, [
            full_name || null,
            phone || null,
            email || null,
            blood_group ? blood_group.toUpperCase() : null,
            nextMedicalConditions,
            latitude !== undefined ? latitude : null,
            longitude !== undefined ? longitude : null,
            donation_consent !== undefined ? Boolean(donation_consent) : null,
            emergency_contact_consent !== undefined ? Boolean(emergency_contact_consent) : null,
            is_available !== undefined ? Boolean(is_available) : null,
            last_donation_date !== undefined ? last_donation_date : null,
            donation_count !== undefined ? Number(donation_count) : null,
            next_eligibility_date !== undefined ? next_eligibility_date : null,
            donation_cycle_completed !== undefined ? Boolean(donation_cycle_completed) : null,
            medical_verification_status !== undefined ? normalizeStatus(medical_verification_status) : current.medical_verification_status || null,
            availability_status !== undefined ? normalizeStatus(availability_status) : current.availability_status || null,
            id
        ]);

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
        res.json({ success: true, data: attachEligibility(result.rows[0]) });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("DONOR UPDATE ERROR:", err);
        res.status(500).json({
            success: false,
            message: "Unable to update donor",
            error: process.env.NODE_ENV === "development" ? err.message : undefined
        });
    } finally {
        client.release();
    }
};

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
