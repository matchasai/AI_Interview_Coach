const { asyncHandler } = require("../../utils/asyncHandler");
const aiService = require("./aiService");
const doubtService = require("../doubt/doubt.service");
const { AppError } = require("../../utils/AppError");

const explainTopic = asyncHandler(async (req, res) => {
  const { topic } = req.body || {};

  const doubtSession = await doubtService.createSession({
    userId: req.user.userId,
    topic,
    details: "",
  });

  // For now, return basic structure. In production, you'd generate detailed explanation
  res.status(201).json({
    success: true,
    doubtSessionId: doubtSession._id,
    details: {
      definition: `${topic} is a fundamental concept...`,
      whyUsed: `Understanding ${topic} is important because...`,
      example: `A practical example of ${topic}...`,
      applications: ["Application 1", "Application 2", "Application 3"],
      programmingUsage: `In programming, ${topic} is used...`,
    },
    linkedMissingKeywords: [],
    miniQuiz: [],
  });
});

const doubtFollowup = asyncHandler(async (req, res) => {
  const { sessionId, question, topic } = req.body || {};

  if (!sessionId) {
    throw new AppError("Session ID is required", 400, "VALIDATION_ERROR");
  }

  const session = await doubtService.askQuestion({
    userId: req.user.userId,
    sessionId,
    question,
  });

  res.status(200).json({
    success: true,
    reply: {
      answer: `Regarding "${question}", here's the explanation...`,
      keyPoints: ["Key point 1", "Key point 2", "Key point 3"],
      commonMistakes: ["Mistake 1", "Mistake 2"],
      followUpQuestions: [],
    },
    session,
  });
});

const getDoubtSessions = asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;

  const sessions = await doubtService.listSessions({
    userId: req.user.userId,
    limit,
    offset,
  });

  res.status(200).json({
    success: true,
    sessions: sessions.map((s) => ({
      ...s,
      messageCount: s.messages?.length || 0,
    })),
  });
});

const getDoubtSessionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await doubtService.getSessionById({
    userId: req.user.userId,
    sessionId: id,
  });

  res.status(200).json({
    success: true,
    session: {
      ...session,
      messageCount: session.messages?.length || 0,
    },
  });
});

const renameDoubtSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { topic } = req.body || {};

  if (!topic || topic.trim().length < 2) {
    throw new AppError("Topic is required (min 2 characters)", 400, "VALIDATION_ERROR");
  }

  const session = await doubtService.getSessionById({
    userId: req.user.userId,
    sessionId: id,
  });

  session.topic = topic.trim();
  await session.save();

  res.status(200).json({ success: true, session });
});

const deleteDoubtSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await doubtService.archiveSession({
    userId: req.user.userId,
    sessionId: id,
  });

  res.status(200).json({ success: true });
});

const pinMessageInDoubtSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { messageIndex, pinned } = req.body || {};

  const session = await doubtService.pinMessage({
    userId: req.user.userId,
    sessionId: id,
    messageIndex,
  });

  const pinnedMessage = session.messages[messageIndex];

  res.status(200).json({
    success: true,
    session,
    pinned: pinnedMessage.pinned,
  });
});

module.exports = {
  explainTopic,
  doubtFollowup,
  getDoubtSessions,
  getDoubtSessionById,
  renameDoubtSession,
  deleteDoubtSession,
  pinMessageInDoubtSession,
};
