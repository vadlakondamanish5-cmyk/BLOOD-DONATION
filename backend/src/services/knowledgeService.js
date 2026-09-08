const pool = require("../db/pool");

/**
 * Searches the blood_knowledge database for relevant question-answer records
 * using PostgreSQL full-text search (tsvector/GIN) combined with keyword match scoring.
 */
async function searchKnowledge(queryText, options = {}) {
    const { limit = 5, category = null } = options;

    if (!queryText || typeof queryText !== "string" || queryText.trim().length === 0) {
        return { records: [], hasSufficientKnowledge: false };
    }

    const cleanQuery = queryText.trim();
    // Clean words for tsquery OR operator
    const queryWords = cleanQuery
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 2 && !["what", "when", "where", "which", "how", "does", "the", "are", "about", "with", "from", "after", "before"].includes(w));

    const orTsQuery = queryWords.length > 0 ? queryWords.join(" | ") : cleanQuery;

    try {
        let sql = `
            WITH scored_results AS (
                SELECT 
                    id,
                    category,
                    subcategory,
                    question,
                    answer,
                    keywords,
                    difficulty,
                    source,
                    source_url,
                    COALESCE(ts_rank(search_vector, to_tsquery('english', $1)), 0) AS rank_score,
                    CASE 
                        WHEN LOWER(question) = LOWER($2) THEN 150
                        WHEN LOWER(question) LIKE '%' || LOWER($2) || '%' THEN 80
                        WHEN LOWER($2) LIKE '%' || LOWER(question) || '%' THEN 60
                        ELSE 0
                    END AS exact_score
                FROM blood_knowledge
                WHERE 
                    search_vector @@ to_tsquery('english', $1)
                    OR question ILIKE '%' || $2 || '%'
                    OR keywords ILIKE '%' || $2 || '%'
                    OR answer ILIKE '%' || $2 || '%'
            )
            SELECT 
                id, category, subcategory, question, answer, keywords, difficulty, source, source_url, rank_score, exact_score
            FROM scored_results
        `;

        const params = [orTsQuery, cleanQuery];
        let pIndex = 3;

        if (category) {
            sql += ` WHERE category = $${pIndex++}`;
            params.push(category);
        }

        sql += `
            ORDER BY (exact_score + (rank_score * 20)) DESC, id ASC
            LIMIT $${pIndex++}
        `;
        params.push(limit);

        const result = await pool.query(sql, params);

        if (result.rows.length > 0) {
            return {
                records: result.rows,
                hasSufficientKnowledge: true
            };
        }

        // Fallback: If full-text search produced no results, try splitting into individual keywords with ILIKE
        if (queryWords.length > 0) {
            const ilikeConditions = queryWords.map((_, i) => `(question ILIKE $${i + 1} OR keywords ILIKE $${i + 1} OR answer ILIKE $${i + 1})`).join(" OR ");
            const fallbackSql = `
                SELECT id, category, subcategory, question, answer, keywords, difficulty, source, source_url, 1 as rank_score, 0 as exact_score
                FROM blood_knowledge
                WHERE ${ilikeConditions}
                ORDER BY id ASC
                LIMIT $${queryWords.length + 1}
            `;
            const fallbackParams = queryWords.map(w => `%${w}%`);
            fallbackParams.push(limit);

            const fallbackResult = await pool.query(fallbackSql, fallbackParams);
            return {
                records: fallbackResult.rows,
                hasSufficientKnowledge: fallbackResult.rows.length > 0
            };
        }

        return { records: [], hasSufficientKnowledge: false };
    } catch (err) {
        // In case to_tsquery syntax error (e.g. unexpected character), fallback safely to ILIKE
        console.warn("Notice in searchKnowledge primary query, falling back to ILIKE:", err.message);
        try {
            const fallbackWords = queryWords.length > 0 ? queryWords : [cleanQuery.slice(0, 20)];
            const ilikeConditions = fallbackWords.map((_, i) => `(question ILIKE $${i + 1} OR keywords ILIKE $${i + 1} OR answer ILIKE $${i + 1})`).join(" OR ");
            const fallbackSql = `
                SELECT id, category, subcategory, question, answer, keywords, difficulty, source, source_url, 1 as rank_score, 0 as exact_score
                FROM blood_knowledge
                WHERE ${ilikeConditions}
                LIMIT $${fallbackWords.length + 1}
            `;
            const fallbackParams = fallbackWords.map(w => `%${w}%`);
            fallbackParams.push(limit);

            const fallbackResult = await pool.query(fallbackSql, fallbackParams);
            return {
                records: fallbackResult.rows,
                hasSufficientKnowledge: fallbackResult.rows.length > 0
            };
        } catch (innerErr) {
            console.error("Error in fallback searchKnowledge:", innerErr.message);
            return { records: [], hasSufficientKnowledge: false, error: innerErr.message };
        }
    }
}

module.exports = { searchKnowledge };
