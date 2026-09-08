const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const pool = require("./db/pool");

// Route imports
const hospitalRoutes = require("./routes/hospitalRoutes");
const donorRoutes = require("./routes/donorRoutes");
const requestRoutes = require("./routes/requestRoutes");
const matchRoutes = require("./routes/matchRoutes");
const consentRoutes = require("./routes/consentRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const bloodUnitRoutes = require("./routes/bloodUnitRoutes");
const authRoutes = require("./routes/authRoutes");
const facilityRoutes = require("./routes/facilityRoutes");
const auditRoutes = require("./routes/auditRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { ensureTrackingTables } = require("./controllers/bloodUnitController");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
  }
});

global.__hexavisionIo = io;

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
            map: "/api/analytics/map-data",
            auth: "/api/auth"
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

io.on("connection", (socket) => {
    console.log("Socket client connected:", socket.id);

    socket.on("join-room", (room) => {
        if (room) socket.join(room);
    });

    socket.on("disconnect", () => {
        console.log("Socket client disconnected:", socket.id);
    });
});

// API Routes
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/consent", consentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/blood-units", bloodUnitRoutes);
app.use("/api/tracking", bloodUnitRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/facilities", facilityRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/chat", chatRoutes);

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

const PORT = process.env.PORT || 5001;

server.listen(PORT, async () => {
    try {
        await ensureTrackingTables();
        console.log(`🚀 HexaVision server running on http://localhost:${PORT}`);
    } catch (error) {
        console.error("Error bootstrapping tracking tables:", error);
        console.log(`🚀 HexaVision server running on http://localhost:${PORT}`);
    }
});