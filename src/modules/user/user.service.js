const bcrypt = require("bcryptjs");

const { AppError } = require("../../utils/AppError");
const { User } = require("../auth/user.model");
const { Session } = require("../session/session.model");
const { toSafeUser } = require("../auth/auth.service");
const { enqueueEmail } = require("../auth/email.queue");

const ROLE_GUIDE_LIBRARY = {
  "SDE": {
    focusAreas: ["Big-O analysis", "hash maps and arrays", "system design basics"],
    drills: ["Explain binary search in 60 seconds", "Write a two-sum solution", "Design a URL shortener"],
    resources: ["NeetCode patterns", "Grokking the Coding Interview"],
  },
  "Frontend Developer": {
    focusAreas: ["React rendering", "state management", "CSS layout and accessibility"],
    drills: ["Explain useEffect with an example", "Optimize a slow component", "Build an accessible form"],
    resources: ["React docs", "MDN Accessibility"],
  },
  "Backend Developer": {
    focusAreas: ["API design", "database indexing", "scalability and caching"],
    drills: ["Design a REST endpoint", "Explain indexing tradeoffs", "Handle rate limiting"],
    resources: ["REST API best practices", "System Design Primer"],
  },
  "Machine Learning Engineer": {
    focusAreas: ["model evaluation", "overfitting", "feature engineering"],
    drills: ["Explain cross-validation", "Compare precision and recall", "Handle imbalanced data"],
    resources: ["Google ML Crash Course", "Hands-On ML"],
  },
  "Data Scientist": {
    focusAreas: ["experiment design", "statistics", "communication of insights"],
    drills: ["Explain p-values", "Design an A/B test", "Summarize findings for stakeholders"],
    resources: ["Khan Academy Statistics", "Practical Statistics for Data Scientists"],
  },
  "Data Analyst": {
    focusAreas: ["SQL joins", "data cleaning", "metrics interpretation"],
    drills: ["Write a join query", "Identify missing data patterns", "Explain a KPI change"],
    resources: ["Mode SQL Tutorial", "SQLBolt"],
  },
  "DevOps Engineer": {
    focusAreas: ["CI/CD", "containers", "observability"],
    drills: ["Explain Docker vs container", "Describe zero-downtime deploys", "Troubleshoot a failing pipeline"],
    resources: ["Docker docs", "Kubernetes docs"],
  },
  "Product Manager": {
    focusAreas: ["prioritization", "metrics", "stakeholder communication"],
    drills: ["Prioritize a roadmap", "Pick launch metrics", "Handle conflicting feedback"],
    resources: ["PM interview handbook", "Product Coalition"],
  },
  "Full Stack Developer": {
    focusAreas: ["auth flows", "CORS", "pagination and UX"],
    drills: ["Explain auth vs authorization", "Design a paginated list", "Fix a CORS issue"],
    resources: ["OWASP Top 10", "React + Node architecture guides"],
  },
  "System Design": {
    focusAreas: ["scalability", "data partitioning", "tradeoff reasoning"],
    drills: ["Design a notification system", "Estimate capacity", "Explain caching layers"],
    resources: ["System Design Primer", "Grokking the System Design Interview"],
  },
  "Database Engineering": {
    focusAreas: ["schema design", "replication", "query tuning"],
    drills: ["Compare indexing strategies", "Design a sharding plan", "Optimize a slow query"],
    resources: ["MongoDB University", "High Performance MySQL"],
  },
  "Cloud Architecture": {
    focusAreas: ["high availability", "cost optimization", "security"],
    drills: ["Design for failover", "Estimate cloud cost", "Discuss shared responsibility"],
    resources: ["AWS Well-Architected Framework", "Azure architecture center"],
  },
  "Cyber Security": {
    focusAreas: ["authentication", "threat modeling", "secure coding"],
    drills: ["Explain SQL injection prevention", "Outline a threat model", "Discuss zero trust"],
    resources: ["OWASP Top 10", "NIST Cybersecurity Framework"],
  },
  "Mobile Development": {
    focusAreas: ["app lifecycle", "performance", "offline-first UX"],
    drills: ["Compare native and cross-platform", "Explain push notifications", "Handle offline sync"],
    resources: ["Flutter docs", "React Native docs"],
  },
};

function buildGuide(role, avgScore) {
  const template = ROLE_GUIDE_LIBRARY[role] || {
    focusAreas: ["problem decomposition", "examples", "edge cases"],
    drills: ["Explain your approach", "Walk through an example", "Identify tradeoffs"],
    resources: ["Interviewing.io", "LeetCode discuss"],
  };

  const score = Number(avgScore) || 0;
  const priority = score < 50 ? 'High' : score < 70 ? 'Medium' : 'Maintenance';

  return {
    role,
    averageScore: Math.round(score),
    priority,
    focusAreas: template.focusAreas,
    drills: template.drills,
    resources: template.resources,
    nextTargetScore: Math.min(100, Math.round(score + (score < 50 ? 15 : 10))),
  };
}

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  return toSafeUser(user);
}

async function updateProfile(
  userId,
  { name, password, themePreference, practiceReminderEnabled, practiceReminderChannel }
) {
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

  if (typeof themePreference === "string") {
    const nextTheme = themePreference;
    if (!["light", "dark", "system"].includes(nextTheme)) {
      throw new AppError("Invalid themePreference", 400, "VALIDATION_ERROR");
    }
    user.themePreference = nextTheme;
  }

  if (typeof practiceReminderEnabled === "boolean") {
    user.practiceReminderEnabled = practiceReminderEnabled;
  }

  if (typeof practiceReminderChannel === "string") {
    const nextChannel = practiceReminderChannel;
    if (!["email", "notification"].includes(nextChannel)) {
      throw new AppError("Invalid practiceReminderChannel", 400, "VALIDATION_ERROR");
    }
    user.practiceReminderChannel = nextChannel;
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

async function getStudyGuides(userId) {
  const stats = await getStats(userId);
  const guides = (stats.perRole || [])
    .slice()
    .sort((a, b) => (a.avgScore || 0) - (b.avgScore || 0))
    .slice(0, 4)
    .map((roleRow) => buildGuide(roleRow.role, roleRow.avgScore));

  return {
    totalSessions: stats.totalSessions,
    averageScore: stats.avgScore,
    weakestRoles: guides,
    summary: guides.length
      ? `Focus on ${guides[0].role} first to raise your average score.`
      : 'Complete more sessions to get personalized study guides.',
  };
}

async function sendPracticeReminder(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  const studyGuides = await getStudyGuides(userId);
  const topFocusAreas = (studyGuides.weakestRoles || []).slice(0, 3).map((guide) => ({
    role: guide.role,
    focus: guide.focusAreas.slice(0, 2).join(', '),
  }));

  const reminderResult = await enqueueEmail('practice-reminder', {
    to: user.email,
    name: user.name,
    guideSummary: studyGuides.summary,
    topFocusAreas,
    dashboardLink: '/dashboard',
  });

  return {
    message: 'Practice reminder sent',
    studyGuides,
    reminderResult,
  };
}

module.exports = {
  getProfile,
  updateProfile,
  getStats,
  getStudyGuides,
  sendPracticeReminder,
};
