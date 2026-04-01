const { AppError } = require("../../utils/AppError");
const { Session } = require("./session.model");
const { User } = require("../auth/user.model");
const aiService = require("../ai/aiService");
const { randomUUID } = require("crypto");

const ALLOWED_ROLES = [
  "SDE",
  "Frontend Developer",
  "Backend Developer",
  "Machine Learning Engineer",
  "Data Scientist",
  "Data Analyst",
  "DevOps Engineer",
  "Product Manager",
  "Full Stack Developer",
  "System Design",
  "Database Engineering",
  "Cloud Architecture",
  "Cyber Security",
  "Mobile Development",
];

const DIFFICULTY_LEVEL = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const LEVEL_TO_DIFFICULTY = {
  1: "easy",
  2: "medium",
  3: "hard",
};

const FEEDBACK_EVENTS = ["shown", "applied", "overridden", "ignored"];

function assertRole(role) {
  // Allow predefined roles or custom roles (any non-empty string with at least 2 characters)
  if (!ALLOWED_ROLES.includes(role) && (!role || role.trim().length < 2)) {
    throw new AppError(
      `Invalid role. Must be a predefined role or custom role with at least 2 characters.`,
      400,
      "VALIDATION_ERROR"
    );
  }
}

function assertQuestionCount(questionCount) {
  const n = Number(questionCount);
  if (![5, 10].includes(n)) {
    throw new AppError("questionCount must be 5 or 10", 400, "VALIDATION_ERROR");
  }
  return n;
}

async function startSession({ userId, role, difficulty, questionCount }) {
  assertRole(role);
  const n = assertQuestionCount(questionCount);

  if (!["easy", "medium", "hard"].includes(difficulty)) {
    throw new AppError("difficulty must be easy|medium|hard", 400, "VALIDATION_ERROR");
  }

  const questions = await aiService.generateQuestions({ role, difficulty, questionCount: n });

  const preparedQuestions = questions.map((q) => ({
    questionId: randomUUID(),
    questionText: q.questionText,
    userAnswer: null,
    score: null,
    feedback: null,
    missingKeywords: null,
    improvementTip: null,
    correctAnswer: null,
    rubric: null,
    evidence: null,
    answeredAt: null,
  }));

  const session = await Session.create({
    userId,
    role,
    difficulty,
    questions: preparedQuestions,
    maxScore: n * 10,
    totalScore: 0,
    status: "active",
  });

  return session;
}

async function submitAnswer({ userId, sessionId, questionId, answerText }) {
  const session = await Session.findById(sessionId);
  if (!session) throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");

  if (session.userId.toString() !== userId.toString()) {
    throw new AppError("Not allowed", 403, "FORBIDDEN");
  }

  if (session.status !== "active") {
    throw new AppError("Session is not active", 400, "INVALID_SESSION_STATE");
  }

  const question = session.questions.find((q) => q.questionId === questionId);
  if (!question) {
    throw new AppError("Question not found in session", 404, "QUESTION_NOT_FOUND");
  }

  if (typeof answerText !== "string" || answerText.trim().length === 0) {
    throw new AppError("answerText is required", 400, "VALIDATION_ERROR");
  }

  const evaluation = await aiService.evaluateAnswer({
    role: session.role,
    difficulty: session.difficulty,
    questionText: question.questionText,
    answerText,
  });

  question.userAnswer = answerText;
  question.score = evaluation.score;
  question.missingKeywords = evaluation.missingKeywords;
  question.feedback = evaluation.feedback;
  question.improvementTip = evaluation.improvementTip;
  question.correctAnswer = evaluation.correctAnswer || null;
  question.rubric = evaluation.rubric || null;
  question.evidence = Array.isArray(evaluation.evidence) ? evaluation.evidence : null;
  question.answeredAt = new Date();

  await session.save();

  return { session, evaluation, question };
}

function computeTotalScore(session) {
  const scores = session.questions
    .map((q) => (typeof q.score === "number" ? q.score : 0))
    .reduce((a, b) => a + b, 0);

  const max = session.maxScore || session.questions.length * 10;
  const pct = max > 0 ? (scores / max) * 100 : 0;

  return Math.round(pct);
}

function computeDurationSeconds(session) {
  const startMs = new Date(session.createdAt).getTime();
  const endMs = new Date(session.completedAt || Date.now()).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return 0;
  return Math.round((endMs - startMs) / 1000);
}

async function completeSession({ userId, sessionId }) {
  const session = await Session.findById(sessionId);
  if (!session) throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");

  if (session.userId.toString() !== userId.toString()) {
    throw new AppError("Not allowed", 403, "FORBIDDEN");
  }

  if (session.status !== "active") {
    throw new AppError("Session is not active", 400, "INVALID_SESSION_STATE");
  }

  session.totalScore = computeTotalScore(session);
  session.status = "completed";
  session.completedAt = new Date();
  session.durationSeconds = computeDurationSeconds(session);

  await session.save();

  // Update user denormalized stats
  const user = await User.findById(userId);
  if (user) {
    const prevCount = user.totalSessions || 0;
    const prevAvg = user.avgScore || 0;

    const nextCount = prevCount + 1;
    const nextAvg = Math.round((prevAvg * prevCount + session.totalScore) / nextCount);

    user.totalSessions = nextCount;
    user.avgScore = nextAvg;
    await user.save();
  }

  return session;
}

async function getSessionById({ userId, sessionId, isAdmin = false }) {
  const session = await Session.findById(sessionId);
  if (!session) throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");

  if (!isAdmin && session.status === "abandoned") {
    // Treat soft-deleted sessions as not found for regular users.
    throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
  }

  if (!isAdmin && session.userId.toString() !== userId.toString()) {
    throw new AppError("Not allowed", 403, "FORBIDDEN");
  }

  return session;
}

async function getHistory({ userId, limit = 20, offset = 0 }) {
  const l = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const o = Math.max(Number(offset) || 0, 0);

  const sessions = await Session.find({ userId, status: { $ne: "abandoned" } })
    .sort({ createdAt: -1 })
    .skip(o)
    .limit(l);

  return sessions;
}

async function deleteOwnSession({ userId, sessionId }) {
  const session = await Session.findById(sessionId);
  if (!session) throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");

  if (session.userId.toString() !== userId.toString()) {
    throw new AppError("Not allowed", 403, "FORBIDDEN");
  }

  if (!["active", "paused"].includes(session.status)) {
    throw new AppError(
      "Only active or paused sessions can be deleted",
      400,
      "INVALID_SESSION_STATE"
    );
  }

  session.status = "abandoned";
  if (!session.deletedAt) {
    session.deletedAt = new Date();
  }

  await session.save();
  return session;
}

async function softDeleteSession({ sessionId }) {
  const session = await Session.findById(sessionId);
  if (!session) throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");

  if (session.status !== "abandoned") {
    session.status = "abandoned";
  }

  if (!session.deletedAt) {
    session.deletedAt = new Date();
  }

  await session.save();
  return session;
}

async function pauseSession({ userId, sessionId }) {
  const session = await Session.findById(sessionId);
  if (!session) throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");

  if (session.userId.toString() !== userId.toString()) {
    throw new AppError("Not allowed", 403, "FORBIDDEN");
  }

  if (session.status === "paused") {
    session.status = "active";
  } else if (session.status === "active") {
    session.status = "paused";
  } else {
    throw new AppError("Can only pause/resume active or paused sessions", 400, "INVALID_SESSION_STATE");
  }

  await session.save();
  return session;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightedAverage(values, weights) {
  if (!values.length || !weights.length || values.length !== weights.length) return 0;
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return 0;
  const weightedSum = values.reduce((sum, value, idx) => sum + value * weights[idx], 0);
  return weightedSum / totalWeight;
}

function computeRecommendedDifficulty(sessions) {
  const sampleSize = sessions.length;
  const scores = sessions.map((s) => Number(s.totalScore) || 0);
  const levels = sessions.map((s) => DIFFICULTY_LEVEL[s.difficulty] || 2);
  const recencyWeights = sessions.map((_, idx) => Math.max(1, 5 - idx * 0.2));

  const avgScore = Math.round(average(scores));
  const recentWeightedScore = Math.round(weightedAverage(scores, recencyWeights));
  const avgLevel = average(levels);
  const weightedLevel = weightedAverage(levels, recencyWeights);
  const latestScore = scores[0] ?? avgScore;
  const priorScore = scores[1] ?? latestScore;
  const trendDelta = latestScore - priorScore;

  let level = Math.round(weightedLevel || avgLevel);
  const signals = [];

  if (recentWeightedScore >= 80) {
    level += 1;
    signals.push("strong_recent_scores");
  } else if (recentWeightedScore <= 45) {
    level -= 1;
    signals.push("low_recent_scores");
  }

  if (latestScore >= 85) {
    level += 1;
    signals.push("excellent_last_session");
  } else if (latestScore <= 35) {
    level -= 1;
    signals.push("weak_last_session");
  }

  if (trendDelta >= 12) {
    level += 1;
    signals.push("improving_trend");
  } else if (trendDelta <= -12) {
    level -= 1;
    signals.push("declining_trend");
  }

  level = clamp(level, 1, 3);

  const confidence = clamp(Math.round(40 + sampleSize * 8), 35, 95);

  return {
    difficulty: LEVEL_TO_DIFFICULTY[level],
    confidence,
    reason: `Based on ${sampleSize} completed session${sampleSize > 1 ? "s" : ""}; recent weighted score is ${recentWeightedScore}%`,
    signals,
    stats: {
      sampleSize,
      avgScore,
      recentWeightedScore,
      latestScore,
      trendDelta,
      avgDifficultyLevel: Number(avgLevel.toFixed(2)),
      weightedDifficultyLevel: Number(weightedLevel.toFixed(2)),
    },
  };
}

async function getDifficultyRecommendation({ userId, role }) {
  if (role) {
    assertRole(role);
  }

  const roleSessions = await Session.find({
    userId,
    status: "completed",
    ...(role ? { role } : {}),
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("difficulty totalScore createdAt");

  if (roleSessions.length >= 3) {
    return {
      ...computeRecommendedDifficulty(roleSessions),
      source: role ? "role" : "overall",
      role: role || null,
    };
  }

  const overallSessions = await Session.find({
    userId,
    status: "completed",
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("difficulty totalScore createdAt role");

  if (overallSessions.length >= 3) {
    const overallRecommendation = computeRecommendedDifficulty(overallSessions);

    return {
      ...overallRecommendation,
      source: "overall",
      role: role || null,
      reason: `${overallRecommendation.reason} (overall history)`,
    };
  }

  return {
    difficulty: "easy",
    confidence: 30,
    source: "default",
    role: role || null,
    reason: "Not enough completed sessions yet. Starting easy is recommended.",
    stats: {
      sampleSize: overallSessions.length,
      avgScore: 0,
      recentWeightedScore: 0,
      latestScore: 0,
      trendDelta: 0,
      avgDifficultyLevel: 1,
      weightedDifficultyLevel: 1,
    },
  };
}

async function submitRecommendationFeedback({ userId, event, recommendedDifficulty, selectedDifficulty, role }) {
  if (!FEEDBACK_EVENTS.includes(event)) {
    throw new AppError("Invalid recommendation feedback event", 400, "VALIDATION_ERROR");
  }

  if (recommendedDifficulty && !DIFFICULTY_LEVEL[recommendedDifficulty]) {
    throw new AppError("Invalid recommendedDifficulty", 400, "VALIDATION_ERROR");
  }

  if (selectedDifficulty && !DIFFICULTY_LEVEL[selectedDifficulty]) {
    throw new AppError("Invalid selectedDifficulty", 400, "VALIDATION_ERROR");
  }

  if (role) {
    assertRole(role);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  const currentStats = user.recommendationStats || {
    shown: 0,
    applied: 0,
    overridden: 0,
    ignored: 0,
    lastFeedbackAt: null,
  };

  currentStats[event] = (currentStats[event] || 0) + 1;
  currentStats.lastFeedbackAt = new Date();
  user.recommendationStats = currentStats;

  await user.save();

  return {
    event,
    recommendedDifficulty: recommendedDifficulty || null,
    selectedDifficulty: selectedDifficulty || null,
    role: role || null,
    stats: currentStats,
  };
}

module.exports = {
  startSession,
  submitAnswer,
  completeSession,
  getSessionById,
  getHistory,
  deleteOwnSession,
  softDeleteSession,
  pauseSession,
  computeTotalScore,
  computeDurationSeconds,
  getDifficultyRecommendation,
  submitRecommendationFeedback,
  ALLOWED_ROLES,
};
