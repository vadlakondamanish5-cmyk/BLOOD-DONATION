const pool = require("../db/pool");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const normalizeHospitalStock = (hospital) => {
    const bloodStock = {};
    BLOOD_GROUPS.forEach((group) => {
        bloodStock[group] = Number(hospital?.blood_stock?.[group] || 0);
    });

    return {
        hospital_id: hospital.hospital_id,
        hospital_name: hospital.hospital_name,
        verified: Boolean(hospital.verified),
        blood_stock: bloodStock
    };
};

// Get all hospitals
exports.getAllHospitals = async (req, res) => {
    try {
        const query = `
            SELECT h.*, 
                   COUNT(r.id) FILTER (WHERE r.status IN ('OPEN', 'MATCHING', 'PARTIALLY_FULFILLED')) AS active_requests_count
            FROM hospitals h
            LEFT JOIN blood_requests r ON h.id = r.hospital_id
            GROUP BY h.id
            ORDER BY h.hospital_name ASC
        `;
        const result = await pool.query(query);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        console.error("Error fetching hospitals:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get single hospital by ID
exports.getHospitalById = async (req, res) => {
    try {
        const { id } = req.params;
        const hospResult = await pool.query("SELECT * FROM hospitals WHERE id = $1", [id]);
        if (hospResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const requestsResult = await pool.query(
            "SELECT * FROM blood_requests WHERE hospital_id = $1 ORDER BY created_at DESC",
            [id]
        );

        res.json({
            success: true,
            data: {
                ...hospResult.rows[0],
                requests: requestsResult.rows
            }
        });
    } catch (err) {
        console.error("Error fetching hospital:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Create a new hospital
exports.createHospital = async (req, res) => {
    try {
        const { hospital_name, contact_person, phone, email, latitude, longitude, verified } = req.body;
        if (!hospital_name || !phone) {
            return res.status(400).json({ success: false, message: "Hospital name and phone are required" });
        }

        const query = `
            INSERT INTO hospitals (hospital_name, contact_person, phone, email, latitude, longitude, verified)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [
            hospital_name,
            contact_person || null,
            phone,
            email || null,
            latitude || 12.9716, // Default Bangalore center if not specified
            longitude || 77.5946,
            verified !== undefined ? verified : true
        ];

        const result = await pool.query(query, values);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error("Error creating hospital:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getAllHospitalBloodStock = async (req, res) => {
    try {
        const query = `
            SELECT h.id AS hospital_id,
                   h.hospital_name,
                   h.verified,
                   s.blood_group,
                   s.units_available,
                   s.last_updated
            FROM hospitals h
            LEFT JOIN hospital_blood_stock s ON s.hospital_id = h.id
            ORDER BY h.hospital_name ASC, s.blood_group ASC
        `;

        const result = await pool.query(query);
        const stockByHospital = new Map();

        result.rows.forEach((row) => {
            if (!stockByHospital.has(row.hospital_id)) {
                stockByHospital.set(row.hospital_id, {
                    hospital_id: row.hospital_id,
                    hospital_name: row.hospital_name,
                    verified: row.verified,
                    blood_stock: {}
                });
            }

            const hospitalEntry = stockByHospital.get(row.hospital_id);
            if (row.blood_group) {
                hospitalEntry.blood_stock[row.blood_group] = Number(row.units_available || 0);
            }
        });

        const inventory = Array.from(stockByHospital.values()).map((hospital) => normalizeHospitalStock(hospital));

        res.json({
            success: true,
            count: inventory.length,
            data: inventory
        });
    } catch (err) {
        console.error("Error fetching hospital blood stock:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getHospitalBloodStockById = async (req, res) => {
    try {
        const { id } = req.params;
        const hospitalResult = await pool.query("SELECT * FROM hospitals WHERE id = $1", [id]);
        if (hospitalResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const stockQuery = `
            SELECT s.blood_group, s.units_available, s.last_updated
            FROM hospital_blood_stock s
            WHERE s.hospital_id = $1
            ORDER BY s.blood_group ASC
        `;
        const stockResult = await pool.query(stockQuery, [id]);

        const bloodStock = {};
        BLOOD_GROUPS.forEach((group) => {
            bloodStock[group] = 0;
        });

        stockResult.rows.forEach((row) => {
            bloodStock[row.blood_group] = Number(row.units_available || 0);
        });

        const hospital = {
            hospital_id: hospitalResult.rows[0].id,
            hospital_name: hospitalResult.rows[0].hospital_name,
            verified: Boolean(hospitalResult.rows[0].verified),
            blood_stock: bloodStock
        };

        res.json({ success: true, data: hospital });
    } catch (err) {
        console.error("Error fetching hospital blood stock by ID:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
