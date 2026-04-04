const { asyncHandler } = require("../../utils/asyncHandler");
const { AppError } = require("../../utils/AppError");
const { trim } = require("../../utils/sanitize");
const userService = require("./user.service");

const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user.userId);
  res.status(200).json({ success: true, user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const name = req.body?.name != null ? trim(req.body.name) : undefined;
  const password = req.body?.password;

  if (name === undefined && password === undefined) {
    throw new AppError("Nothing to update", 400, "VALIDATION_ERROR");
  }

  const user = await userService.updateProfile(req.user.userId, { name, password });
  res.status(200).json({ success: true, user });
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await userService.getStats(req.user.userId);
  res.status(200).json({ success: true, stats });
});

const getStudyGuides = asyncHandler(async (req, res) => {
  const studyGuides = await userService.getStudyGuides(req.user.userId);
  res.status(200).json({ success: true, studyGuides });
});

const sendPracticeReminder = asyncHandler(async (req, res) => {
  const result = await userService.sendPracticeReminder(req.user.userId);
  res.status(200).json({ success: true, ...result });
});

module.exports = {
  getProfile,
  updateProfile,
  getStats,
  getStudyGuides,
  sendPracticeReminder,
};
