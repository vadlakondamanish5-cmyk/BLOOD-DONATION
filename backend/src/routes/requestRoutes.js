const express = require("express");
const router = express.Router();
const requestController = require("../controllers/requestController");

// POST /api/requests - Create an emergency blood request with auto-matching
router.post("/", requestController.createRequest);

// GET /api/requests - Get currently open/matching requests (with optional filters ?urgency= & ?blood_group=)
router.get("/", requestController.getAllRequests);

// GET /api/requests/:id - Get request info, hospital details, and ranked matching donors
router.get("/:id", requestController.getRequestById);

// PATCH /api/requests/:id/status - Update request status (e.g. FULFILLED, CANCELLED)
router.patch("/:id/status", requestController.updateRequestStatus);

// POST /api/requests/:id/match - Re-run Tier-1 matching for a request
router.post("/:id/match", requestController.triggerMatching);

// POST /api/requests/:id/broadcast - Broadcast emergency alert notifications to top matches
router.post("/:id/broadcast", requestController.broadcastAlerts);

module.exports = router;
