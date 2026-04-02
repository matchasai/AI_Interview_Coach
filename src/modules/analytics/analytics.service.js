const Session = require("../session/session.model");
const { AppError } = require("../../utils/AppError");

async function getUserAnalytics({ userId, roleFilter, difficultyFilter, startDate, endDate }) {
  const query = { userId };

  if (roleFilter) query.role = roleFilter;
  if (difficultyFilter) query.difficulty = difficultyFilter;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const sessions = await Session.find(query).sort({ createdAt: -1 }).lean();

  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      averageScore: 0,
      performanceTrend: [],
      rolePerformance: {},
      weakAreas: [],
      strongAreas: [],
      difficultyBreakdown: {},
    };
  }

  // Calculate role performance
  const roleStats = {};
  sessions.forEach((session) => {
    if (!roleStats[session.role]) {
      roleStats[session.role] = { total: 0, scores: [], count: 0 };
    }
    roleStats[session.role].scores.push(session.totalScore || 0);
    roleStats[session.role].count += 1;
  });

  const rolePerformance = {};
  for (const [role, stats] of Object.entries(roleStats)) {
    const total = stats.scores.reduce((a, b) => a + b, 0);
    rolePerformance[role] = {
      average: Math.round((total / stats.count) * 100) / 100,
      attempts: stats.count,
    };
  }

  // Calculate weak/strong areas from question feedback
  const topicStats = {};
  sessions.forEach((session) => {
    (session.questions || []).forEach((q) => {
      const topic = q.topic || "General";
      if (!topicStats[topic]) {
        topicStats[topic] = { scores: [], count: 0 };
      }
      topicStats[topic].scores.push(q.score || 0);
      topicStats[topic].count += 1;
    });
  });

  const topicPerformance = Object.entries(topicStats)
    .map(([topic, stats]) => {
      const avg = stats.scores.reduce((a, b) => a + b, 0) / stats.count;
      return { topic, average: Math.round(avg * 100) / 100, attempts: stats.count };
    })
    .sort((a, b) => a.average - b.average);

  const weakAreas = topicPerformance.slice(0, 5).map((t) => ({
    area: t.topic,
    score: t.average,
    attempts: t.attempts,
  }));

  const strongAreas = topicPerformance.slice(-5).reverse().map((t) => ({
    area: t.topic,
    score: t.average,
    attempts: t.attempts,
  }));

  // Performance trend (last 10 sessions)
  const recentSessions = sessions.slice(0, 10).reverse();
  const performanceTrend = recentSessions.map((s, idx) => ({
    session: idx + 1,
    score: s.totalScore || 0,
    date: s.createdAt,
    role: s.role,
  }));

  // Difficulty breakdown
  const difficultyBreakdown = {};
  sessions.forEach((s) => {
    const diff = s.difficulty || "medium";
    if (!difficultyBreakdown[diff]) {
      difficultyBreakdown[diff] = { count: 0, totalScore: 0 };
    }
    difficultyBreakdown[diff].count += 1;
    difficultyBreakdown[diff].totalScore += s.totalScore || 0;
  });

  const diffStats = {};
  for (const [diff, stats] of Object.entries(difficultyBreakdown)) {
    diffStats[diff] = {
      attempts: stats.count,
      average: Math.round((stats.totalScore / stats.count) * 100) / 100,
    };
  }

  const allScores = sessions.map((s) => s.totalScore || 0);
  const avgScore = Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100;

  return {
    totalSessions: sessions.length,
    averageScore: avgScore,
    performanceTrend,
    rolePerformance,
    weakAreas,
    strongAreas,
    difficultyBreakdown: diffStats,
  };
}

async function getPlatformStatistics() {
  const totalSessions = await Session.countDocuments({});
  const avgScore = (await Session.aggregate([{ $group: { _id: null, avg: { $avg: "$totalScore" } } }]))[0]?.avg || 0;

  const roleDistribution = await Session.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const difficultyDistribution = await Session.aggregate([
    { $group: { _id: "$difficulty", count: { $sum: 1 } } },
  ]);

  const byDay = await Session.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: 30 },
  ]);

  return {
    totalSessions,
    averageScore: Math.round(avgScore * 100) / 100,
    roleDistribution: roleDistribution.map((r) => ({ role: r._id, count: r.count })),
    difficultyDistribution: difficultyDistribution.map((d) => ({ difficulty: d._id, count: d.count })),
    last30DaysTrend: byDay.reverse(),
  };
}

module.exports = {
  getUserAnalytics,
  getPlatformStatistics,
};
