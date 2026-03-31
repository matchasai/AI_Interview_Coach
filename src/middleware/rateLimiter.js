const rateLimit = require("express-rate-limit");

// 30 requests per minute per IP on /api/*
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "RATE_LIMITED",
    message: "Too many requests. Please try again in a minute.",
  },
});

module.exports = { apiRateLimiter };
