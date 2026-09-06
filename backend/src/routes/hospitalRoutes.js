const express = require("express");
const router = express.Router();
const hospitalController = require("../controllers/hospitalController");

router.get("/", hospitalController.getAllHospitals);
router.get("/blood-stock", hospitalController.getAllHospitalBloodStock);
router.get("/:id/blood-stock", hospitalController.getHospitalBloodStockById);
router.get("/:id", hospitalController.getHospitalById);
router.post("/", hospitalController.createHospital);

module.exports = router;
