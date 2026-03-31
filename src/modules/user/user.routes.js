const express = require("express");

const { authMiddleware } = require("../../middleware/authMiddleware");
const userController = require("./user.controller");

const router = express.Router();

router.get("/profile", authMiddleware, userController.getProfile);
router.put("/profile", authMiddleware, userController.updateProfile);
router.get("/stats", authMiddleware, userController.getStats);

module.exports = router;
