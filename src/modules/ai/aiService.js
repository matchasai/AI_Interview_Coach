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

function pickRandom(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const copy = Array.isArray(items) ? [...items] : [];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeQuestionText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\(easy\)|\(medium\)|\(hard\)/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueQuestions(questions) {
  const seen = new Set();
  const result = [];

  for (const q of questions || []) {
    const text = String(q?.questionText || "").trim();
    if (!text) continue;
    const key = normalizeQuestionText(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({ questionText: text });
  }

  return result;
}

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

  const verbs = ["design", "optimize", "debug", "evaluate", "improve", "validate"];
  const artifacts = ["workflow", "process", "protocol", "checklist", "decision framework"];
  const outcomes = ["safety", "accuracy", "scalability", "compliance", "efficiency", "quality"];

  return [
    `In ${normalizedRole}, how would you ${pickRandom(verbs)} a real-world ${pickRandom(artifacts)} and measure success?`,
    `Describe a challenging scenario in ${normalizedRole} and walk through your approach step by step.`,
    `Which tools, standards, or best practices are critical in ${normalizedRole}, and when would you choose each?`,
    `How would you balance speed vs ${pickRandom(outcomes)} in a ${normalizedRole} project with tight deadlines?`,
    `Give an example of a decision a ${normalizedRole} professional must make under uncertainty and explain tradeoffs.`,
    `If results are below target in a ${normalizedRole} task, how would you diagnose root causes and recover?`,
    `How would you communicate complex ${normalizedRole} decisions to non-technical stakeholders?`,
    `What failure modes are common in ${normalizedRole}, and how do you prevent them proactively?`,
  ];
}

function difficultyPrefix(difficulty) {
  if (difficulty === "hard") return "(Hard) ";
  if (difficulty === "medium") return "(Medium) ";
  return "(Easy) ";
}

function buildFallbackQuestions({ role, difficulty, questionCount }) {
  const bank = pickBank(role);
  const shuffled = shuffle(bank);
  const prefix = difficultyPrefix(difficulty);
  const extensions = [
    "Include one practical example.",
    "Discuss key tradeoffs.",
    "Mention common mistakes and mitigations.",
    "Explain how you would measure outcomes.",
    "Describe edge cases and constraints.",
  ];
  const questions = [];

  for (let i = 0; i < questionCount; i += 1) {
    const base = shuffled[i % shuffled.length] || bank[i % bank.length] || "Explain this topic clearly.";
    const ext = i >= shuffled.length ? ` ${extensions[i % extensions.length]}` : "";
    questions.push({ questionText: `${prefix}${base}${ext}`.trim() });
  }

  return uniqueQuestions(parseQuestions(questions)).slice(0, questionCount);
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

  const domain = String(role || "this role");
  const question = String(questionText || "this question");

  return {
    short: [
      `For ${domain}, start with a clear definition for: ${question}.`,
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

function enrichEvaluation({ evaluation, role, questionText, answerText, difficulty, source, provider }) {
  const normalized = parseEvaluation(evaluation || {});
  const missingKeywords = Array.isArray(normalized.missingKeywords) ? normalized.missingKeywords : [];
  const hasCorrectAnswer = Boolean(
    normalized.correctAnswer?.short ||
      normalized.correctAnswer?.long ||
      (Array.isArray(normalized.correctAnswer?.bulletPoints) && normalized.correctAnswer.bulletPoints.length)
  );

  if (!hasCorrectAnswer) {
    normalized.correctAnswer = buildCorrectAnswer({ role, questionText });
  }

  const hasRubric = Object.values(normalized.rubric || {}).some((value) => Number(value) > 0);
  const hasEvidence = Array.isArray(normalized.evidence) && normalized.evidence.length > 0;
  if (!hasRubric || !hasEvidence) {
    const fallback = buildRubricAndEvidence({ role, questionText, answerText, missingKeywords });
    normalized.rubric = hasRubric ? normalized.rubric : fallback.rubric;
    normalized.evidence = hasEvidence ? normalized.evidence : fallback.evidence;
  }

  if (!normalized.improvementTip) {
    normalized.improvementTip = "Use the pattern: definition -> approach -> example -> edge cases.";
  }

  if (!normalized.feedback) {
    normalized.feedback =
      difficulty === "hard"
        ? "Good attempt. Add more technical depth, tradeoffs, and one concrete real-world example."
        : "Good start. Add clearer structure and one practical example to strengthen your answer.";
  }

  return {
    ...normalized,
    source,
    provider,
  };
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
 * Generates interview questions via provider and falls back to local role bank.
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
        const questions = uniqueQuestions(parseQuestionsFromText(text, { expectedCount: questionCount }));
        if (questions.length === questionCount) return questions;
        if (questions.length > 0) {
          const fallback = buildFallbackQuestions({ role, difficulty, questionCount });
          const merged = uniqueQuestions([...questions, ...fallback]).slice(0, questionCount);
          if (merged.length === questionCount) return merged;
        }
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

  // Fallback to local role-aware question generation.
  return buildFallbackQuestions({ role, difficulty, questionCount });
}

/**
 * Evaluates answers via provider and falls back to heuristic scoring.
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
        if (evaln) {
          return enrichEvaluation({
            evaluation: evaln,
            role,
            questionText,
            answerText,
            difficulty,
            source: "live-ai",
            provider: "groq",
          });
        }
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

  // Fallback heuristic evaluation.
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

  return enrichEvaluation({
    evaluation: payload,
    role,
    questionText,
    answerText,
    difficulty,
    source: "fallback-heuristic",
    provider: "local",
  });
}

module.exports = {
  generateQuestions,
  evaluateAnswer,
};
