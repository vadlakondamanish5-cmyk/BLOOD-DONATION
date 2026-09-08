const fs = require("fs");
const path = require("path");
const pool = require("./pool");

// Simple CSV parser for quoted fields
function parseCsv(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const records = [];
    // skip header line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const fields = [];
        let cur = "";
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                if (inQuotes && line[j + 1] === '"') {
                    cur += '"';
                    j++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                fields.push(cur);
                cur = "";
            } else {
                cur += char;
            }
        }
        fields.push(cur);

        if (fields.length >= 10) {
            records.push({
                id: parseInt(fields[0], 10),
                category: fields[1],
                subcategory: fields[2],
                question: fields[3],
                answer: fields[4],
                keywords: fields[5],
                difficulty: fields[6],
                source: fields[7],
                source_url: fields[8],
                medical_safety_level: fields[9]
            });
        }
    }
    return records;
}

async function seedBloodKnowledge() {
    const client = await pool.connect();
    try {
        console.log("🌱 Seeding Blood Knowledge Base into PostgreSQL...");
        const csvPath = path.join(__dirname, "../../data/blood_knowledge.csv");
        const rawContent = fs.readFileSync(csvPath, "utf8");
        const records = parseCsv(rawContent);

        console.log(`Parsed ${records.length} records from CSV.`);

        await client.query("BEGIN");
        await client.query("TRUNCATE TABLE blood_knowledge RESTART IDENTITY CASCADE");

        const insertQuery = `
            INSERT INTO blood_knowledge (
                category, subcategory, question, answer, keywords, difficulty, source, source_url, medical_safety_level
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        for (const r of records) {
            await client.query(insertQuery, [
                r.category,
                r.subcategory,
                r.question,
                r.answer,
                r.keywords,
                r.difficulty,
                r.source,
                r.source_url,
                r.medical_safety_level
            ]);
        }

        await client.query("COMMIT");
        console.log(`✅ Successfully seeded ${records.length} records into blood_knowledge table!`);
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Seeding blood knowledge failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

if (require.main === module) {
    seedBloodKnowledge();
}

module.exports = seedBloodKnowledge;
