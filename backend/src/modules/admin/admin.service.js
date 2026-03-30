const { User } = require("../auth/user.model");
const { Session } = require("../session/session.model");

async function listUsers({ limit = 20, offset = 0 }) {
  const l = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const o = Math.max(Number(offset) || 0, 0);

  const users = await User.find({})
    .sort({ createdAt: -1 })
    .skip(o)
    .limit(l)
    .select("name email role totalSessions avgScore createdAt");

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

module.exports = {
  listUsers,
  listSessions,
  getPlatformStats,
};
