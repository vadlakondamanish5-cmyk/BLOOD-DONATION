const pool = require("./pool");
const { matchDonorsForRequest } = require("../services/matchingService");
const { broadcastToMatchedDonors } = require("../services/notificationService");

async function seed() {
    console.log("🌱 Starting HexaVision Database Seeding...");
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Ensure table schema has all columns from schema.sql
        await client.query(`
            ALTER TABLE donors ADD COLUMN IF NOT EXISTS medical_conditions TEXT;
            ALTER TABLE donors ADD COLUMN IF NOT EXISTS donation_count INTEGER NOT NULL DEFAULT 0;
            ALTER TABLE donors ADD COLUMN IF NOT EXISTS next_eligibility_date DATE;
            ALTER TABLE donors ADD COLUMN IF NOT EXISTS donation_cycle_completed BOOLEAN NOT NULL DEFAULT FALSE;
            ALTER TABLE donors ADD COLUMN IF NOT EXISTS medical_verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING';
            ALTER TABLE donors ADD COLUMN IF NOT EXISTS availability_status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE';
        `);

        // 2. Clear old donor records while preserving hospitals and blood requests
        console.log("🧹 Clearing old donor records...");
        await client.query("DELETE FROM notifications WHERE donor_id IS NOT NULL");
        await client.query("DELETE FROM consent_logs");
        await client.query("DELETE FROM donor_matches");
        await client.query("UPDATE blood_units SET donor_id = NULL WHERE donor_id IS NOT NULL");
        await client.query("TRUNCATE TABLE donors RESTART IDENTITY CASCADE");

        // 3. Ensure hospitals exist
        const hospCountRes = await client.query("SELECT COUNT(*) FROM hospitals");
        let hospitalIds = [];

        if (parseInt(hospCountRes.rows[0].count, 10) === 0) {
            console.log("🏥 Inserting Verified Hospitals...");
            const hospitalsData = [
                {
                    name: "Apollo Hospitals - Bannerghatta",
                    contact: "Dr. Arvind Kumar (Blood Bank Chief)",
                    phone: "+91 80 2630 4050",
                    email: "bloodbank.bannerghatta@apollo.org",
                    lat: 12.8938,
                    lon: 77.5976,
                    verified: true
                },
                {
                    name: "Manipal Hospital - HAL Airport Rd",
                    contact: "Dr. Sunita Rao (Emergency HOD)",
                    phone: "+91 80 2502 4444",
                    email: "emergency@manipalhospitals.com",
                    lat: 12.9587,
                    lon: 77.6489,
                    verified: true
                },
                {
                    name: "Fortis Hospital - Cunningham Rd",
                    contact: "Sister Mercy (Trauma Desk)",
                    phone: "+91 80 4199 4444",
                    email: "trauma.desk@fortishealthcare.com",
                    lat: 12.9866,
                    lon: 77.5954,
                    verified: true
                },
                {
                    name: "Narayana Health City - Hosur Rd",
                    contact: "Dr. Devi Prasad (Cardiac ICU)",
                    phone: "+91 80 7122 2222",
                    email: "bloodunit@narayanahealth.org",
                    lat: 12.8184,
                    lon: 77.6974,
                    verified: true
                },
                {
                    name: "St. John's Medical College Hospital",
                    contact: "Dr. George Thomas (Transfusion Unit)",
                    phone: "+91 80 4946 6000",
                    email: "transfusion@stjohns.in",
                    lat: 12.9312,
                    lon: 77.6215,
                    verified: true
                },
                {
                    name: "Victoria Hospital - City Market",
                    contact: "Govt Trauma Care Desk",
                    phone: "+91 80 2670 1150",
                    email: "trauma@victoriahospital.kar.nic.in",
                    lat: 12.9634,
                    lon: 77.5756,
                    verified: true
                }
            ];

            for (const h of hospitalsData) {
                const res = await client.query(
                    `INSERT INTO hospitals (hospital_name, contact_person, phone, email, latitude, longitude, verified)
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                    [h.name, h.contact, h.phone, h.email, h.lat, h.lon, h.verified]
                );
                hospitalIds.push(res.rows[0].id);
            }

            const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
            const hospitalStockValues = [
                { "A+": 12, "A-": 4, "B+": 9, "B-": 2, "AB+": 5, "AB-": 1, "O+": 14, "O-": 3 },
                { "A+": 8, "A-": 5, "B+": 6, "B-": 3, "AB+": 4, "AB-": 2, "O+": 10, "O-": 0 },
                { "A+": 15, "A-": 7, "B+": 11, "B-": 4, "AB+": 6, "AB-": 3, "O+": 18, "O-": 5 },
                { "A+": 6, "A-": 2, "B+": 5, "B-": 1, "AB+": 3, "AB-": 0, "O+": 7, "O-": 2 },
                { "A+": 10, "A-": 6, "B+": 8, "B-": 2, "AB+": 5, "AB-": 1, "O+": 9, "O-": 4 },
                { "A+": 9, "A-": 3, "B+": 7, "B-": 2, "AB+": 4, "AB-": 0, "O+": 12, "O-": 1 }
            ];

            for (let idx = 0; idx < hospitalIds.length; idx += 1) {
                const hId = hospitalIds[idx];
                const stockMap = hospitalStockValues[idx] || {};
                for (const grp of bloodGroups) {
                    await client.query(
                        `INSERT INTO hospital_blood_stock (hospital_id, blood_group, units_available, last_updated)
                         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                         ON CONFLICT (hospital_id, blood_group) DO UPDATE SET units_available = EXCLUDED.units_available`,
                        [hId, grp, Number(stockMap[grp] || 0)]
                    );
                }
            }
        } else {
            const hRes = await client.query("SELECT id FROM hospitals ORDER BY id ASC");
            hospitalIds = hRes.rows.map((r) => r.id);
            console.log(`🏥 Found ${hospitalIds.length} existing verified hospitals.`);
        }

        // 4. Generate 1000 Synthetic Donors: ~700 Eligible and ~300 Not Eligible
        console.log("🩸 Generating 1,000 synthetic donors with balanced eligibility across all 8 blood groups...");

        const targetDistribution = [
            { group: "O+", eligible: 245, notEligible: 105 }, // total 350
            { group: "A+", eligible: 175, notEligible: 75 },  // total 250
            { group: "B+", eligible: 140, notEligible: 60 },  // total 200
            { group: "AB+", eligible: 42, notEligible: 18 },  // total 60
            { group: "O-", eligible: 35, notEligible: 15 },   // total 50
            { group: "A-", eligible: 28, notEligible: 12 },   // total 40
            { group: "B-", eligible: 21, notEligible: 9 },    // total 30
            { group: "AB-", eligible: 14, notEligible: 6 },   // total 20
        ];

        const firstNames = [
            "Aarav", "Anika", "Diya", "Rohan", "Neha", "Vikram", "Meera", "Kabir", "Ishita", "Aditya",
            "Saanvi", "Harsh", "Pooja", "Nikhil", "Tanvi", "Arjun", "Kavya", "Riya", "Ashok", "Sofia",
            "Karan", "Divya", "Nisha", "Siddharth", "Mahima", "Rishabh", "Aditi", "Yash", "Shreya",
            "Pranav", "Jiya", "Rahul", "Ananya", "Dev", "Simran", "Aman", "Priya", "Varun", "Medha",
            "Nandan", "Mira", "Krishna", "Esha", "Nitin", "Leah", "Kunal", "Ira", "Yamini", "Sahil"
        ];

        const lastNames = [
            "Sharma", "Verma", "Iyer", "Patel", "Nair", "Rao", "Menon", "Das", "Singh", "Nadig",
            "Bose", "Krishnan", "Joseph", "Gupta", "Reddy", "Kumar", "Mohan", "Sen", "Joshi", "Subramanian",
            "Saxena", "Chawla", "Kulkarni", "Hegde", "Mallya", "Narayan", "Chopra", "Kapoor", "Bhatia",
            "Sethi", "Khan", "Mishra", "Thomas", "Dutta", "Gowda", "Bhatt", "Rangan", "Varma", "Naidu",
            "Sundaram", "Iyengar", "Murthy", "Lal", "Adiga", "Katti", "Nambiar", "Ilangovan", "Natarajan", "Dixit"
        ];

        const localities = [
            { name: "Koramangala", lat: 12.9352, lon: 77.6245 },
            { name: "Indiranagar", lat: 12.9784, lon: 77.6408 },
            { name: "Jayanagar", lat: 12.9308, lon: 77.5838 },
            { name: "Whitefield", lat: 12.9698, lon: 77.7499 },
            { name: "HSR Layout", lat: 12.9121, lon: 77.6446 },
            { name: "Bannerghatta Rd", lat: 12.8938, lon: 77.5976 },
            { name: "Malleshwaram", lat: 13.0031, lon: 77.5643 },
            { name: "Electronic City", lat: 12.8399, lon: 77.6770 },
            { name: "BTM Layout", lat: 12.9166, lon: 77.6101 },
            { name: "Hebbal", lat: 13.0358, lon: 77.5970 }
        ];

        const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
        const toDateString = (date) => date.toISOString().slice(0, 10);

        const syntheticDonors = [];
        let globalDonorSeq = 1;
        const now = new Date();

        for (const dist of targetDistribution) {
            const bg = dist.group;

            // Generate ELIGIBLE donors
            for (let i = 0; i < dist.eligible; i += 1) {
                const seq = globalDonorSeq++;
                const firstName = firstNames[randomInt(0, firstNames.length - 1)];
                const lastName = lastNames[randomInt(0, lastNames.length - 1)];
                const fullName = `${firstName} ${lastName}`;
                const loc = localities[randomInt(0, localities.length - 1)];
                const lat = Number(clamp(loc.lat + (Math.random() - 0.5) * 0.08, 12.75, 13.15).toFixed(5));
                const lon = Number(clamp(loc.lon + (Math.random() - 0.5) * 0.08, 77.48, 77.80).toFixed(5));

                const phone = `+91 9${String(800000000 + seq).padStart(9, "0")}`;
                const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${seq}@hexavision.demo`;

                // 15% first-time donors (null last donation date), 85% completed cooldown repeat donors
                const isFirstTime = Math.random() < 0.15;
                let lastDonationDate = null;
                let nextEligibilityDate = null;
                let donationCount = 0;

                if (!isFirstTime) {
                    // Cooldown completed: donated 92 to 280 days ago
                    const daysAgo = randomInt(92, 280);
                    const dDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
                    lastDonationDate = toDateString(dDate);
                    const nextDate = new Date(dDate.getTime() + 90 * 24 * 60 * 60 * 1000);
                    nextEligibilityDate = toDateString(nextDate);
                    donationCount = randomInt(1, 12);
                }

                // ~72% available and consented for AVAILABLE ONLY filter
                const isAvailable = Math.random() < 0.73;
                const donationConsent = Math.random() < 0.95;
                const emergencyConsent = Math.random() < 0.88;

                syntheticDonors.push({
                    full_name: fullName,
                    phone,
                    email,
                    blood_group: bg,
                    medical_conditions: null,
                    latitude: lat,
                    longitude: lon,
                    donation_consent: donationConsent,
                    emergency_contact_consent: emergencyConsent,
                    is_available: isAvailable,
                    last_donation_date: lastDonationDate,
                    donation_count: donationCount,
                    next_eligibility_date: nextEligibilityDate,
                    donation_cycle_completed: true,
                    medical_verification_status: "VERIFIED",
                    availability_status: isAvailable ? "AVAILABLE" : "UNAVAILABLE"
                });
            }

            // Generate NOT ELIGIBLE donors
            for (let i = 0; i < dist.notEligible; i += 1) {
                const seq = globalDonorSeq++;
                const firstName = firstNames[randomInt(0, firstNames.length - 1)];
                const lastName = lastNames[randomInt(0, lastNames.length - 1)];
                const fullName = `${firstName} ${lastName}`;
                const loc = localities[randomInt(0, localities.length - 1)];
                const lat = Number(clamp(loc.lat + (Math.random() - 0.5) * 0.08, 12.75, 13.15).toFixed(5));
                const lon = Number(clamp(loc.lon + (Math.random() - 0.5) * 0.08, 77.48, 77.80).toFixed(5));

                const phone = `+91 8${String(800000000 + seq).padStart(9, "0")}`;
                const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${seq}@hexavision.demo`;

                // In cooldown: donated 5 to 85 days ago
                const daysAgo = randomInt(5, 85);
                const dDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
                const lastDonationDate = toDateString(dDate);
                const nextDate = new Date(dDate.getTime() + 90 * 24 * 60 * 60 * 1000);
                const nextEligibilityDate = toDateString(nextDate);
                const donationCount = randomInt(1, 6);

                // Not eligible donors are ON_COOLDOWN and unavailable for donation
                const donationConsent = Math.random() < 0.90;
                const emergencyConsent = Math.random() < 0.80;

                syntheticDonors.push({
                    full_name: fullName,
                    phone,
                    email,
                    blood_group: bg,
                    medical_conditions: Math.random() < 0.1 ? "Mild seasonal allergies" : null,
                    latitude: lat,
                    longitude: lon,
                    donation_consent: donationConsent,
                    emergency_contact_consent: emergencyConsent,
                    is_available: false,
                    last_donation_date: lastDonationDate,
                    donation_count: donationCount,
                    next_eligibility_date: nextEligibilityDate,
                    donation_cycle_completed: false,
                    medical_verification_status: "VERIFIED",
                    availability_status: "ON_COOLDOWN"
                });
            }
        }

        console.log(`📦 Prepared ${syntheticDonors.length} synthetic donors. Inserting in batches...`);

        // Batch insert donors
        const batchSize = 100;
        const insertedDonorIds = [];

        for (let i = 0; i < syntheticDonors.length; i += batchSize) {
            const batch = syntheticDonors.slice(i, i + batchSize);
            const placeholders = [];
            const values = [];

            batch.forEach((donor, idx) => {
                const offset = idx * 16;
                placeholders.push(
                    `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16})`
                );
                values.push(
                    donor.full_name,
                    donor.phone,
                    donor.email,
                    donor.blood_group,
                    donor.medical_conditions,
                    donor.latitude,
                    donor.longitude,
                    donor.donation_consent,
                    donor.emergency_contact_consent,
                    donor.is_available,
                    donor.last_donation_date,
                    donor.donation_count,
                    donor.next_eligibility_date,
                    donor.donation_cycle_completed,
                    donor.medical_verification_status,
                    donor.availability_status
                );
            });

            const insertRes = await client.query(
                `INSERT INTO donors (
                    full_name, phone, email, blood_group, medical_conditions, latitude, longitude,
                    donation_consent, emergency_contact_consent, is_available, last_donation_date,
                    donation_count, next_eligibility_date, donation_cycle_completed,
                    medical_verification_status, availability_status
                ) VALUES ${placeholders.join(", ")} RETURNING id`,
                values
            );

            insertedDonorIds.push(...insertRes.rows.map((r) => r.id));

            // Log consent for inserted batch
            for (let bIdx = 0; bIdx < insertRes.rows.length; bIdx += 1) {
                const donorId = insertRes.rows[bIdx].id;
                const dObj = batch[bIdx];
                await client.query(
                    `INSERT INTO consent_logs (donor_id, consent_type, consent_given)
                     VALUES ($1, 'GENERAL_DONATION', $2), ($1, 'EMERGENCY_CONTACT', $3)`,
                    [donorId, dObj.donation_consent, dObj.emergency_contact_consent]
                );
            }
        }

        console.log(`✅ Successfully inserted ${insertedDonorIds.length} synthetic donors.`);

        // 5. Ensure Blood Requests exist
        const reqCountRes = await client.query("SELECT COUNT(*) FROM blood_requests");
        let activeRequestIds = [];

        if (parseInt(reqCountRes.rows[0].count, 10) === 0) {
            console.log("🚨 Inserting Sample Blood Requests...");
            const requestsData = [
                {
                    hospital_id: hospitalIds[0],
                    blood_group: "O-",
                    units_required: 2,
                    urgency: "CRITICAL",
                    required_by: new Date(Date.now() + 2 * 60 * 60 * 1000),
                    lat: 12.8938,
                    lon: 77.5976
                },
                {
                    hospital_id: hospitalIds[1],
                    blood_group: "B+",
                    units_required: 3,
                    urgency: "URGENT",
                    required_by: new Date(Date.now() + 8 * 60 * 60 * 1000),
                    lat: 12.9587,
                    lon: 77.6489
                },
                {
                    hospital_id: hospitalIds[2],
                    blood_group: "A+",
                    units_required: 1,
                    urgency: "NORMAL",
                    required_by: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    lat: 12.9866,
                    lon: 77.5954
                },
                {
                    hospital_id: hospitalIds[4] || hospitalIds[0],
                    blood_group: "AB-",
                    units_required: 1,
                    urgency: "CRITICAL",
                    required_by: new Date(Date.now() + 1 * 60 * 60 * 1000),
                    lat: 12.9312,
                    lon: 77.6215
                }
            ];

            for (const r of requestsData) {
                const res = await client.query(
                    `INSERT INTO blood_requests (
                        hospital_id, blood_group, units_required, urgency, required_by, status, latitude, longitude
                    ) VALUES ($1, $2, $3, $4, $5, 'OPEN', $6, $7) RETURNING id`,
                    [r.hospital_id, r.blood_group, r.units_required, r.urgency, r.required_by, r.lat, r.lon]
                );
                activeRequestIds.push(res.rows[0].id);
            }
        } else {
            const reqsRes = await client.query(
                "SELECT id FROM blood_requests WHERE status IN ('OPEN', 'MATCHING') ORDER BY id ASC"
            );
            activeRequestIds = reqsRes.rows.map((r) => r.id);
            console.log(`🚨 Found ${activeRequestIds.length} existing active blood requests.`);
        }

        await client.query("COMMIT");

        // 6. Re-run matching engine for active requests with newly seeded donors
        console.log("⚡ Executing Multi-Factor Matching Engine on active requests...");
        let totalMatchesGenerated = 0;
        for (const rId of activeRequestIds) {
            try {
                const matches = await matchDonorsForRequest(rId);
                totalMatchesGenerated += matches.length;
                console.log(`   - Request #${rId}: matched ${matches.length} eligible donors.`);
            } catch (mErr) {
                console.warn(`   - Request #${rId} matching note:`, mErr.message);
            }
        }
        console.log(`🔗 Total matches generated: ${totalMatchesGenerated}`);

        // Broadcast notifications for first request if available
        if (activeRequestIds.length > 0) {
            try {
                const notifs = await broadcastToMatchedDonors(activeRequestIds[0], 3, "SMS");
                console.log(`📲 Dispatched ${notifs.length} alerts for Request #${activeRequestIds[0]}.`);
            } catch (nErr) {
                console.warn("Notification dispatch note:", nErr.message);
            }
        }

        console.log("✅ HexaVision Database Seeding Completed Successfully.");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Seeding failed:", err);
        throw err;
    } finally {
        client.release();
    }
}

if (require.main === module) {
    seed()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = seed;
