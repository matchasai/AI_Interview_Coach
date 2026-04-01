const { asyncHandler } = require("../../utils/asyncHandler");
const { AppError } = require("../../utils/AppError");
const sessionService = require("./session.service");

const startSession = asyncHandler(async (req, res) => {
  const { role, difficulty, questionCount } = req.body || {};

  if (!role || !difficulty || !questionCount) {
    throw new AppError("role, difficulty, questionCount are required", 400, "VALIDATION_ERROR");
  }

  const session = await sessionService.startSession({
    userId: req.user.userId,
    role,
    difficulty,
    questionCount,
  });

  res.status(201).json({ success: true, session });
});

const submitAnswer = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  const { questionId, answerText } = req.body || {};

  if (!questionId || typeof questionId !== "string") {
    throw new AppError("questionId is required", 400, "VALIDATION_ERROR");
  }

  const result = await sessionService.submitAnswer({
    userId: req.user.userId,
    sessionId,
    questionId,
    answerText,
  });

  res.status(200).json({
    success: true,
    evaluation: result.evaluation,
    question: result.question,
  });
});

const completeSession = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  const session = await sessionService.completeSession({ userId: req.user.userId, sessionId });
  res.status(200).json({ success: true, session });
});

const getSessionById = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  const session = await sessionService.getSessionById({
    userId: req.user.userId,
    sessionId,
    isAdmin: req.user.role === "admin",
  });
  res.status(200).json({ success: true, session });
});

const getHistory = asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const sessions = await sessionService.getHistory({ userId: req.user.userId, limit, offset });
  res.status(200).json({ success: true, sessions });
});

const deleteOwnSession = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  const session = await sessionService.deleteOwnSession({
    userId: req.user.userId,
    sessionId,
  });
  res.status(200).json({ success: true, session });
});

const adminSoftDelete = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  const session = await sessionService.softDeleteSession({ sessionId });
  res.status(200).json({ success: true, session });
});

const pauseSession = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  const session = await sessionService.pauseSession({
    userId: req.user.userId,
    sessionId,
  });
  res.status(200).json({ success: true, session });
});

const getDifficultyRecommendation = asyncHandler(async (req, res) => {
  const role = typeof req.query.role === "string" ? req.query.role : undefined;

  const recommendation = await sessionService.getDifficultyRecommendation({
    userId: req.user.userId,
    role,
  });

  res.status(200).json({ success: true, recommendation });
});

const submitRecommendationFeedback = asyncHandler(async (req, res) => {
  const { event, recommendedDifficulty, selectedDifficulty, role } = req.body || {};

  if (!event || typeof event !== "string") {
    throw new AppError("event is required", 400, "VALIDATION_ERROR");
  }

  const feedback = await sessionService.submitRecommendationFeedback({
    userId: req.user.userId,
    event,
    recommendedDifficulty,
    selectedDifficulty,
    role,
  });

  res.status(200).json({ success: true, feedback });
});

module.exports = {
  startSession,
  submitAnswer,
  completeSession,
  getSessionById,
  getHistory,
  deleteOwnSession,
  adminSoftDelete,
  pauseSession,
  getDifficultyRecommendation,
  submitRecommendationFeedback,
};
