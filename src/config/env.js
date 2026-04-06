const dotenv = require("dotenv");
const { AppError } = require("../utils/AppError");

dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new AppError(`Missing required environment variable: ${name}`, 500);
  }
  return value;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 5000),
  MONGODB_URI: requireEnv("MONGODB_URI"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5174",

  // AI (optional)
  AI_PROVIDER: process.env.AI_PROVIDER || "groq",
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  GROQ_MODEL: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
  GROQ_TEMPERATURE: Number(process.env.GROQ_TEMPERATURE || 0.7),
  AI_STRICT_MODE: String(process.env.AI_STRICT_MODE || "false").toLowerCase() === "true",

  // Email provider (SMTP)
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || "smtp",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "IntervAI Coach <testingexample70@gmail.com>",
};

module.exports = { env };
