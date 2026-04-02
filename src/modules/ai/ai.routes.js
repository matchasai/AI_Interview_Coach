const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const aiController = require("./ai.controller");

const router = express.Router();

router.post("/explain-topic", authMiddleware, aiController.explainTopic);
router.post("/doubt-followup", authMiddleware, aiController.doubtFollowup);
router.get("/doubt-sessions", authMiddleware, aiController.getDoubtSessions);
router.get("/doubt-sessions/:id", authMiddleware, aiController.getDoubtSessionById);
router.patch("/doubt-sessions/:id/rename", authMiddleware, aiController.renameDoubtSession);
router.delete("/doubt-sessions/:id", authMiddleware, aiController.deleteDoubtSession);
router.patch("/doubt-sessions/:id/pin", authMiddleware, aiController.pinMessageInDoubtSession);

module.exports = router;
