const { AppError } = require("../utils/AppError");

function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message = err.message || "Something went wrong";

  // Log full error server-side (safe for production logs).
  // eslint-disable-next-line no-console
  console.error("[error]", {
    code,
    statusCode,
    message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  // Hide stack trace from clients.
  res.status(statusCode).json({
    success: false,
    code,
    message,
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };
