const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db/pool");

// Route imports
const hospitalRoutes = require("./routes/hospitalRoutes");
const donorRoutes = require("./routes/donorRoutes");
const requestRoutes = require("./routes/requestRoutes");
const matchRoutes = require("./routes/matchRoutes");
const consentRoutes = require("./routes/consentRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Home route
app.get("/", (req, res) => {
    res.json({
        name: "HexaVision Emergency Blood Coordination API",
        version: "1.0.0",
        status: "ONLINE",
        endpoints: {
            hospitals: "/api/hospitals",
            donors: "/api/donors",
            requests: "/api/requests",
            matches: "/api/matches",
            consent: "/api/consent/logs",
            analytics: "/api/analytics/dashboard",
            map: "/api/analytics/map-data"
        }
    });
});

// Database test route
app.get("/api/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS current_time");
        res.json({
            message: "Database connection successful",
            database: "hexavision",
            time: result.rows[0].current_time
        });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({
            message: "Database connection failed",
            error: error.message
        });
    }
});

// API Routes
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/consent", consentRoutes);
app.use("/api/analytics", analyticsRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.originalUrl} not found`
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 HexaVision server running on http://localhost:${PORT}`);
});