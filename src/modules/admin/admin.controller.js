const { asyncHandler } = require("../../utils/asyncHandler");
const adminService = require("./admin.service");

const listUsers = asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const users = await adminService.listUsers({ limit, offset });
  res.status(200).json({ success: true, users });
});

const listSessions = asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const sessions = await adminService.listSessions({ limit, offset });
  res.status(200).json({ success: true, sessions });
});

const stats = asyncHandler(async (req, res) => {
  const statsResult = await adminService.getPlatformStats();
  res.status(200).json({ success: true, stats: statsResult });
});

const getAnalytics = asyncHandler(async (req, res) => {
  const { userId, roleFilter, difficultyFilter, startDate, endDate } = req.query;
  const analytics = await adminService.getAnalytics({
    userId,
    roleFilter,
    difficultyFilter,
    startDate,
    endDate,
  });
  res.status(200).json({ success: true, analytics });
});

const getEmailQueueStatus = asyncHandler(async (req, res) => {
  const status = await adminService.getEmailQueueStatus();
  res.status(200).json({ success: true, queueStatus: status });
});

const recoverSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await adminService.recoverSession({ sessionId });
  res.status(200).json({ success: true, session });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await adminService.deleteUser({ userId });
  res.status(200).json({ success: true, result });
});

module.exports = {
  listUsers,
  listSessions,
  stats,
  getAnalytics,
  getEmailQueueStatus,
  recoverSession,
  deleteUser,
};
