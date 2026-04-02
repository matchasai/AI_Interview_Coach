const { User } = require("../auth/user.model");
const Session = require("../session/session.model");
const { AppError } = require("../../utils/AppError");
const analyticsService = require("../analytics/analytics.service");
const emailQueue = require("../auth/email.queue");

async function listUsers({ limit = 20, offset = 0 }) {
  const l = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const o = Math.max(Number(offset) || 0, 0);

  const users = await User.find({})
    .sort({ createdAt: -1 })
    .skip(o)
    .limit(l)
    .select("name email role totalSessions avgScore createdAt emailVerified");

  return users;
}

async function listSessions({ limit = 20, offset = 0 }) {
  const l = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const o = Math.max(Number(offset) || 0, 0);

  const sessions = await Session.find({})
    .sort({ createdAt: -1 })
    .skip(o)
    .limit(l);

  return sessions;
}

async function getPlatformStats() {
  const [userCount, sessionCount] = await Promise.all([
    User.countDocuments({}),
    Session.countDocuments({}),
  ]);

  const roleDistribution = await Session.aggregate([
    { $match: { status: "completed" } },
    { $group: { _id: "$role", count: { $sum: 1 }, avgScore: { $avg: "$totalScore" } } },
    { $sort: { count: -1 } },
  ]);

  return {
    userCount,
    sessionCount,
    roleDistribution: roleDistribution.map((r) => ({
      role: r._id,
      count: r.count,
      avgScore: Math.round(r.avgScore ?? 0),
    })),
  };
}

async function recoverSession({ sessionId }) {
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new AppError("Session not found", 404, "NOT_FOUND");
  }

  // Restore session by removing soft-delete marker if it exists
  session.status = "paused"; // Or "active" depending on your logic
  await session.save();

  return session;
}

async function deleteUser({ userId }) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  // Soft delete or archive user
  await User.findByIdAndUpdate(userId, {
    isActive: false,
    email: `${user.email}.deleted.${Date.now()}`,
  });

  return { success: true };
}

async function getEmailQueueStatus() {
  // Get queue status from email queue
  const queueStatus = emailQueue.getQueueStatus ? emailQueue.getQueueStatus() : {};

  return {
    pending: queueStatus.pending || 0,
    failed: queueStatus.failed || 0,
    retrying: queueStatus.retrying || 0,
    processed: queueStatus.processed || 0,
    lastProcessed: queueStatus.lastProcessed || null,
  };
}

async function getAnalytics({ userId, roleFilter, difficultyFilter, startDate, endDate }) {
  if (userId) {
    // User analytics
    return await analyticsService.getUserAnalytics({
      userId,
      roleFilter,
      difficultyFilter,
      startDate,
      endDate,
    });
  } else {
    // Platform analytics
    return await analyticsService.getPlatformStatistics();
  }
}

module.exports = {
  listUsers,
  listSessions,
  getPlatformStats,
  recoverSession,
  deleteUser,
  getEmailQueueStatus,
  getAnalytics,
};
