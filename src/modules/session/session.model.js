const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    questionText: { type: String, required: true },
    userAnswer: { type: String, default: null },
    score: { type: Number, default: null, min: 0, max: 10 },
    feedback: { type: String, default: null },
    missingKeywords: { type: [String], default: null },
    improvementTip: { type: String, default: null },
    evaluationSource: { type: String, default: null },
    evaluationProvider: { type: String, default: null },
    correctAnswer: {
      short: { type: String, default: null },
      long: { type: String, default: null },
      bulletPoints: { type: [String], default: null },
    },
    rubric: {
      conceptAccuracy: { type: Number, default: null, min: 0, max: 10 },
      depth: { type: Number, default: null, min: 0, max: 10 },
      exampleQuality: { type: Number, default: null, min: 0, max: 10 },
      tradeoffAwareness: { type: Number, default: null, min: 0, max: 10 },
      communication: { type: Number, default: null, min: 0, max: 10 },
    },
    evidence: {
      type: [
        {
          quote: { type: String, default: "" },
          strength: { type: String, default: "" },
          gap: { type: String, default: "" },
          action: { type: String, default: "" },
        },
      ],
      default: null,
    },
    answeredAt: { type: Date, default: null },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    role: { type: String, required: true },
    difficulty: { type: String, required: true, enum: ["easy", "medium", "hard"] },
    questions: { type: [questionSchema], required: true },
    totalScore: { type: Number, default: 0, min: 0, max: 100 },
    maxScore: { type: Number, default: 0 },
    durationSeconds: { type: Number, default: null, min: 0 },
    status: { type: String, enum: ["active", "paused", "completed", "abandoned"], default: "active" },
    completedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, createdAt: -1 });

const Session = mongoose.model("Session", sessionSchema);

module.exports = { Session };
