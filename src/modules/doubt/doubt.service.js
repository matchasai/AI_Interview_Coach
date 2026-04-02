const { AppError } = require("../../utils/AppError");
const DoubtSession = require("./doubt.model");
const aiService = require("../ai/aiService");

async function createSession({ userId, topic, details }) {
  if (!topic || topic.trim().length < 2) {
    throw new AppError("Topic is required (min 2 characters)", 400, "VALIDATION_ERROR");
  }

  const session = await DoubtSession.create({
    userId,
    topic: topic.trim(),
    details: details?.trim() || "",
    messages: [],
  });

  return session;
}

async function getSessionById({ userId, sessionId }) {
  const session = await DoubtSession.findOne({
    _id: sessionId,
    userId,
  });

  if (!session) {
    throw new AppError("Doubt session not found", 404, "NOT_FOUND");
  }

  return session;
}

async function listSessions({ userId, limit = 20, offset = 0 }) {
  const l = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const o = Math.max(Number(offset) || 0, 0);

  const sessions = await DoubtSession.find({
    userId,
    status: "active",
  })
    .sort({ createdAt: -1 })
    .skip(o)
    .limit(l)
    .select("_id topic details createdAt updatedAt");

  return sessions;
}

async function askQuestion({ userId, sessionId, question }) {
  if (!question || question.trim().length < 2) {
    throw new AppError("Question is required (min 2 characters)", 400, "VALIDATION_ERROR");
  }

  const session = await getSessionById({ userId, sessionId });

  // Add user message
  session.messages.push({
    role: "user",
    text: question.trim(),
  });

  // Get AI response
  const prompt = `You are an expert tutor helping a student understand: "${session.topic}"

Student context: ${session.details || "No additional context provided"}

Student question: ${question.trim()}

Provide a clear, concise explanation with:
1. Direct answer to the question
2. Key points (as array)
3. Common mistakes to avoid (as array)

Respond in JSON format:
{
  "answer": "your explanation here",
  "keyPoints": ["point1", "point2", "point3"],
  "commonMistakes": ["mistake1", "mistake2"]
}`;

  let aiResponse = null;

  try {
    // Try live AI first
    const result = await aiService.evaluateAnswer({
      role: session.topic,
      difficulty: "medium",
      questionText: `Explain: ${session.topic}`,
      answerText: question,
    });

    // Format for doubt session
    aiResponse = {
      answer: result.feedback || "I understand your question. Let me break this down...",
      keyPoints: result.missingKeywords?.slice(0, 3) || ["Key concept", "Implementation", "Use case"],
      commonMistakes: ["Overlooking edge cases", "Missing context", "Incomplete explanation"],
    };
  } catch (err) {
    // Fallback response
    aiResponse = {
      answer: `That's a great question about ${session.topic}. This is an important concept. Here's what you should know...`,
      keyPoints: ["Definition", "How it works", "Real-world application"],
      commonMistakes: ["Confusing with similar concepts", "Missing key details", "Not providing examples"],
    };
  }

  // Add assistant message
  session.messages.push({
    role: "assistant",
    text: aiResponse.answer,
    keyPoints: aiResponse.keyPoints,
    commonMistakes: aiResponse.commonMistakes,
  });

  await session.save();
  return session;
}

async function archiveSession({ userId, sessionId }) {
  const session = await getSessionById({ userId, sessionId });
  session.status = "archived";
  await session.save();
  return session;
}

async function pinMessage({ userId, sessionId, messageIndex }) {
  const session = await getSessionById({ userId, sessionId });

  if (messageIndex < 0 || messageIndex >= session.messages.length) {
    throw new AppError("Invalid message index", 400, "VALIDATION_ERROR");
  }

  session.messages[messageIndex].pinned = !session.messages[messageIndex].pinned;
  await session.save();

  return session;
}

module.exports = {
  createSession,
  getSessionById,
  listSessions,
  askQuestion,
  archiveSession,
  pinMessage,
};
