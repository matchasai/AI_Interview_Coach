const { GoogleGenerativeAI } = require("@google/generative-ai");
const { env } = require("../../config/env");
const { AppError } = require("../../utils/AppError");
const { buildEvaluationPrompt, buildQuestionGenerationPrompt } = require("./promptBuilder");
const {
  parseEvaluation,
  parseEvaluationFromText,
  parseQuestions,
  parseQuestionsFromText,
} = require("./responseParser");

const ROLE_BANK = {
  SDE: [
    "Explain time complexity of binary search.",
    "What is the difference between a process and a thread?",
    "Design a URL shortener at a high level.",
    "What is a REST API? Explain idempotency.",
    "Explain how you would optimize a slow database query.",
  ],
  "Frontend Developer": [
    "Explain the Virtual DOM and why React uses it.",
    "What are React hooks and why are they useful?",
    "Explain CSS Flexbox vs Grid.",
    "How do you optimize React component performance?",
    "Explain event delegation in JavaScript.",
  ],
  "Backend Developer": [
    "Explain the N+1 query problem and how to prevent it.",
    "How do you design a scalable API?",
    "Explain database indexing and when to use it.",
    "What is eventual consistency?",
    "How do you handle rate limiting in an API?",
  ],
  "Machine Learning Engineer": [
    "Explain overfitting and how to prevent it.",
    "What is the difference between supervised and unsupervised learning?",
    "Explain cross-validation and why it matters.",
    "How do you handle imbalanced datasets?",
    "Explain gradient descent and backpropagation.",
  ],
  "Data Scientist": [
    "What is feature engineering and give an example.",
    "Explain the difference between correlation and causation.",
    "How do you detect outliers in a dataset?",
    "Explain A/B testing and its limitations.",
    "What metrics would you use to evaluate a classification model?",
  ],
  "Data Analyst": [
    "What is the difference between INNER JOIN and LEFT JOIN?",
    "How do you handle missing values in a dataset?",
    "Explain p-value in hypothesis testing.",
    "What is sampling bias?",
    "Explain precision vs recall.",
  ],
  "DevOps Engineer": [
    "What problem does CI/CD solve?",
    "Explain Docker image vs container.",
    "How do you do zero-downtime deployments?",
    "What are Kubernetes deployments and services?",
    "Explain infrastructure as code.",
  ],
  "Product Manager": [
    "How do you prioritize features?",
    "What metrics would you track for a new feature launch?",
    "Explain how you would handle stakeholder conflicts.",
    "How do you validate product-market fit?",
    "Tell me about a product decision you changed based on data.",
  ],
  "Full Stack Developer": [
    "Explain CORS and why it matters.",
    "How does authentication differ from authorization?",
    "Explain how you would paginate a large list.",
    "How do you handle state management in React?",
    "Explain indexing in MongoDB.",
  ],
  "System Design": [
    "Design a URL shortener (TinyURL).",
    "Design a real-time notification system.",
    "Design a cache layer for a web application.",
    "Design a distributed message queue system.",
    "Design a load balancer for handling millions of requests.",
  ],
  "Database Engineering": [
    "Explain ACID properties in databases.",
    "How do you design database schemas for scalability?",
    "Explain sharding and partitioning strategies.",
    "What is database replication and when to use it?",
    "Explain query optimization techniques.",
  ],
  "Cloud Architecture": [
    "Explain the difference between IaaS, PaaS, and SaaS.",
    "How do you design for high availability on the cloud?",
    "Explain auto-scaling and load balancing.",
    "What is a microservices architecture and its benefits?",
    "Explain disaster recovery and backup strategies.",
  ],
  "Cyber Security": [
    "Explain the difference between authentication and authorization.",
    "What is encryption and why is it important?",
    "Explain SQL injection and how to prevent it.",
    "What is a DDoS attack and mitigation strategies?",
    "Explain zero-trust security model.",
  ],
  "Mobile Development": [
    "Explain the difference between native and cross-platform development.",
    "How do you optimize mobile app performance?",
    "Explain push notifications and their implementation.",
    "How do you handle offline functionality in mobile apps?",
    "Explain app lifecycle management on iOS and Android.",
  ],
};

function pickBank(role) {
  return ROLE_BANK[role] || ROLE_BANK.SDE;
}

function hasGeminiKey() {
  return typeof env.GEMINI_API_KEY === "string" && env.GEMINI_API_KEY.trim().length > 0;
}

let geminiClient = null;
function getGeminiModel() {
  if (!hasGeminiKey()) return null;
  if (!geminiClient) geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);

  const temperature = Number.isFinite(env.GEMINI_TEMPERATURE) ? env.GEMINI_TEMPERATURE : 0.7;
  return geminiClient.getGenerativeModel({
    model: env.GEMINI_MODEL || "gemini-1.5-flash",
    generationConfig: {
      temperature,
      // Hint to return JSON; parser still guards if model returns extra text.
      responseMimeType: "application/json",
    },
  });
}

async function geminiGenerateText(prompt) {
  const model = getGeminiModel();
  if (!model) return null;

  const result = await model.generateContent(prompt);
  const response = result?.response;
  if (!response) return null;
  if (typeof response.text === "function") return response.text();
  return String(response);
}

/**
 * Returns dummy questions.
 * Output shape mirrors the future LLM JSON contract.
 */
async function generateQuestions({ role, difficulty, questionCount }) {
  // Try Gemini first.
  if (hasGeminiKey()) {
    const prompt = buildQuestionGenerationPrompt({ role, difficulty, questionCount });
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const text = await geminiGenerateText(prompt);
        if (!text) throw new Error("Empty Gemini response");
        const questions = parseQuestionsFromText(text, { expectedCount: questionCount });
        if (questions.length === questionCount) return questions;
        lastErr = new Error("Gemini returned invalid question JSON");
      } catch (e) {
        lastErr = e;
      }
    }

    throw new AppError(
      `AI question generation failed${lastErr?.message ? `: ${lastErr.message}` : ""}`,
      502,
      "AI_PROVIDER_ERROR"
    );
  }

  // Fallback to local question bank.
  const bank = pickBank(role);
  const diffPrefix =
    difficulty === "hard" ? "(Hard) " : difficulty === "medium" ? "(Medium) " : "(Easy) ";

  const questions = [];
  for (let i = 0; i < questionCount; i += 1) {
    questions.push({ questionText: `${diffPrefix}${bank[i % bank.length]}` });
  }

  return parseQuestions(questions);
}

/**
 * Returns mock evaluation.
 * Score uses simple heuristics on answer length and keyword hints.
 */
async function evaluateAnswer({ role, difficulty, questionText, answerText }) {
  // Try Gemini first.
  if (hasGeminiKey()) {
    const prompt = buildEvaluationPrompt({ role, difficulty, questionText, answerText });
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const text = await geminiGenerateText(prompt);
        if (!text) throw new Error("Empty Gemini response");
        const evaln = parseEvaluationFromText(text);
        if (evaln) return evaln;
        lastErr = new Error("Gemini returned invalid evaluation JSON");
      } catch (e) {
        lastErr = e;
      }
    }

    throw new AppError(
      `AI evaluation failed${lastErr?.message ? `: ${lastErr.message}` : ""}`,
      502,
      "AI_PROVIDER_ERROR"
    );
  }

  // Fallback mock evaluation.
  const text = typeof answerText === "string" ? answerText : "";
  const normalized = text.toLowerCase();

  const expected = ["tradeoff", "example", "complexity", "edge case"].filter(Boolean);
  const missingKeywords = expected.filter((k) => !normalized.includes(k));

  let score = 5;
  if (text.length > 200) score += 2;
  if (text.length > 500) score += 1;
  if (missingKeywords.length === 0) score += 2;

  if (difficulty === "hard") score -= 1;
  if (difficulty === "easy") score += 1;

  score = Math.max(0, Math.min(10, score));

  const payload = {
    score,
    missingKeywords,
    feedback:
      score >= 8
        ? "Strong answer with clear structure. Add one real-world example to make it more convincing."
        : "Decent start, but your answer is missing important specifics. Add structure: define, explain, then give an example.",
    improvementTip: "Use the pattern: definition → approach → example → edge cases.",
  };

  return parseEvaluation(payload);
}

module.exports = {
  generateQuestions,
  evaluateAnswer,
};
