const express = require("express");
const router = express.Router();
const donorController = require("../controllers/donorController");

router.get("/", donorController.getAllDonors);
router.get("/:id/eligibility", donorController.getDonorEligibility);
router.get("/:id/donations", donorController.getDonorDonationSummary);
router.post("/:id/donations", donorController.recordDonation);
router.get("/:id", donorController.getDonorById);
router.post("/", donorController.createDonor);
router.patch("/:id", donorController.updateDonor);
router.delete("/:id", donorController.deleteDonor);

module.exports = router;
