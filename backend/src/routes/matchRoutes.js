const express = require("express");
const router = express.Router();
const matchController = require("../controllers/matchController");

router.get("/", matchController.getAllMatches);
router.patch("/:id/respond", matchController.respondToMatch);

module.exports = router;
