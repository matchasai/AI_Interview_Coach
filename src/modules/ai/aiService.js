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
  const startOffset = Math.floor(Math.random() * Math.max(shuffled.length, 1));
  const extensions = [
    "Include one practical example.",
    "Discuss key tradeoffs.",
    "Mention common mistakes and mitigations.",
    "Explain how you would measure outcomes.",
    "Describe edge cases and constraints.",
  ];
  const questions = [];

  for (let i = 0; i < questionCount; i += 1) {
    const idx = (startOffset + i) % Math.max(shuffled.length, 1);
    const base = shuffled[idx] || bank[idx] || "Explain this topic clearly.";
    const ext = i >= shuffled.length || Math.random() > 0.55 ? ` ${extensions[(startOffset + i) % extensions.length]}` : "";
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

function extractJsonObjectFromText(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Continue to fallback parsing.
  }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) {
    try {
      const parsed = JSON.parse(fence[1].trim());
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // Continue to fallback parsing.
    }
  }

  const firstObj = trimmed.indexOf("{");
  const lastObj = trimmed.lastIndexOf("}");
  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
    try {
      const parsed = JSON.parse(trimmed.slice(firstObj, lastObj + 1));
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

function ensureShortString(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim() || fallback;
}

function ensureStringList(value, fallback = []) {
  if (!Array.isArray(value)) return fallback;
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function ensureCodeBlock(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function isSystemDesignTopic(topic) {
  const t = ensureShortString(topic).toLowerCase();
  return t.includes("system design") || t.includes("design ") || t.includes("architecture");
}

function pickRealSystem(topic) {
  const t = ensureShortString(topic).toLowerCase();
  if (t.includes("video") || t.includes("stream") || t.includes("cdn")) {
    return {
      name: "YouTube",
      scenario: "video upload and playback",
      flow: "Client -> Load Balancer -> API Gateway -> Video Service -> Metadata DB + Object Storage -> CDN -> Client",
      bottleneck: "transcoding queue and CDN cold cache latency",
    };
  }
  if (t.includes("chat") || t.includes("message") || t.includes("whatsapp")) {
    return {
      name: "WhatsApp",
      scenario: "send message and delivery confirmation",
      flow: "Client -> Load Balancer -> Messaging API -> Queue -> Delivery Worker -> Message Store + Cache -> Recipient Client",
      bottleneck: "fan-out to large groups and retry storms",
    };
  }
  if (t.includes("commerce") || t.includes("cart") || t.includes("payment") || t.includes("order")) {
    return {
      name: "Amazon",
      scenario: "place order during peak traffic",
      flow: "Client -> Load Balancer -> API Gateway -> Order Service -> Inventory DB + Redis Cache -> Payment Service -> Response",
      bottleneck: "inventory contention and payment timeout coordination",
    };
  }

  return {
    name: "URL Shortener",
    scenario: "create short URL and redirect",
    flow: "Client -> Load Balancer -> API -> Shortener Service -> Redis Cache + SQL/NoSQL DB -> Redirect Response",
    bottleneck: "hot-key cache pressure and write amplification",
  };
}

function buildStructuredDoubtDetails(topic) {
  const cleanTopic = ensureShortString(topic, "this topic");
  const system = pickRealSystem(cleanTopic);
  const systemDesign = isSystemDesignTopic(cleanTopic);

  const howItWorksSteps = [
    "User request first hits a load balancer, which spreads traffic across multiple API instances.",
    "API validates input and sends the request to the core service that owns business logic.",
    "Service checks Redis cache before querying the primary database to reduce read latency.",
    "On cache miss, service reads from DB, computes result, updates cache, and returns response.",
    "Background workers handle slow tasks asynchronously so request latency stays low.",
  ];

  if (systemDesign) {
    howItWorksSteps.unshift(
      `Text architecture: ${system.flow}`
    );
  }

  return {
    simpleDefinition: `${cleanTopic} is a practical engineering approach used inside production services to process requests reliably and predictably. In interviews, it is usually discussed in backend APIs, distributed systems, and performance-sensitive flows.`,
    whyItIsUsed: `Teams use ${cleanTopic} to solve real production constraints like latency spikes, scaling limits, and consistency tradeoffs. In ${system.name}, this appears when handling ${system.scenario} under heavy concurrent traffic.`,
    realWorldExample: `${system.name}: during ${system.scenario}, the request passes through API, service, cache, and DB. Cache serves hot reads, DB is source of truth, and queue/worker handles expensive tasks so user response stays fast.`,
    howItWorks: howItWorksSteps,
    whereItIsUsed: [
      "High-traffic APIs (auth, feed, checkout)",
      "Distributed services using cache + database patterns",
      "System design interviews for backend/full-stack roles",
      "Production incident debugging and performance tuning",
    ],
    programmingUsage: {
      explanation: `Use the topic in code by showing API request handling, cache check, DB fallback, and response shaping. Mention timeout handling and idempotent retries for reliability.`,
      code: [
        `// Node.js service flow: API -> cache -> DB -> response`,
        `app.get('/v1/items/:id', async (req, res) => {`,
        `  const key = \`item:\${req.params.id}\`;`,
        `  const cached = await redis.get(key);`,
        `  if (cached) return res.json({ source: 'cache', data: JSON.parse(cached) });`,
        ``,
        `  const row = await db.query('SELECT * FROM items WHERE id = $1', [req.params.id]);`,
        `  if (!row.rows.length) return res.status(404).json({ error: 'not found' });`,
        ``,
        `  await redis.setex(key, 60, JSON.stringify(row.rows[0]));`,
        `  return res.json({ source: 'db', data: row.rows[0] });`,
        `});`,
      ].join("\n"),
    },
    prosAndCons: {
      pros: [
        "Lower average latency by serving hot reads from cache",
        "Better horizontal scaling because stateless API instances can be added quickly",
        "Clear separation between request path and async background work",
      ],
      cons: [
        "More moving parts increase operational complexity and on-call burden",
        "Cache invalidation bugs can cause stale reads",
        "Extra infrastructure (cache, queue, workers) increases cost",
      ],
    },
    commonMistakes: [
      "Explaining architecture without request flow (API -> cache -> DB)",
      "Ignoring bottlenecks like hot keys, DB locks, or queue backlogs",
      "Claiming strong consistency while also using eventually consistent cache reads",
      "No scaling strategy (single instance assumptions in high-traffic systems)",
    ],
    interviewAnswer: `${cleanTopic} is used in production request paths where latency and reliability matter. In practice, traffic goes through load balancer, API service, cache, then DB on cache miss. Systems like ${system.name} use this to keep response time low under scale. The tradeoff is higher operational complexity and cache consistency management.`,
    followUpQuestion: `If traffic grows 10x for ${system.name}, where is the first bottleneck in this flow and how would you scale it?`,
    linkedMissingKeywords: [],
    miniQuiz: [
      {
        question: `Explain ${cleanTopic} in 60 seconds using ${system.name} and one API->cache->DB flow.`,
        difficulty: "easy",
        expectedPoints: ["Definition", "Real system", "Flow"],
      },
      {
        question: `What tradeoffs should you mention when discussing ${cleanTopic} in production?`,
        difficulty: "medium",
        expectedPoints: ["Latency vs consistency", "Scale vs cost", "Complexity vs simplicity"],
      },
      {
        question: `How would you implement ${cleanTopic} with cache fallback and DB query?`,
        difficulty: "medium",
        expectedPoints: ["API handler", "Cache miss path", "Failure handling"],
      },
    ],
  };
}

function buildFallbackDoubtDetails(topic) {
  const base = buildStructuredDoubtDetails(topic);
  return {
    ...base,
    definition: base.simpleDefinition,
    whyUsed: base.whyItIsUsed,
    example: base.realWorldExample,
    applications: base.whereItIsUsed,
  };
}

function normalizeDoubtDetails(payload, topic) {
  const fallback = buildFallbackDoubtDetails(topic);
  const source = payload && typeof payload === "object" ? payload : {};
  const miniQuizSource = Array.isArray(source.miniQuiz) ? source.miniQuiz : [];

  const miniQuiz = miniQuizSource
    .map((item) => ({
      question: ensureShortString(item?.question),
      difficulty: ensureShortString(item?.difficulty, "medium"),
      expectedPoints: ensureStringList(item?.expectedPoints, []),
    }))
    .filter((item) => item.question);

  const structured = source.sections && Array.isArray(source.sections) ? source.sections : [];

  const simpleDefinition = ensureShortString(
    source.simpleDefinition || source.definition,
    fallback.simpleDefinition
  );
  const whyItIsUsed = ensureShortString(source.whyItIsUsed || source.whyUsed, fallback.whyItIsUsed);
  const realWorldExample = ensureShortString(
    source.realWorldExample || source.example,
    fallback.realWorldExample
  );
  const howItWorks = ensureStringList(source.howItWorks, fallback.howItWorks);
  const whereItIsUsed = ensureStringList(source.whereItIsUsed || source.applications, fallback.whereItIsUsed);
  const programmingUsage = {
    explanation: ensureShortString(
      source.programmingUsage?.explanation || source.programmingUsage,
      fallback.programmingUsage.explanation
    ),
    code: ensureCodeBlock(source.programmingUsage?.code, fallback.programmingUsage.code),
  };
  const prosAndCons = {
    pros: ensureStringList(source.prosAndCons?.pros, fallback.prosAndCons.pros),
    cons: ensureStringList(source.prosAndCons?.cons, fallback.prosAndCons.cons),
  };
  const commonMistakes = ensureStringList(source.commonMistakes, fallback.commonMistakes);
  const interviewAnswer = ensureShortString(source.interviewAnswer, fallback.interviewAnswer);
  const followUpQuestion = ensureShortString(source.followUpQuestion, fallback.followUpQuestion);

  const sections = structured.length
    ? structured
        .map((item) => ({
          title: ensureShortString(item?.title),
          content: ensureShortString(item?.content),
          bullets: ensureStringList(item?.bullets, []),
          code: ensureCodeBlock(item?.code, ""),
        }))
        .filter((item) => item.title && (item.content || item.bullets.length || item.code))
    : [
        { title: "1. Simple Definition", content: simpleDefinition },
        { title: "2. Why It Is Used (REAL PURPOSE)", content: whyItIsUsed },
        { title: "3. Real-World Example (VERY IMPORTANT)", content: realWorldExample },
        { title: "4. How It Works (Step-by-step)", bullets: howItWorks },
        { title: "5. Where It Is Used (Applications)", bullets: whereItIsUsed },
        { title: "6. Programming Usage", content: programmingUsage.explanation, code: programmingUsage.code },
        {
          title: "7. Pros and Cons",
          bullets: [
            ...prosAndCons.pros.map((item) => `Pros: ${item}`),
            ...prosAndCons.cons.map((item) => `Cons: ${item}`),
          ],
        },
        { title: "8. Common Mistakes (INTERVIEW GOLD)", bullets: commonMistakes },
        { title: "9. Interview Answer (Short Version)", content: interviewAnswer },
        { title: "10. Follow-up Question", content: followUpQuestion },
      ];

  return {
    simpleDefinition,
    whyItIsUsed,
    realWorldExample,
    howItWorks,
    whereItIsUsed,
    programmingUsage,
    prosAndCons,
    commonMistakes,
    interviewAnswer,
    followUpQuestion,
    sections,
    // Backward-compatible aliases for existing UI and exports.
    definition: simpleDefinition,
    whyUsed: whyItIsUsed,
    example: realWorldExample,
    applications: whereItIsUsed,
    programmingUsageText: programmingUsage.explanation,
    linkedMissingKeywords: ensureStringList(source.linkedMissingKeywords, []),
    miniQuiz: miniQuiz.length ? miniQuiz : fallback.miniQuiz,
  };
}

function buildFallbackDoubtReply({ topic, question }) {
  const cleanTopic = ensureShortString(topic, "this topic");
  const cleanQuestion = ensureShortString(question, "your question");

  return {
    answer: `Good question: "${cleanQuestion}". For ${cleanTopic}, first define the concept, then explain the mechanism, and finish with one concrete project example and edge case.`,
    keyPoints: [
      "Start with a one-line definition",
      "Explain how it works step-by-step",
      "Add one realistic project example",
    ],
    commonMistakes: [
      "Giving theory without implementation detail",
      "Skipping tradeoffs and edge cases",
      "Not connecting answer to business impact",
    ],
    followUpQuestions: [
      `Can you show a backend example for ${cleanTopic}?`,
      `What are the tradeoffs of ${cleanTopic}?`,
      `How would you explain ${cleanTopic} to a non-technical stakeholder?`,
    ],
    miniQuiz: [],
  };
}

function normalizeDoubtReply(payload, { topic, question }) {
  const fallback = buildFallbackDoubtReply({ topic, question });
  const source = payload && typeof payload === "object" ? payload : {};
  const miniQuizSource = Array.isArray(source.miniQuiz) ? source.miniQuiz : [];

  const miniQuiz = miniQuizSource
    .map((item) => ({
      question: ensureShortString(item?.question),
      difficulty: ensureShortString(item?.difficulty, "medium"),
      expectedPoints: ensureStringList(item?.expectedPoints, []),
    }))
    .filter((item) => item.question);

  return {
    answer: ensureShortString(source.answer, fallback.answer),
    keyPoints: ensureStringList(source.keyPoints, fallback.keyPoints),
    commonMistakes: ensureStringList(source.commonMistakes, fallback.commonMistakes),
    followUpQuestions: ensureStringList(source.followUpQuestions, fallback.followUpQuestions),
    miniQuiz,
  };
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

async function generateDoubtTopicDetails({ topic, details }) {
  const cleanTopic = ensureShortString(topic);
  const context = ensureShortString(details);
  const system = pickRealSystem(cleanTopic);
  const systemDesign = isSystemDesignTopic(cleanTopic);

  if (hasGroqKey()) {
    const prompt = [
      "You are a senior software engineer and system design interviewer.",
      "STRICT RULES:",
      "- Do not write generic theory.",
      "- Do not repeat the topic in filler text.",
      "- Every section must include practical technical content.",
      "- Include real systems (YouTube, WhatsApp, Amazon or equivalent).",
      "- Include real components (API, DB, cache, load balancer).",
      "- Include real flow (request -> processing -> response).",
      "",
      "Return ONLY valid JSON object with these keys exactly:",
      "simpleDefinition, whyItIsUsed, realWorldExample, howItWorks, whereItIsUsed, programmingUsage, prosAndCons, commonMistakes, interviewAnswer, followUpQuestion, linkedMissingKeywords, miniQuiz, sections",
      "howItWorks and whereItIsUsed must be arrays of strings.",
      "programmingUsage must be an object with explanation and code.",
      "prosAndCons must be an object with pros and cons arrays.",
      "linkedMissingKeywords must be array of strings.",
      "miniQuiz must be array (0-3) of {question, difficulty, expectedPoints}.",
      "sections must be an array of 10 objects with title and content or bullets/code.",
      "Section order must be exactly:",
      "1) Simple Definition",
      "2) Why It Is Used (REAL PURPOSE)",
      "3) Real-World Example (MANDATORY)",
      "4) How It Works (STEP-BY-STEP FLOW)",
      "5) Where It Is Used",
      "6) Programming Usage (REAL CODE)",
      "7) Tradeoffs",
      "8) Common Mistakes",
      "9) Interview Answer (SHORT)",
      "10) Follow-up Question",
      systemDesign
        ? "Because this topic is system design, include text architecture diagram explanation, horizontal scaling strategy, and bottleneck analysis."
        : "Keep the explanation practical and interview-ready with concrete engineering detail.",
      "No markdown, no commentary.",
      "",
      `topic: ${cleanTopic}`,
      `studentContext: ${context || "none"}`,
      `preferredRealSystem: ${system.name}`,
      `preferredFlow: ${system.flow}`,
      `knownBottleneck: ${system.bottleneck}`,
    ].join("\n");

    try {
      const text = await groqGenerateText(prompt);
      const parsed = extractJsonObjectFromText(text);
      if (parsed) {
        return {
          details: normalizeDoubtDetails(parsed, cleanTopic),
          source: "live-ai",
          provider: "groq",
        };
      }
    } catch {
      // Continue to fallback.
    }
  }

  return {
    details: buildFallbackDoubtDetails(cleanTopic),
    source: "fallback-heuristic",
    provider: "local",
  };
}

async function generateDoubtReply({ topic, details, question, history = [] }) {
  const cleanTopic = ensureShortString(topic);
  const cleanQuestion = ensureShortString(question);
  const cleanDetails = ensureShortString(details);
  const compactHistory = Array.isArray(history)
    ? history
        .slice(-6)
        .map((msg) => `${msg.role === "assistant" ? "Coach" : "Student"}: ${ensureShortString(msg.text)}`)
        .filter(Boolean)
        .join("\n")
    : "";

  if (hasGroqKey()) {
    const prompt = [
      "You are an expert interview coach.",
      "Return ONLY valid JSON with keys:",
      "answer, keyPoints, commonMistakes, followUpQuestions, miniQuiz",
      "answer must be concise and practical.",
      "keyPoints/commonMistakes/followUpQuestions must be arrays of strings.",
      "miniQuiz must be array (0-2) of {question, difficulty, expectedPoints}.",
      "No markdown, no extra text.",
      "",
      `topic: ${cleanTopic}`,
      `topicContext: ${cleanDetails || "none"}`,
      `studentQuestion: ${cleanQuestion}`,
      "recentConversation:",
      compactHistory || "none",
    ].join("\n");

    try {
      const text = await groqGenerateText(prompt);
      const parsed = extractJsonObjectFromText(text);
      if (parsed) {
        return {
          ...normalizeDoubtReply(parsed, { topic: cleanTopic, question: cleanQuestion }),
          source: "live-ai",
          provider: "groq",
        };
      }
    } catch {
      // Continue to fallback.
    }
  }

  return {
    ...buildFallbackDoubtReply({ topic: cleanTopic, question: cleanQuestion }),
    source: "fallback-heuristic",
    provider: "local",
  };
}

module.exports = {
  generateQuestions,
  evaluateAnswer,
  generateDoubtTopicDetails,
  generateDoubtReply,
};
