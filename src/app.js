const express = require("express");
const cors = require("cors");

const { env } = require("./config/env");
const { apiRateLimiter } = require("./middleware/rateLimiter");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/user/user.routes");
const sessionRoutes = require("./modules/session/session.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const doubtRoutes = require("./modules/doubt/doubt.routes");
const aiRoutes = require("./modules/ai/ai.routes");

const app = express();

// Trust proxy is helpful on platforms like Render.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// Basic health endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Rate limit API routes
app.use("/api", apiRateLimiter);

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/doubt", doubtRoutes);
app.use("/api/ai", aiRoutes);

// 404 + error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
