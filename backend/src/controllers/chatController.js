const { classifyMessage } = require("../services/safetyService");
const { searchKnowledge } = require("../services/knowledgeService");
const { generateAnswer } = require("../services/aiService");

// In-memory sliding-window rate limiter (Max 40 requests per minute per IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 40;

function checkRateLimit(ip) {
    const now = Date.now();
    const timestamps = rateLimitMap.get(ip) || [];
    const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

    if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }

    validTimestamps.push(now);
    rateLimitMap.set(ip, validTimestamps);
    return true;
}

// Periodically clean up stale rate limit entries
setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of rateLimitMap.entries()) {
        const active = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
        if (active.length === 0) {
            rateLimitMap.delete(ip);
        } else {
            rateLimitMap.set(ip, active);
        }
    }
}, 5 * 60 * 1000);

exports.handleChat = async (req, res) => {
    try {
        const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local";

        // 1. Rate Limiting Check
        if (!checkRateLimit(clientIp)) {
            return res.status(429).json({
                success: false,
                message: "You have exceeded the request rate limit for Blood Knowledge AI. Please wait a moment and try again."
            });
        }

        const { message, history = [] } = req.body;

        if (!message || typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: "A message string is required."
            });
        }

        const trimmedMessage = message.trim();

        // 2. Medical Safety Classification
        const classification = classifyMessage(trimmedMessage);

        // 3. Knowledge Retrieval
        let knowledgeRecords = [];
        if (classification.type !== "EMERGENCY") {
            const retrievalResult = await searchKnowledge(trimmedMessage, { limit: 4 });
            knowledgeRecords = retrievalResult.records || [];
        }

        // 4. Response Synthesis
        const responseData = await generateAnswer({
            userMessage: trimmedMessage,
            classification,
            knowledgeRecords,
            history
        });

        res.json({
            success: true,
            reply: responseData.reply,
            answer: responseData.reply,
            category: responseData.category,
            safety_category: classification.type,
            safety_advisory: classification.advisory || null,
            sources: responseData.sources || [],
            matches_count: knowledgeRecords.length,
            classification: {
                type: classification.type,
                reason: classification.reason,
                advisory: classification.advisory
            }
        });
    } catch (err) {
        console.error("Error in chatController:", err.message);
        res.status(500).json({
            success: false,
            message: "Blood Knowledge AI is temporarily unavailable. Please try again."
        });
    }
};
