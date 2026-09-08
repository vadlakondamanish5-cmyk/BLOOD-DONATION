const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || "hexavision",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD
});

pool.on("connect", () => {
    console.log("PostgreSQL connected successfully");
});

pool.on("error", (err) => {
    console.error("PostgreSQL connection error:", err);
});

module.exports = pool;