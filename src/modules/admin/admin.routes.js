const express = require("express");

const { authMiddleware } = require("../../middleware/authMiddleware");
const { adminMiddleware } = require("../../middleware/adminMiddleware");
const adminController = require("./admin.controller");

const router = express.Router();

router.get("/users", authMiddleware, adminMiddleware, adminController.listUsers);
router.get("/sessions", authMiddleware, adminMiddleware, adminController.listSessions);
router.get("/stats", authMiddleware, adminMiddleware, adminController.stats);

module.exports = router;
