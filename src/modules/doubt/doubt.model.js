const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  text: String,
  keyPoints: [String],
  commonMistakes: [String],
  pinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const doubtSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    messages: [messageSchema],
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
  },
  { timestamps: true }
);

doubtSessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("DoubtSession", doubtSessionSchema);
