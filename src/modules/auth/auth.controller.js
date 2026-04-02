const { asyncHandler } = require("../../utils/asyncHandler");
const { AppError } = require("../../utils/AppError");
const { toLowerTrim, trim } = require("../../utils/sanitize");
const authService = require("./auth.service");

function validateEmail(email) {
  // Simple, safe validation; avoid overly strict regex.
  return typeof email === "string" && email.includes("@") && email.includes(".");
}

const register = asyncHandler(async (req, res) => {
  const name = trim(req.body?.name);
  const email = toLowerTrim(req.body?.email);
  const password = req.body?.password;

  if (!name || name.length < 2) {
    throw new AppError("Name must be at least 2 characters", 400, "VALIDATION_ERROR");
  }
  if (!validateEmail(email)) {
    throw new AppError("Invalid email", 400, "VALIDATION_ERROR");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400, "VALIDATION_ERROR");
  }

  const result = await authService.register({ name, email, password });
  res.status(201).json({ success: true, ...result });
});

const login = asyncHandler(async (req, res) => {
  const email = toLowerTrim(req.body?.email);
  const password = req.body?.password;

  if (!validateEmail(email)) {
    throw new AppError("Invalid email", 400, "VALIDATION_ERROR");
  }
  if (typeof password !== "string" || password.length < 1) {
    throw new AppError("Password is required", 400, "VALIDATION_ERROR");
  }

  const result = await authService.login({ email, password });
  res.status(200).json({ success: true, ...result });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.userId);
  res.status(200).json({ success: true, user });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const email = toLowerTrim(req.body?.email);

  if (!validateEmail(email)) {
    throw new AppError("Invalid email", 400, "VALIDATION_ERROR");
  }

  await authService.forgotPassword({ email });
  // Always return success for security (don't leak whether email exists)
  res.status(200).json({
    success: true,
    message: "If an account exists, a reset link has been sent to your email.",
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const token = req.body?.token;
  const password = req.body?.password;

  if (!token || typeof token !== "string") {
    throw new AppError("Reset token is required", 400, "VALIDATION_ERROR");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400, "VALIDATION_ERROR");
  }

  const result = await authService.resetPassword({ token, password });
  res.status(200).json({ success: true, ...result });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.body?.token;

  if (!token || typeof token !== "string") {
    throw new AppError("Verification token is required", 400, "VALIDATION_ERROR");
  }

  const result = await authService.verifyEmail({ token });
  res.status(200).json({ success: true, ...result });
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const email = toLowerTrim(req.body?.email);

  if (!validateEmail(email)) {
    throw new AppError("Invalid email", 400, "VALIDATION_ERROR");
  }

  const result = await authService.resendVerificationEmail({ email });
  res.status(200).json({ success: true, ...result });
});

module.exports = {
  register,
  login,
  me,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
};
