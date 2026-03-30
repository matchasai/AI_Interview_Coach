const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
    avgScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    recommendationStats: {
      shown: { type: Number, default: 0 },
      applied: { type: Number, default: 0 },
      overridden: { type: Number, default: 0 },
      ignored: { type: Number, default: 0 },
      lastFeedbackAt: { type: Date, default: null },
    },
    resetToken: {
      type: String,
      default: null,
      select: false,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };
