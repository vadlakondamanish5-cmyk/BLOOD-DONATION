const pool = require("../db/pool");
const QRCode = require("qrcode");

const COMPONENT_THRESHOLDS = {
  "Whole Blood": { min: 1, max: 6 },
  RBC: { min: 1, max: 6 },
  Plasma: { min: -25, max: -15 },
  Platelets: { min: 20, max: 24 }
};

const STATUS_FLOW = [
  "LAB_PREPARED",
  "READY_FOR_DISPATCH",
  "IN_TRANSIT",
  "AT_HOSPITAL",
  "DELIVERED",
  "ALERT"
];

const timestamp = () => new Date().toISOString();

const broadcastUpdate = (unit) => {
  if (global.__hexavisionIo) {
    global.__hexavisionIo.emit("blood-unit-update", {
      id: unit.id,
      unit_id: unit.unit_id,
      status: unit.status,
      blood_group: unit.blood_group,
      component: unit.component,
      current_latitude: unit.current_latitude,
      current_longitude: unit.current_longitude,
      temperature_celsius: unit.temperature_celsius,
      updated_at: unit.updated_at || timestamp()
    });
  }
};

const createAlertIfNeeded = async (unit, newTemperature) => {
  const threshold = COMPONENT_THRESHOLDS[unit.component] || COMPONENT_THRESHOLDS["Whole Blood"];
  if (!threshold || newTemperature === null || newTemperature === undefined) {
    return null;
  }

  const isOutOfRange = Number(newTemperature) < threshold.min || Number(newTemperature) > threshold.max;
  if (!isOutOfRange) {
    return null;
  }

  const message = `Temperature excursion detected for ${unit.unit_id}; ${newTemperature}°C is outside the safe ${threshold.min}°C to ${threshold.max}°C window.`;

  const existing = await pool.query(
    "SELECT id FROM blood_unit_alerts WHERE blood_unit_id = $1 AND alert_type = 'TEMPERATURE_EXCURSION' AND acknowledged = FALSE ORDER BY created_at DESC LIMIT 1",
    [unit.id]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const alertResult = await pool.query(
    `INSERT INTO blood_unit_alerts (blood_unit_id, alert_type, severity, message, acknowledged)
     VALUES ($1, 'TEMPERATURE_EXCURSION', 'HIGH', $2, FALSE)
     RETURNING *`,
    [unit.id, message]
  );

  if (global.__hexavisionIo) {
    global.__hexavisionIo.emit("blood-unit-alert", {
      id: alertResult.rows[0].id,
      blood_unit_id: unit.unit_id,
      severity: alertResult.rows[0].severity,
      message,
      created_at: alertResult.rows[0].created_at
    });
  }

  return alertResult.rows[0];
};

const normalizeBloodUnit = (row) => ({
  id: row.id,
  unit_id: row.unit_id,
  blood_group: row.blood_group,
  component: row.component,
  status: row.status,
  source_hospital_id: row.source_hospital_id,
  destination_hospital_id: row.destination_hospital_id,
  donor_id: row.donor_id,
  current_latitude: row.current_latitude,
  current_longitude: row.current_longitude,
  temperature_celsius: row.temperature_celsius,
  target_temperature_c: row.target_temperature_c,
  qr_code: row.qr_code,
  last_scan_at: row.last_scan_at,
  delivered_at: row.delivered_at,
  dispatched_at: row.dispatched_at,
  created_at: row.created_at,
  updated_at: row.updated_at
});

exports.ensureTrackingTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blood_units (
      id SERIAL PRIMARY KEY,
      unit_id VARCHAR(50) NOT NULL UNIQUE,
      blood_group VARCHAR(10) NOT NULL,
      component VARCHAR(40) NOT NULL DEFAULT 'Whole Blood',
      status VARCHAR(30) NOT NULL DEFAULT 'LAB_PREPARED'
        CHECK (status IN ('LAB_PREPARED', 'READY_FOR_DISPATCH', 'IN_TRANSIT', 'AT_HOSPITAL', 'DELIVERED', 'ALERT')),
      source_hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL,
      destination_hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL,
      donor_id INTEGER REFERENCES donors(id) ON DELETE SET NULL,
      current_latitude DECIMAL(10, 7),
      current_longitude DECIMAL(10, 7),
      temperature_celsius DECIMAL(5, 2),
      target_temperature_c VARCHAR(30) DEFAULT '1-6°C',
      qr_code TEXT,
      dispatched_at TIMESTAMP,
      delivered_at TIMESTAMP,
      last_scan_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blood_unit_events (
      id SERIAL PRIMARY KEY,
      blood_unit_id INTEGER NOT NULL REFERENCES blood_units(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL,
      event_details JSONB DEFAULT '{}'::jsonb,
      latitude DECIMAL(10, 7),
      longitude DECIMAL(10, 7),
      temperature_celsius DECIMAL(5, 2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blood_unit_alerts (
      id SERIAL PRIMARY KEY,
      blood_unit_id INTEGER NOT NULL REFERENCES blood_units(id) ON DELETE CASCADE,
      alert_type VARCHAR(50) NOT NULL,
      severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
      message TEXT NOT NULL,
      acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const existing = await pool.query("SELECT COUNT(*)::int AS count FROM blood_units");
  if (existing.rows[0].count === 0) {
    const seedUnits = [
      {
        unit_id: "BU-2025-101",
        blood_group: "O+",
        component: "RBC",
        status: "IN_TRANSIT",
        source_hospital_id: 1,
        destination_hospital_id: 2,
        current_latitude: 12.9716,
        current_longitude: 77.5946,
        temperature_celsius: 4.8,
        qr_code: "",
        dispatched_at: new Date().toISOString()
      },
      {
        unit_id: "BU-2025-102",
        blood_group: "A-",
        component: "Plasma",
        status: "READY_FOR_DISPATCH",
        source_hospital_id: 1,
        destination_hospital_id: 3,
        current_latitude: 12.9563,
        current_longitude: 77.6247,
        temperature_celsius: -18.2,
        qr_code: "",
        dispatched_at: null
      },
      {
        unit_id: "BU-2025-103",
        blood_group: "B+",
        component: "Platelets",
        status: "AT_HOSPITAL",
        source_hospital_id: 2,
        destination_hospital_id: 4,
        current_latitude: 13.0108,
        current_longitude: 77.5663,
        temperature_celsius: 21.5,
        qr_code: "",
        dispatched_at: new Date(Date.now() - 1000 * 60 * 35).toISOString()
      }
    ];

    for (const unit of seedUnits) {
      const qr = await QRCode.toDataURL(unit.unit_id);
      await pool.query(
        `INSERT INTO blood_units (
          unit_id, blood_group, component, status, source_hospital_id, destination_hospital_id,
          current_latitude, current_longitude, temperature_celsius, target_temperature_c, qr_code,
          dispatched_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        [
          unit.unit_id,
          unit.blood_group,
          unit.component,
          unit.status,
          unit.source_hospital_id,
          unit.destination_hospital_id,
          unit.current_latitude,
          unit.current_longitude,
          unit.temperature_celsius,
          unit.component === "Plasma" ? "-25 to -15°C" : unit.component === "Platelets" ? "20-24°C" : "1-6°C",
          qr,
          unit.dispatched_at ? new Date(unit.dispatched_at) : null
        ]
      );
    }
  }
};

exports.getTrackingOverview = async (req, res) => {
  try {
    const summaryQuery = `
      SELECT
        COUNT(*)::int AS total_units,
        COUNT(*) FILTER (WHERE status IN ('IN_TRANSIT', 'READY_FOR_DISPATCH'))::int AS in_transit,
        COUNT(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered,
        COUNT(*) FILTER (WHERE status = 'ALERT')::int AS alerts
      FROM blood_units
    `;

    const alertsQuery = `
      SELECT a.*, b.unit_id
      FROM blood_unit_alerts a
      JOIN blood_units b ON b.id = a.blood_unit_id
      ORDER BY a.created_at DESC
      LIMIT 5
    `;

    const [summaryResult, alertsResult] = await Promise.all([
      pool.query(summaryQuery),
      pool.query(alertsQuery)
    ]);

    res.json({
      success: true,
      data: {
        summary: summaryResult.rows[0],
        alerts: alertsResult.rows
      }
    });
  } catch (error) {
    console.error("Error fetching tracking overview:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllBloodUnits = async (req, res) => {
  try {
    const { status, blood_group } = req.query;
    let query = `
      SELECT *
      FROM blood_units
      WHERE 1 = 1
    `;
    const values = [];

    if (status) {
      values.push(status);
      query += ` AND status = $${values.length}`;
    }

    if (blood_group) {
      values.push(blood_group);
      query += ` AND blood_group = $${values.length}`;
    }

    query += ` ORDER BY updated_at DESC`;

    const result = await pool.query(query, values);
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(normalizeBloodUnit)
    });
  } catch (error) {
    console.error("Error fetching blood units:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBloodUnitById = async (req, res) => {
  try {
    const { id } = req.params;
    const unitResult = await pool.query("SELECT * FROM blood_units WHERE id = $1", [id]);
    if (unitResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Blood unit not found" });
    }

    const historyResult = await pool.query(
      `SELECT * FROM blood_unit_events WHERE blood_unit_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [id]
    );

    const alertsResult = await pool.query(
      `SELECT * FROM blood_unit_alerts WHERE blood_unit_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    const unit = normalizeBloodUnit(unitResult.rows[0]);
    res.json({
      success: true,
      data: {
        ...unit,
        history: historyResult.rows,
        alerts: alertsResult.rows
      }
    });
  } catch (error) {
    console.error("Error fetching blood unit:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBloodUnit = async (req, res) => {
  try {
    const {
      blood_group,
      component = "Whole Blood",
      source_hospital_id,
      destination_hospital_id,
      current_latitude,
      current_longitude,
      temperature_celsius,
      donor_id,
      status = "LAB_PREPARED"
    } = req.body;

    if (!blood_group || !source_hospital_id || !destination_hospital_id) {
      return res.status(400).json({
        success: false,
        message: "blood_group, source_hospital_id, and destination_hospital_id are required"
      });
    }

    const unitId = `BU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrCode = await QRCode.toDataURL(unitId);
    const targetTemperature = component === "Plasma" ? "-25 to -15°C" : component === "Platelets" ? "20-24°C" : "1-6°C";

    const result = await pool.query(
      `INSERT INTO blood_units (
        unit_id, blood_group, component, status, source_hospital_id, destination_hospital_id, donor_id,
        current_latitude, current_longitude, temperature_celsius, target_temperature_c, qr_code, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()) RETURNING *`,
      [
        unitId,
        blood_group,
        component,
        STATUS_FLOW.includes(status) ? status : "LAB_PREPARED",
        source_hospital_id,
        destination_hospital_id,
        donor_id || null,
        current_latitude ?? 12.9716,
        current_longitude ?? 77.5946,
        temperature_celsius ?? null,
        targetTemperature,
        qrCode
      ]
    );

    const event = result.rows[0];
    await pool.query(
      `INSERT INTO blood_unit_events (blood_unit_id, event_type, event_details, latitude, longitude, temperature_celsius)
       VALUES ($1, 'CREATED', $2, $3, $4, $5)`,
      [event.id, JSON.stringify({ message: "Blood unit created in lab" }), event.current_latitude, event.current_longitude, event.temperature_celsius]
    );

    const normalized = normalizeBloodUnit(event);
    broadcastUpdate(normalized);

    res.status(201).json({ success: true, data: normalized });
  } catch (error) {
    console.error("Error creating blood unit:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBloodUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, source_hospital_id, destination_hospital_id, dispatched_at, delivered_at } = req.body;

    const existing = await pool.query("SELECT * FROM blood_units WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Blood unit not found" });
    }

    const current = existing.rows[0];
    const nextStatus = STATUS_FLOW.includes(status) ? status : current.status;
    const nextDispatchedAt = dispatched_at ? new Date(dispatched_at) : current.dispatched_at;
    const nextDeliveredAt = delivered_at ? new Date(delivered_at) : current.delivered_at;

    const result = await pool.query(
      `UPDATE blood_units
       SET status = $1,
           source_hospital_id = COALESCE($2, source_hospital_id),
           destination_hospital_id = COALESCE($3, destination_hospital_id),
           dispatched_at = COALESCE($4, dispatched_at),
           delivered_at = COALESCE($5, delivered_at),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [nextStatus, source_hospital_id ?? null, destination_hospital_id ?? null, nextDispatchedAt, nextDeliveredAt, id]
    );

    const updated = normalizeBloodUnit(result.rows[0]);
    await pool.query(
      `INSERT INTO blood_unit_events (blood_unit_id, event_type, event_details)
       VALUES ($1, 'STATUS_UPDATED', $2)`,
      [id, JSON.stringify({ status: nextStatus, message: `Status updated to ${nextStatus}` })]
    );

    broadcastUpdate(updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating blood unit:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBloodUnitLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: "latitude and longitude are required" });
    }

    const unitResult = await pool.query("SELECT * FROM blood_units WHERE id = $1", [id]);
    if (unitResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Blood unit not found" });
    }

    const unit = unitResult.rows[0];
    const updated = await pool.query(
      `UPDATE blood_units
       SET current_latitude = $1,
           current_longitude = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [latitude, longitude, id]
    );

    const normalized = normalizeBloodUnit(updated.rows[0]);
    await pool.query(
      `INSERT INTO blood_unit_events (blood_unit_id, event_type, event_details, latitude, longitude)
       VALUES ($1, 'LOCATION_UPDATED', $2, $3, $4)`,
      [id, JSON.stringify({ message: "Vehicle location updated" }), latitude, longitude]
    );

    broadcastUpdate(normalized);
    res.json({ success: true, data: normalized });
  } catch (error) {
    console.error("Error updating blood unit location:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBloodUnitTemperature = async (req, res) => {
  try {
    const { id } = req.params;
    const { temperature_celsius } = req.body;

    if (temperature_celsius === undefined) {
      return res.status(400).json({ success: false, message: "temperature_celsius is required" });
    }

    const existing = await pool.query("SELECT * FROM blood_units WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Blood unit not found" });
    }

    const unit = existing.rows[0];
    const temp = Number(temperature_celsius);
    const result = await pool.query(
      `UPDATE blood_units
       SET temperature_celsius = $1,
           status = CASE WHEN $2 < 0 THEN 'ALERT' ELSE status END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [temp, temp, id]
    );

    const updated = normalizeBloodUnit(result.rows[0]);
    await pool.query(
      `INSERT INTO blood_unit_events (blood_unit_id, event_type, event_details, temperature_celsius)
       VALUES ($1, 'TEMPERATURE_UPDATED', $2, $3)`,
      [id, JSON.stringify({ message: "Temperature updated" }), temp]
    );

    const alert = await createAlertIfNeeded(unit, temp);
    if (alert) {
      updated.alert = alert;
    }

    broadcastUpdate(updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating blood unit temperature:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.scanBloodUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { location_name, station_name } = req.body;

    const existing = await pool.query("SELECT * FROM blood_units WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Blood unit not found" });
    }

    const unit = existing.rows[0];
    const scanAt = new Date();

    await pool.query(
      `UPDATE blood_units
       SET last_scan_at = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [scanAt, id]
    );

    await pool.query(
      `INSERT INTO blood_unit_events (blood_unit_id, event_type, event_details)
       VALUES ($1, 'SCAN_CONFIRMED', $2)`,
      [id, JSON.stringify({ location_name: location_name || "Checkpoint", station_name: station_name || "Radio relay", scanned_at: scanAt.toISOString() })]
    );

    const updated = await pool.query("SELECT * FROM blood_units WHERE id = $1", [id]);
    const normalized = normalizeBloodUnit(updated.rows[0]);
    broadcastUpdate(normalized);

    res.json({ success: true, data: normalized });
  } catch (error) {
    console.error("Error scanning blood unit:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBloodUnitHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM blood_unit_events WHERE blood_unit_id = $1 ORDER BY created_at DESC`,
      [id]
    );
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error("Error fetching unit history:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTrackingShipments = exports.getAllBloodUnits;
exports.getTrackingShipmentById = exports.getBloodUnitById;
exports.getTrackingOverview = exports.getTrackingOverview;
