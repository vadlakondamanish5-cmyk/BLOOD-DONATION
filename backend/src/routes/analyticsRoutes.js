const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

router.get("/dashboard", analyticsController.getDashboardStats);
router.get("/map-data", analyticsController.getMapData);

module.exports = router;
