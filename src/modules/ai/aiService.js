const Groq = require("groq-sdk");
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
  if (ROLE_BANK[role]) return ROLE_BANK[role];

  const normalizedRole = String(role || "").trim();
  if (!normalizedRole) return ROLE_BANK.SDE;

  // For custom roles, generate a domain-aware fallback question set
  // so users do not get unrelated default SDE questions.
  return [
    `Explain the core responsibilities of a ${normalizedRole} and how success is measured.`,
    `Describe a common workflow you would follow as a ${normalizedRole} for a real-world task.`,
    `What tools, standards, or frameworks are most important for a ${normalizedRole}, and why?`,
    `Walk through a challenging scenario in ${normalizedRole} and how you would solve it step by step.`,
    `What are the key tradeoffs and risks a ${normalizedRole} should consider in day-to-day decisions?`,
  ];
}

function inferExpectedKeywords(role, questionText) {
  const text = `${role || ""} ${questionText || ""}`.toLowerCase();

  if (text.includes("process") && text.includes("thread")) {
    return ["memory", "isolation", "context switch", "communication", "example"];
  }
  if (text.includes("rest") || text.includes("api")) {
    return ["http", "stateless", "endpoint", "idempotent", "example"];
  }
  if (text.includes("binary search") || text.includes("time complexity")) {
    return ["sorted", "log", "divide", "compare", "example"];
  }

  return ["definition", "approach", "tradeoff", "example", "edge case"];
}

function buildCorrectAnswer({ role, questionText }) {
  const expected = inferExpectedKeywords(role, questionText);
  const [k1, k2, k3, k4] = expected;

  return {
    short: [
      "Start with a clear definition and explain the core mechanism in simple terms.",
      `Include ${k1 || "the key concept"}, ${k2 || "implementation detail"}, and one practical example.`,
    ].join(" "),
    long: [
      "A strong answer should first define the concept and why it matters in interviews and real projects.",
      `Then explain how it works with focus on ${k1 || "core flow"} and ${k2 || "important details"}.`,
      `Discuss tradeoffs around ${k3 || "performance"} and ${k4 || "maintainability"}.`,
      "Close with one project example and mention edge cases or limitations.",
    ].join(" "),
    bulletPoints: [
      "Definition in one sentence",
      "How it works step-by-step",
      "One real-world/project example",
      "Tradeoff and edge case",
    ],
  };
}

function splitEvidenceSnippets(answerText) {
  return String(answerText || "")
    .split(/[\.\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function buildRubricAndEvidence({ role, questionText, answerText, missingKeywords }) {
  const text = String(answerText || "").trim();
  const hasExample = /example|for instance|for example|in my project/i.test(text);
  const hasTradeoff = /tradeoff|pros|cons|however|but|limitation/i.test(text);
  const expected = inferExpectedKeywords(role, questionText);
  const normalized = text.toLowerCase();
  const coveredCount = expected.filter((k) => normalized.includes(k.toLowerCase())).length;

  const rubric = {
    conceptAccuracy: Math.min(10, Math.max(1, 4 + coveredCount)),
    depth: Math.min(10, Math.max(1, text.length > 220 ? 8 : text.length > 120 ? 6 : 4)),
    exampleQuality: hasExample ? 7 : 3,
    tradeoffAwareness: hasTradeoff ? 7 : 3,
    communication: text.length > 120 ? 7 : 5,
  };

  const evidence = splitEvidenceSnippets(text).map((quote) => ({
    quote,
    strength: "Relevant point from your answer.",
    gap: missingKeywords.length ? `Could include: ${missingKeywords.slice(0, 2).join(", ")}` : "Could be more concise.",
    action: "Add one concrete project impact or metric.",
  }));

  return { rubric, evidence };
}

function hasGroqKey() {
  return typeof env.GROQ_API_KEY === "string" && env.GROQ_API_KEY.trim().length > 0;
}

let groqClient = null;
function getGroqClient() {
  if (!hasGroqKey()) return null;
  if (!groqClient) groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
  return groqClient;
}

async function groqGenerateText(prompt) {
  const client = getGroqClient();
  if (!client) return null;

  const temperature = Number.isFinite(env.GROQ_TEMPERATURE) ? env.GROQ_TEMPERATURE : 0.7;
  const result = await client.chat.completions.create({
    model: env.GROQ_MODEL || "llama-3.1-70b-versatile",
    temperature,
    messages: [
      {
        role: "system",
        content: "You are a strict interview assistant. Return only valid JSON and no extra text.",
      },
      { role: "user", content: prompt },
    ],
  });

  return result?.choices?.[0]?.message?.content || null;
}

/**
 * Returns dummy questions.
 * Output shape mirrors the future LLM JSON contract.
 */
async function generateQuestions({ role, difficulty, questionCount }) {
  // Try Groq first.
  if (hasGroqKey()) {
    const prompt = buildQuestionGenerationPrompt({ role, difficulty, questionCount });
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const text = await groqGenerateText(prompt);
        if (!text) throw new Error("Empty Groq response");
        const questions = parseQuestionsFromText(text, { expectedCount: questionCount });
        if (questions.length === questionCount) return questions;
        lastErr = new Error("Groq returned invalid question JSON");
      } catch (e) {
        lastErr = e;
      }
    }

    if (env.AI_STRICT_MODE) {
      throw new AppError(
        `AI question generation failed${lastErr?.message ? `: ${lastErr.message}` : ""}`,
        502,
        "AI_PROVIDER_ERROR"
      );
    }
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
  // Try Groq first.
  if (hasGroqKey()) {
    const prompt = buildEvaluationPrompt({ role, difficulty, questionText, answerText });
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const text = await groqGenerateText(prompt);
        if (!text) throw new Error("Empty Groq response");
        const evaln = parseEvaluationFromText(text);
        if (evaln) return evaln;
        lastErr = new Error("Groq returned invalid evaluation JSON");
      } catch (e) {
        lastErr = e;
      }
    }

    if (env.AI_STRICT_MODE) {
      throw new AppError(
        `AI evaluation failed${lastErr?.message ? `: ${lastErr.message}` : ""}`,
        502,
        "AI_PROVIDER_ERROR"
      );
    }
  }

  // Fallback mock evaluation.
  const text = typeof answerText === "string" ? answerText : "";
  const normalized = text.toLowerCase();

  const expected = inferExpectedKeywords(role, questionText);
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
    correctAnswer: buildCorrectAnswer({ role, questionText }),
    ...buildRubricAndEvidence({
      role,
      questionText,
      answerText,
      missingKeywords,
    }),
  };

  return parseEvaluation(payload);
}

module.exports = {
  generateQuestions,
  evaluateAnswer,
};
