const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError("Missing or invalid Authorization header", 401, "UNAUTHORIZED"));
  }

  const token = header.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    // Keep a small, consistent shape.
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    return next();
  } catch (err) {
    return next(new AppError("Invalid or expired token", 401, "UNAUTHORIZED"));
  }
}

module.exports = { authMiddleware };
