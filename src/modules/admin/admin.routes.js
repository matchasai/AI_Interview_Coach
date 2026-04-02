const express = require("express");

const { authMiddleware } = require("../../middleware/authMiddleware");
const { adminMiddleware } = require("../../middleware/adminMiddleware");
const adminController = require("./admin.controller");

const router = express.Router();

router.get("/users", authMiddleware, adminMiddleware, adminController.listUsers);
router.get("/sessions", authMiddleware, adminMiddleware, adminController.listSessions);
router.get("/stats", authMiddleware, adminMiddleware, adminController.stats);
router.get("/analytics", authMiddleware, adminMiddleware, adminController.getAnalytics);
router.get("/email-queue-status", authMiddleware, adminMiddleware, adminController.getEmailQueueStatus);
router.post("/sessions/:sessionId/recover", authMiddleware, adminMiddleware, adminController.recoverSession);
router.delete("/users/:userId", authMiddleware, adminMiddleware, adminController.deleteUser);

module.exports = router;
