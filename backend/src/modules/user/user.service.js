const bcrypt = require("bcryptjs");

const { AppError } = require("../../utils/AppError");
const { User } = require("../auth/user.model");
const { Session } = require("../session/session.model");
const { toSafeUser } = require("../auth/auth.service");

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  return toSafeUser(user);
}

async function updateProfile(userId, { name, password }) {
  const user = await User.findById(userId).select("+password");
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  if (typeof name === "string" && name.trim().length >= 2) {
    user.name = name.trim();
  }

  if (typeof password === "string") {
    if (password.length < 8) {
      throw new AppError("Password must be at least 8 characters", 400, "VALIDATION_ERROR");
    }
    user.password = await bcrypt.hash(password, 12);
  }

  await user.save();

  const safeUser = await User.findById(user._id);
  return toSafeUser(safeUser);
}

async function getStats(userId) {
  // Quick stats from user doc
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  // Derived stats from sessions
  const roleAgg = await Session.aggregate([
    { $match: { userId: user._id, status: "completed" } },
    {
      $group: {
        _id: "$role",
        avgScore: { $avg: "$totalScore" },
        sessions: { $sum: 1 },
        bestScore: { $max: "$totalScore" },
      },
    },
    { $sort: { avgScore: -1 } },
  ]);

  const bestRole = roleAgg.length ? roleAgg[0]._id : null;

  const durationAgg = await Session.aggregate([
    { $match: { userId: user._id, status: "completed" } },
    {
      $project: {
        duration: {
          $ifNull: [
            "$durationSeconds",
            {
              $round: [{ $divide: [{ $subtract: ["$completedAt", "$createdAt"] }, 1000] }, 0],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalDurationSeconds: { $sum: "$duration" },
        avgDurationSeconds: { $avg: "$duration" },
      },
    },
  ]);

  const durationSummary = durationAgg[0] || { totalDurationSeconds: 0, avgDurationSeconds: 0 };

  return {
    totalSessions: user.totalSessions,
    avgScore: user.avgScore,
    avgDurationSeconds: Math.round(durationSummary.avgDurationSeconds || 0),
    totalDurationSeconds: Math.round(durationSummary.totalDurationSeconds || 0),
    bestRole,
    perRole: roleAgg.map((r) => ({
      role: r._id,
      avgScore: Math.round(r.avgScore ?? 0),
      sessions: r.sessions,
      bestScore: r.bestScore,
    })),
  };
}

module.exports = {
  getProfile,
  updateProfile,
  getStats,
};
