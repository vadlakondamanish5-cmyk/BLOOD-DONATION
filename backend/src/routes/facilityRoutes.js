const express = require("express");
const router = express.Router();
const facilityController = require("../controllers/facilityController");

// Network-wide summary
router.get("/summary/inventory", facilityController.getNetworkInventorySummary);

// Facility CRUD & Directory
router.get("/", facilityController.getAllFacilities);
router.post("/", facilityController.createFacility);
router.get("/:id", facilityController.getFacilityById);
router.put("/:id", facilityController.updateFacility);

// Status & Verification & Deboarding Workflows
router.post("/:id/verify", facilityController.verifyFacility);
router.post("/:id/suspend", facilityController.suspendFacility);
router.post("/:id/deboard", facilityController.deboardFacility);
router.post("/:id/restore", facilityController.restoreFacility);
router.post("/merge", facilityController.mergeFacilities);

// Inventory & Units
router.get("/:id/inventory", facilityController.getFacilityInventory);
router.get("/:id/blood-units", facilityController.getFacilityBloodUnits);

module.exports = router;
