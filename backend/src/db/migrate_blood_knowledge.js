const pool = require("./pool");

async function migrateBloodKnowledge() {
    try {
        console.log("Starting blood_knowledge table migration...");

        const query = `
            CREATE TABLE IF NOT EXISTS blood_knowledge (
                id SERIAL PRIMARY KEY,
                category VARCHAR(120) NOT NULL,
                subcategory VARCHAR(120),
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                keywords TEXT,
                difficulty VARCHAR(40) DEFAULT 'beginner',
                source VARCHAR(180),
                source_url TEXT,
                medical_safety_level VARCHAR(60) DEFAULT 'educational',
                search_vector tsvector GENERATED ALWAYS AS (
                    to_tsvector('english', coalesce(question, '') || ' ' || coalesce(answer, '') || ' ' || coalesce(keywords, '') || ' ' || coalesce(category, ''))
                ) STORED,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_blood_knowledge_search ON blood_knowledge USING GIN (search_vector);
            CREATE INDEX IF NOT EXISTS idx_blood_knowledge_category ON blood_knowledge (category);
            CREATE INDEX IF NOT EXISTS idx_blood_knowledge_question ON blood_knowledge (question);
        `;

        await pool.query(query);
        console.log("✅ blood_knowledge table and GIN search vector indexes created successfully!");
    } catch (err) {
        console.error("Migration error for blood_knowledge:", err);
    } finally {
        await pool.end();
    }
}

migrateBloodKnowledge();
