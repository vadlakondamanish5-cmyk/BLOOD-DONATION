const express = require("express");
const router = express.Router();
const donorController = require("../controllers/donorController");
const authController = require("../controllers/authController");

router.get("/", donorController.getAllDonors);
router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.get("/:id/eligibility", donorController.getDonorEligibility);
router.get("/:id/donations", donorController.getDonorDonationSummary);
router.post("/:id/donations", donorController.recordDonation);
router.get("/:id", donorController.getDonorById);
router.post("/", donorController.createDonor);
router.patch("/:id", donorController.updateDonor);
router.delete("/:id", donorController.deleteDonor);

module.exports = router;
