const pool = require("./pool");
const { matchDonorsForRequest } = require("../services/matchingService");
const { broadcastToMatchedDonors } = require("../services/notificationService");

async function seed() {
    console.log("🌱 Starting HexaVision Database Seeding...");
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Clear existing data in correct FK order
        console.log("🧹 Clearing old records...");
        await client.query("DELETE FROM notifications");
        await client.query("DELETE FROM consent_logs");
        await client.query("DELETE FROM donor_matches");
        await client.query("DELETE FROM blood_requests");
        await client.query("DELETE FROM hospital_blood_stock");
        await client.query("DELETE FROM donors");
        await client.query("DELETE FROM hospitals");

        // Reset identity sequences
        await client.query("ALTER SEQUENCE hospitals_id_seq RESTART WITH 1");
        await client.query("ALTER SEQUENCE hospital_blood_stock_id_seq RESTART WITH 1");
        await client.query("ALTER SEQUENCE donors_id_seq RESTART WITH 1");
        await client.query("ALTER SEQUENCE blood_requests_id_seq RESTART WITH 1");
        await client.query("ALTER SEQUENCE donor_matches_id_seq RESTART WITH 1");
        await client.query("ALTER SEQUENCE consent_logs_id_seq RESTART WITH 1");
        await client.query("ALTER SEQUENCE notifications_id_seq RESTART WITH 1");

        // 2. Insert Hospitals
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

        const hospitalIds = [];
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

        for (let index = 0; index < hospitalIds.length; index += 1) {
            const hospitalId = hospitalIds[index];
            const stockMap = hospitalStockValues[index] || { "A+": 0, "A-": 0, "B+": 0, "B-": 0, "AB+": 0, "AB-": 0, "O+": 0, "O-": 0 };

            for (const group of bloodGroups) {
                await client.query(
                    `INSERT INTO hospital_blood_stock (hospital_id, blood_group, units_available, last_updated, created_at, updated_at)
                     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [hospitalId, group, Number(stockMap[group] || 0)]
                );
            }
        }

        // 3. Insert a large synthetic donor network that stays within the existing database schema
        console.log("🩸 Inserting synthetic donor dataset with balanced blood group distribution...");

        const targetDistribution = {
            "A+": 300,
            "A-": 70,
            "B+": 250,
            "B-": 60,
            "AB+": 80,
            "AB-": 20,
            "O+": 180,
            "O-": 40
        };

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

        const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

        const padPhone = (value) => String(value).padStart(10, "0");
        const toDateString = (date) => date.toISOString().slice(0, 10);

        const syntheticDonors = [];
        const usedEmails = new Set();
        const usedPhones = new Set();

        const now = new Date();
        const addDaysToDate = (days) => {
            const date = new Date(now);
            date.setDate(date.getDate() + days);
            return date.toISOString().slice(0, 10);
        };

        const featuredDonors = [
            {
                full_name: "Rahul Kumar",
                phone: "+91 9876543210",
                email: "rahul.kumar@hexavision.demo",
                blood_group: "O-",
                latitude: 12.9716,
                longitude: 77.5946,
                donation_consent: true,
                emergency_contact_consent: true,
                is_available: true,
                last_donation_date: "2026-06-10",
                donation_count: 3,
                next_eligibility_date: "2026-09-08",
                donation_cycle_completed: true,
                medical_verification_status: "VERIFIED",
                availability_status: "AVAILABLE"
            },
            {
                full_name: "Arjun Reddy",
                phone: "+91 9765432109",
                email: "arjun.reddy@hexavision.demo",
                blood_group: "O-",
                latitude: 12.9416,
                longitude: 77.6046,
                donation_consent: true,
                emergency_contact_consent: true,
                is_available: true,
                last_donation_date: "2026-09-01",
                donation_count: 2,
                next_eligibility_date: "2026-11-01",
                donation_cycle_completed: false,
                medical_verification_status: "VERIFIED",
                availability_status: "AVAILABLE"
            },
            {
                full_name: "Priya Nair",
                phone: "+91 9654321098",
                email: "priya.nair@hexavision.demo",
                blood_group: "B+",
                latitude: 12.9316,
                longitude: 77.6226,
                donation_consent: true,
                emergency_contact_consent: false,
                is_available: false,
                last_donation_date: "2026-08-10",
                donation_count: 2,
                next_eligibility_date: "2026-10-10",
                donation_cycle_completed: false,
                medical_verification_status: "PENDING",
                availability_status: "UNAVAILABLE"
            },
            {
                full_name: "Karan Singh",
                phone: "+91 9543210987",
                email: "karan.singh@hexavision.demo",
                blood_group: "A+",
                latitude: 12.9146,
                longitude: 77.6186,
                donation_consent: true,
                emergency_contact_consent: true,
                is_available: true,
                last_donation_date: "2026-06-12",
                donation_count: 4,
                next_eligibility_date: "2026-08-11",
                donation_cycle_completed: true,
                medical_verification_status: "PENDING",
                availability_status: "AVAILABLE"
            }
        ];

        featuredDonors.forEach((donor) => syntheticDonors.push({ ...donor, synthetic_health: { condition: "None", medication: "No routine medication", surgery: "No prior surgery", eligibility: "Scenario for demo" } }));

        for (const [bloodGroup, targetCount] of Object.entries(targetDistribution)) {
            for (let i = 0; i < targetCount; i += 1) {
                const firstName = firstNames[randomInt(0, firstNames.length - 1)];
                const lastName = lastNames[randomInt(0, lastNames.length - 1)];
                const name = `${firstName} ${lastName}`;
                const baseHospital = hospitalsData[randomInt(0, hospitalsData.length - 1)];
                const distanceKm = Math.random() * 15 + 1.5;
                const angle = Math.random() * Math.PI * 2;
                const latOffset = (distanceKm / 111.32) * Math.cos(angle);
                const lonOffset = (distanceKm / (111.32 * Math.cos((baseHospital.lat * Math.PI) / 180))) * Math.sin(angle);
                const lat = Number(clamp(baseHospital.lat + latOffset, 12.7, 13.1).toFixed(5));
                const lon = Number(clamp(baseHospital.lon + lonOffset, 77.45, 77.82).toFixed(5));

                let donationConsent = Math.random() < 0.88;
                let emergencyConsent = Math.random() < 0.76;
                let isAvailable = Math.random() < 0.65;
                let lastDonationDaysAgo = Math.max(0, randomInt(0, 240));

                if (lastDonationDaysAgo <= 89) {
                    isAvailable = false;
                } else if (lastDonationDaysAgo >= 120) {
                    isAvailable = Math.random() < 0.78;
                }

                if (Math.random() < 0.12) {
                    donationConsent = false;
                }
                if (Math.random() < 0.18) {
                    emergencyConsent = false;
                }

                if (!isAvailable && Math.random() < 0.24) {
                    lastDonationDaysAgo = randomInt(15, 89);
                }

                const lastDonationDate = lastDonationDaysAgo === 0
                    ? null
                    : new Date(Date.now() - lastDonationDaysAgo * 24 * 60 * 60 * 1000);

                const donationCycleCompleted = lastDonationDaysAgo >= 90;
                const verificationStatus = Math.random() < 0.72 ? "VERIFIED" : (Math.random() < 0.5 ? "PENDING" : "REQUIRED");
                const availabilityStatus = isAvailable ? "AVAILABLE" : (Math.random() < 0.5 ? "ON_COOLDOWN" : "TEMPORARILY_INELIGIBLE");
                const syntheticHealthProfile = {
                    condition: ["None", "Controlled hypertension", "Mild anemia", "Asthma", "Thyroid management"][randomInt(0, 4)],
                    medication: Math.random() < 0.32 ? "Routine medication in use" : "No routine medication",
                    surgery: Math.random() < 0.28 ? "Previous procedure in the past 2 years" : "No prior surgery",
                    eligibility: donationCycleCompleted && verificationStatus === "VERIFIED" && isAvailable ? "Eligible for donation screening" : "Temporary ineligibility due to recent donation or recovery window"
                };

                const nextEligibilityDate = lastDonationDate ? new Date(lastDonationDate.getTime() + (90 * 24 * 60 * 60 * 1000)) : null;

                let phone = `+91 ${padPhone(randomInt(7000000000, 9999999999))}`;
                while (usedPhones.has(phone)) {
                    phone = `+91 ${padPhone(randomInt(7000000000, 9999999999))}`;
                }
                usedPhones.add(phone);

                let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(100, 9999)}@synthetic.demo`;
                while (usedEmails.has(email)) {
                    email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(100, 9999)}@synthetic.demo`;
                }
                usedEmails.add(email);

                syntheticDonors.push({
                    full_name: name,
                    phone,
                    email,
                    blood_group: bloodGroup,
                    latitude: lat,
                    longitude: lon,
                    donation_consent: donationConsent,
                    emergency_contact_consent: emergencyConsent,
                    is_available: isAvailable,
                    last_donation_date: lastDonationDate ? toDateString(lastDonationDate) : null,
                    donation_count: Math.max(1, Math.floor(20 - lastDonationDaysAgo / 30 + Math.random() * 3)),
                    next_eligibility_date: nextEligibilityDate ? toDateString(nextEligibilityDate) : null,
                    donation_cycle_completed: donationCycleCompleted,
                    medical_verification_status: verificationStatus,
                    availability_status: availabilityStatus,
                    synthetic_health: syntheticHealthProfile
                });
            }
        }

        const donorChunks = [];
        for (let i = 0; i < syntheticDonors.length; i += 250) {
            donorChunks.push(syntheticDonors.slice(i, i + 250));
        }

        const donorIds = [];
        for (const chunk of donorChunks) {
            const values = [];
            const placeholders = [];

            chunk.forEach((donor, donorIndex) => {
                const rowIndex = donorIndex * 10;
                placeholders.push(`($${rowIndex + 1}, $${rowIndex + 2}, $${rowIndex + 3}, $${rowIndex + 4}, $${rowIndex + 5}, $${rowIndex + 6}, $${rowIndex + 7}, $${rowIndex + 8}, $${rowIndex + 9}, $${rowIndex + 10}, $${rowIndex + 11}, $${rowIndex + 12}, $${rowIndex + 13}, $${rowIndex + 14}, $${rowIndex + 15})`);
                values.push(
                    donor.full_name,
                    donor.phone,
                    donor.email,
                    donor.blood_group,
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

            const insertResult = await client.query(
                `INSERT INTO donors (
                    full_name, phone, email, blood_group, latitude, longitude,
                    donation_consent, emergency_contact_consent, is_available, last_donation_date
                ) VALUES ${placeholders.join(", ")} RETURNING id`,
                values
            );

            donorIds.push(...insertResult.rows.map((row) => row.id));

            for (const [index, row] of insertResult.rows.entries()) {
                const donor = chunk[index];
                await client.query(
                    `INSERT INTO consent_logs (donor_id, consent_type, consent_given)
                     VALUES ($1, 'GENERAL_DONATION', $2), ($1, 'EMERGENCY_CONTACT', $3)`,
                    [row.id, donor.donation_consent, donor.emergency_contact_consent]
                );
            }
        }

        const duplicatePhoneCheck = await client.query(
            `SELECT COUNT(*) AS duplicate_phone_count FROM (
                SELECT phone FROM donors GROUP BY phone HAVING COUNT(*) > 1
            ) dup`
        );
        const duplicateEmailCheck = await client.query(
            `SELECT COUNT(*) AS duplicate_email_count FROM (
                SELECT email FROM donors WHERE email IS NOT NULL GROUP BY email HAVING COUNT(*) > 1
            ) dup`
        );

        if (Number(duplicatePhoneCheck.rows[0].duplicate_phone_count) > 0 || Number(duplicateEmailCheck.rows[0].duplicate_email_count) > 0) {
            throw new Error("Duplicate donor phone or email detected after seeding.");
        }

        const donorDistribution = await client.query(
            `SELECT blood_group, COUNT(*) AS total FROM donors GROUP BY blood_group ORDER BY blood_group`
        );

        console.log("📊 Synthetic donor distribution:");
        donorDistribution.rows.forEach((row) => {
            console.log(`   - ${row.blood_group}: ${row.total}`);
        });

        console.log(`🧪 Synthetic donor inventory ready: ${donorIds.length} donors inserted.`);

        // 4. Insert Sample Blood Requests
        console.log("🚨 Inserting Sample Blood Requests...");
        const requestsData = [
            {
                hospital_id: hospitalIds[0], // Apollo Bannerghatta
                blood_group: "O-",
                units_required: 2,
                urgency: "CRITICAL",
                required_by: new Date(Date.now() + 2 * 60 * 60 * 1000), // In 2 hours
                lat: 12.8938,
                lon: 77.5976
            },
            {
                hospital_id: hospitalIds[1], // Manipal Hospital
                blood_group: "B+",
                units_required: 3,
                urgency: "URGENT",
                required_by: new Date(Date.now() + 8 * 60 * 60 * 1000), // In 8 hours
                lat: 12.9587,
                lon: 77.6489
            },
            {
                hospital_id: hospitalIds[2], // Fortis Cunningham
                blood_group: "A+",
                units_required: 1,
                urgency: "NORMAL",
                required_by: new Date(Date.now() + 24 * 60 * 60 * 1000), // In 24 hours
                lat: 12.9866,
                lon: 77.5954
            },
            {
                hospital_id: hospitalIds[4], // St. John's
                blood_group: "AB-",
                units_required: 1,
                urgency: "CRITICAL",
                required_by: new Date(Date.now() + 1 * 60 * 60 * 1000), // In 1 hour
                lat: 12.9312,
                lon: 77.6215
            }
        ];

        const requestIds = [];
        for (const r of requestsData) {
            const res = await client.query(
                `INSERT INTO blood_requests (
                    hospital_id, blood_group, units_required, urgency, required_by, status, latitude, longitude
                ) VALUES ($1, $2, $3, $4, $5, 'OPEN', $6, $7) RETURNING id`,
                [r.hospital_id, r.blood_group, r.units_required, r.urgency, r.required_by, r.lat, r.lon]
            );
            requestIds.push(res.rows[0].id);
        }

        await client.query("COMMIT");

        console.log(`🏥 Hospitals inserted: ${hospitalsData.length}`);
        console.log(`🩸 Donors inserted: ${donorIds.length}`);
        console.log(`🚨 Blood requests inserted: ${requestIds.length}`);

        // 5. Trigger Matching Engine & Notifications for seeded requests
        console.log("⚡ Executing Multi-Factor Matching Engine on seeded requests...");
        let matchesGenerated = 0;
        for (const reqId of requestIds) {
            const matches = await matchDonorsForRequest(reqId);
            matchesGenerated += matches.length;
            console.log(`   - Request #${reqId}: matched ${matches.length} donors.`);
        }

        console.log(`🔗 Matches generated: ${matchesGenerated}`);

        // Broadcast to top donors for the first critical request
        console.log("📲 Broadcasting alerts for Request #1 (CRITICAL O-)...");
        const notifs = await broadcastToMatchedDonors(requestIds[0], 3, "SMS");
        console.log(`   - Dispatched ${notifs.length} alerts.`);

        console.log("✅ Database seeding completed successfully");
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
