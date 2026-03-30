const { AppError } = require("../utils/AppError");

function adminMiddleware(req, res, next) {
  if (!req.user) {
    return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
  }

  if (req.user.role !== "admin") {
    return next(new AppError("Admin access required", 403, "FORBIDDEN"));
  }

  return next();
}

module.exports = { adminMiddleware };
