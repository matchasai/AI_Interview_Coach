const express = require("express");

const { authMiddleware } = require("../../middleware/authMiddleware");
const userController = require("./user.controller");

const router = express.Router();

router.get("/profile", authMiddleware, userController.getProfile);
router.put("/profile", authMiddleware, userController.updateProfile);
router.get("/stats", authMiddleware, userController.getStats);
router.get("/study-guides", authMiddleware, userController.getStudyGuides);
router.post("/practice-reminders/send", authMiddleware, userController.sendPracticeReminder);

module.exports = router;
