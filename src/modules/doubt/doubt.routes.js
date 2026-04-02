const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const doubtController = require("./doubt.controller");

const router = express.Router();

router.post("/", authMiddleware, doubtController.createSession);
router.get("/", authMiddleware, doubtController.listSessions);
router.get("/:id", authMiddleware, doubtController.getSession);
router.post("/:id/ask", authMiddleware, doubtController.askQuestion);
router.post("/:id/archive", authMiddleware, doubtController.archiveSession);
router.post("/:id/pin", authMiddleware, doubtController.pinMessage);

module.exports = router;
