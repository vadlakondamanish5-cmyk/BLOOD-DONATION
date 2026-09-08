const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authController.me);

// Phone OTP endpoints
router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);

// Email OTP endpoints
router.post("/send-email-otp", authController.sendEmailOtp);
router.post("/verify-email-otp", authController.verifyEmailOtp);

// Donor Login via Phone & OTP
router.post("/donor-login-otp", authController.sendDonorLoginOtp);
router.post("/verify-donor-login", authController.verifyDonorLogin);

// Phone status / duplicate check
router.get("/check-phone/:phone", authController.checkPhoneRegistered);

module.exports = router;
