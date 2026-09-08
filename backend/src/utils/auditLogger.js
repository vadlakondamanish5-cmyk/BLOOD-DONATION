const pool = require("../db/pool");

async function logAudit({ actor_id = "SYSTEM", actor_name = "System Admin", actor_role = "ADMIN", action, entity_type, entity_id, reason = null, metadata = {} }) {
    try {
        const query = `
            INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, entity_type, entity_id, reason, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const values = [
            actor_id,
            actor_name,
            actor_role,
            action,
            entity_type,
            String(entity_id),
            reason,
            JSON.stringify(metadata)
        ];
        const res = await pool.query(query, values);
        return res.rows[0];
    } catch (err) {
        console.error("Audit log creation error:", err.message);
        return null;
    }
}

module.exports = { logAudit };
