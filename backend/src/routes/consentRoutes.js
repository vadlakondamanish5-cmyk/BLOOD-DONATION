const express = require("express");
const router = express.Router();
const consentController = require("../controllers/consentController");

router.get("/logs", consentController.getConsentLogs);
router.post("/log", consentController.recordConsentLog);

module.exports = router;
