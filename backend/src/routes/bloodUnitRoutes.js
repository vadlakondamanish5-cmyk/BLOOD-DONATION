const express = require("express");
const router = express.Router();
const controller = require("../controllers/bloodUnitController");

router.get("/overview", controller.getTrackingOverview);
router.get("/", controller.getAllBloodUnits);
router.post("/", controller.createBloodUnit);
router.get("/:id", controller.getBloodUnitById);
router.patch("/:id", controller.updateBloodUnit);
router.patch("/:id/location", controller.updateBloodUnitLocation);
router.patch("/:id/temperature", controller.updateBloodUnitTemperature);
router.post("/:id/scan", controller.scanBloodUnit);
router.get("/:id/history", controller.getBloodUnitHistory);

module.exports = router;
