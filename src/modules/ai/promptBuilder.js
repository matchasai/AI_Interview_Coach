function buildQuestionGenerationPrompt({ role, difficulty, questionCount }) {
  return [
    "You are an expert interviewer.",
    "Generate interview questions tailored to the user's role and difficulty.",
    "Return ONLY valid JSON.",
    "No markdown, no backticks, no extra commentary.",
    "Output must be a JSON array of objects.",
    "Each object must have exactly one key: questionText (string).",
    `Array length must be exactly ${questionCount}.`,
    "Keep each question concise (1-2 sentences).",
    "Do not include numbering or prefixes like 'Q1'.",
    "Avoid duplicate questions.",
    "",
    `role: ${role}`,
    `difficulty: ${difficulty}`,
  ].join("\n");
}

function buildEvaluationPrompt({ role, difficulty, questionText, answerText }) {
  return [
    "You are an expert interviewer evaluating a candidate answer.",
    "Return ONLY valid JSON.",
    "No markdown, no backticks, no extra commentary.",
    "Output must be a single JSON object with exactly these keys:",
    "- score: number from 0 to 10 (can be decimal but we will round)",
    "- missingKeywords: array of strings (0 to 8 items)",
    "- feedback: a short paragraph of feedback",
    "- improvementTip: one sentence tip",
    "- correctAnswer: object with keys short, long, bulletPoints (array of strings)",
    "- rubric: object with keys conceptAccuracy, depth, exampleQuality, tradeoffAwareness, communication (0-10)",
    "- evidence: array of objects with keys quote, strength, gap, action",
    "",
    `role: ${role}`,
    `difficulty: ${difficulty}`,
    "questionText:",
    questionText,
    "",
    "answerText:",
    answerText,
  ].join("\n");
}

module.exports = {
  buildQuestionGenerationPrompt,
  buildEvaluationPrompt,
};
