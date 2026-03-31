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

module.exports = {
  listUsers,
  listSessions,
  stats,
};
