const { asyncHandler } = require("../../utils/asyncHandler");
const doubtService = require("./doubt.service");

const createSession = asyncHandler(async (req, res) => {
  const { topic, details } = req.body || {};

  const session = await doubtService.createSession({
    userId: req.user.userId,
    topic,
    details,
  });

  res.status(201).json({ success: true, session });
});

const getSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await doubtService.getSessionById({
    userId: req.user.userId,
    sessionId: id,
  });

  res.status(200).json({ success: true, session });
});

const listSessions = asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;

  const sessions = await doubtService.listSessions({
    userId: req.user.userId,
    limit,
    offset,
  });

  res.status(200).json({ success: true, sessions });
});

const askQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { question } = req.body || {};

  const { session, reply } = await doubtService.askQuestion({
    userId: req.user.userId,
    sessionId: id,
    question,
  });

  res.status(200).json({ success: true, session, reply });
});

const archiveSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await doubtService.archiveSession({
    userId: req.user.userId,
    sessionId: id,
  });

  res.status(200).json({ success: true, session });
});

const pinMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { messageIndex } = req.body || {};

  const session = await doubtService.pinMessage({
    userId: req.user.userId,
    sessionId: id,
    messageIndex,
  });

  res.status(200).json({ success: true, session });
});

module.exports = {
  createSession,
  getSession,
  listSessions,
  askQuestion,
  archiveSession,
  pinMessage,
};
