const pool = require("../db/pool");
const { logAudit } = require("../utils/auditLogger");

exports.getAuditLogs = async (req, res) => {
    try {
        const { entity_type, action, search, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT * FROM audit_logs
            WHERE 1=1
        `;
        const values = [];
        let pIndex = 1;

        if (entity_type) {
            query += ` AND entity_type = $${pIndex++}`;
            values.push(entity_type);
        }

        if (action) {
            query += ` AND action = $${pIndex++}`;
            values.push(action);
        }

        if (search) {
            query += ` AND (action ILIKE $${pIndex} OR reason ILIKE $${pIndex} OR actor_name ILIKE $${pIndex} OR entity_id ILIKE $${pIndex})`;
            values.push(`%${search}%`);
            pIndex++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${pIndex++} OFFSET $${pIndex++}`;
        values.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, values);

        const countQuery = `SELECT COUNT(*) FROM audit_logs`;
        const countRes = await pool.query(countQuery);

        res.json({
            success: true,
            total: parseInt(countRes.rows[0].count),
            count: result.rows.length,
            data: result.rows
        });
    } catch (err) {
        console.error("Error fetching audit logs:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.createManualAuditLog = async (req, res) => {
    try {
        const { action, entity_type, entity_id, reason, metadata, actor_name, actor_role } = req.body;
        if (!action || !entity_type || !entity_id) {
            return res.status(400).json({ success: false, message: "action, entity_type, and entity_id are required" });
        }

        const log = await logAudit({
            actor_id: req.user?.id || "USER",
            actor_name: actor_name || req.user?.name || "Administrative User",
            actor_role: actor_role || req.user?.role || "ADMIN",
            action,
            entity_type,
            entity_id,
            reason,
            metadata
        });

        res.status(201).json({ success: true, data: log });
    } catch (err) {
        console.error("Error creating audit log:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
