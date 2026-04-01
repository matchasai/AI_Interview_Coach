const { z } = require("zod");

/**
 * Production-ish parsing helpers.
 * We expect Gemini to return JSON, but we still guard against:
 * - code fences
 * - leading/trailing commentary
 * - minor type issues
 */

function ensureArrayOfStrings(value, fallback = []) {
  if (!Array.isArray(value)) return fallback;
  return value.filter((x) => typeof x === "string" && x.trim().length > 0);
}

function extractJsonFromText(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // If the whole response is JSON, parse directly.
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  // Try JSON code block.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      // continue
    }
  }

  // Try to find a JSON object or array within the text.
  const firstObj = trimmed.indexOf("{");
  const firstArr = trimmed.indexOf("[");
  const start =
    firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);
  if (start === -1) return null;

  const lastObj = trimmed.lastIndexOf("}");
  const lastArr = trimmed.lastIndexOf("]");
  const end =
    lastObj === -1 ? lastArr : lastArr === -1 ? lastObj : Math.max(lastObj, lastArr);
  if (end === -1 || end <= start) return null;

  const slice = trimmed.slice(start, end + 1).trim();
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

const QuestionsSchema = z
  .array(
    z
      .object({
        questionText: z.string().min(1).max(400),
      })
      .strict()
  )
  .min(1);

const EvaluationSchema = z
  .object({
    score: z.preprocess((v) => Number(v), z.number().min(0).max(10)),
    missingKeywords: z.array(z.string().min(1)).optional().default([]),
    feedback: z.string().optional().default(""),
    improvementTip: z.string().optional().default(""),
    correctAnswer: z
      .object({
        short: z.string().optional().default(""),
        long: z.string().optional().default(""),
        bulletPoints: z.array(z.string().min(1)).optional().default([]),
      })
      .optional()
      .default({ short: "", long: "", bulletPoints: [] }),
    rubric: z
      .object({
        conceptAccuracy: z.preprocess((v) => Number(v), z.number().min(0).max(10)),
        depth: z.preprocess((v) => Number(v), z.number().min(0).max(10)),
        exampleQuality: z.preprocess((v) => Number(v), z.number().min(0).max(10)),
        tradeoffAwareness: z.preprocess((v) => Number(v), z.number().min(0).max(10)),
        communication: z.preprocess((v) => Number(v), z.number().min(0).max(10)),
      })
      .optional()
      .default({
        conceptAccuracy: 0,
        depth: 0,
        exampleQuality: 0,
        tradeoffAwareness: 0,
        communication: 0,
      }),
    evidence: z
      .array(
        z.object({
          quote: z.string().optional().default(""),
          strength: z.string().optional().default(""),
          gap: z.string().optional().default(""),
          action: z.string().optional().default(""),
        })
      )
      .optional()
      .default([]),
  })
  .strict();

function parseQuestions(payload) {
  // Expect: [{ questionText: string }]
  if (!Array.isArray(payload)) return [];
  return payload
    .map((q) => ({ questionText: typeof q?.questionText === "string" ? q.questionText : "" }))
    .filter((q) => q.questionText.length > 0);
}

function parseEvaluation(payload) {
  const score = Number(payload?.score);
  return {
    score: Number.isFinite(score) ? Math.max(0, Math.min(10, score)) : 0,
    missingKeywords: ensureArrayOfStrings(payload?.missingKeywords),
    feedback: typeof payload?.feedback === "string" ? payload.feedback : "",
    improvementTip: typeof payload?.improvementTip === "string" ? payload.improvementTip : "",
    correctAnswer: {
      short:
        typeof payload?.correctAnswer?.short === "string"
          ? payload.correctAnswer.short
          : typeof payload?.correctAnswer === "string"
            ? payload.correctAnswer
            : "",
      long: typeof payload?.correctAnswer?.long === "string" ? payload.correctAnswer.long : "",
      bulletPoints: ensureArrayOfStrings(payload?.correctAnswer?.bulletPoints),
    },
    rubric: {
      conceptAccuracy: Number(payload?.rubric?.conceptAccuracy) || 0,
      depth: Number(payload?.rubric?.depth) || 0,
      exampleQuality: Number(payload?.rubric?.exampleQuality) || 0,
      tradeoffAwareness: Number(payload?.rubric?.tradeoffAwareness) || 0,
      communication: Number(payload?.rubric?.communication) || 0,
    },
    evidence: Array.isArray(payload?.evidence)
      ? payload.evidence
          .map((item) => ({
            quote: typeof item?.quote === "string" ? item.quote : "",
            strength: typeof item?.strength === "string" ? item.strength : "",
            gap: typeof item?.gap === "string" ? item.gap : "",
            action: typeof item?.action === "string" ? item.action : "",
          }))
          .filter((item) => item.quote || item.strength || item.gap || item.action)
      : [],
  };
}

function parseQuestionsFromText(text, { expectedCount } = {}) {
  const json = extractJsonFromText(text);
  const parsed = QuestionsSchema.safeParse(json);
  if (!parsed.success) return [];

  const normalized = parseQuestions(parsed.data);
  if (typeof expectedCount === "number" && expectedCount > 0) {
    return normalized.slice(0, expectedCount);
  }
  return normalized;
}

function parseEvaluationFromText(text) {
  const json = extractJsonFromText(text);
  const parsed = EvaluationSchema.safeParse(json);
  if (!parsed.success) return null;

  const normalized = parseEvaluation(parsed.data);
  // Round scores to integer 0-10 for consistent UX.
  normalized.score = Math.round(normalized.score);
  return normalized;
}

module.exports = {
  parseQuestions,
  parseEvaluation,
  parseQuestionsFromText,
  parseEvaluationFromText,
};
