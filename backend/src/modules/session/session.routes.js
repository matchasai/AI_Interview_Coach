const express = require("express");

const { authMiddleware } = require("../../middleware/authMiddleware");
const { adminMiddleware } = require("../../middleware/adminMiddleware");
const sessionController = require("./session.controller");

const router = express.Router();

router.post("/start", authMiddleware, sessionController.startSession);
router.get("/recommendation", authMiddleware, sessionController.getDifficultyRecommendation);
router.post("/recommendation/feedback", authMiddleware, sessionController.submitRecommendationFeedback);
router.post("/:id/answer", authMiddleware, sessionController.submitAnswer);
router.put("/:id/complete", authMiddleware, sessionController.completeSession);
router.put("/:id/pause", authMiddleware, sessionController.pauseSession);
router.get("/history", authMiddleware, sessionController.getHistory);
router.get("/:id", authMiddleware, sessionController.getSessionById);
router.delete("/:id", authMiddleware, adminMiddleware, sessionController.adminSoftDelete);

module.exports = router;
