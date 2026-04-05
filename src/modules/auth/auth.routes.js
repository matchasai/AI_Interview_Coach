const express = require("express");

const authController = require("./auth.controller");
const { authMiddleware } = require("../../middleware/authMiddleware");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification-email", authController.resendVerificationEmail);
router.get("/me", authMiddleware, authController.me);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Diagnostic endpoints for email troubleshooting
router.get("/diagnostics/email", authController.emailDiagnostics);
router.post("/diagnostics/email/test", authController.emailTestSend);

module.exports = router;
