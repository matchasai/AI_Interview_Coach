const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { env } = require("../../config/env");
const { AppError } = require("../../utils/AppError");
const { User } = require("./user.model");
const { enqueueEmail } = require("./email.queue");

function signToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

function toSafeUser(userDoc) {
  return {
    id: userDoc._id.toString(),
    name: userDoc.name,
    email: userDoc.email,
    role: userDoc.role,
    totalSessions: userDoc.totalSessions,
    avgScore: userDoc.avgScore,
    themePreference: userDoc.themePreference,
    practiceReminderEnabled: userDoc.practiceReminderEnabled,
    practiceReminderChannel: userDoc.practiceReminderChannel,
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt,
  };
}

async function register({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("Email already registered", 409, "EMAIL_EXISTS");
  }

  const hashed = await bcrypt.hash(password, 12);
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await User.create({
    name,
    email,
    password: hashed,
    role: "user",
    isEmailVerified: false,
    themePreference: "light",
    practiceReminderEnabled: false,
    practiceReminderChannel: "email",
    emailVerificationToken: verificationToken,
    emailVerificationExpiry: verificationExpiry,
  });

  // Send verification email using queue + retry to avoid blocking registration.
  const emailResult = await enqueueEmail("verification", {
    to: user.email,
    name: user.name,
    verificationToken,
  });

  let message = "Registration successful. Please verify your email.";

  if (emailResult.sent) {
    message = "Registration successful. Verification link sent to your email.";
  } else if (emailResult.queued) {
    message = "Registration successful. Verification email is queued and should arrive shortly.";
  } else {
    console.warn(
      `[AUTH] Verification email send failed for ${user.email}. User can request resend.`
    );
    message =
      "Registration successful, but verification email could not be sent right now. Please use resend verification from login.";
  }

  // Don't return auth token yet - user must verify email first
  return { message, user: toSafeUser(user) };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  if (!user.isEmailVerified) {
    throw new AppError("Please verify your email before logging in", 403, "EMAIL_NOT_VERIFIED");
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  // Reload without password field for response
  const safeUser = await User.findById(user._id);
  const token = signToken(user);
  return { token, user: toSafeUser(safeUser) };
}

async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }
  return toSafeUser(user);
}

async function forgotPassword({ email }) {
  const user = await User.findOne({ email });
  if (!user) {
    // For security, don't reveal whether email exists
    return;
  }

  // Generate a reset token valid for 1 hour
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.resetToken = resetToken;
  user.resetTokenExpiry = resetTokenExpiry;
  await user.save();
  // Attempt email send; if it fails, queue for retry in background.
  // User still gets success response since reset token is persisted.
  const emailResult = await enqueueEmail("password-reset", {
    to: user.email,
    resetToken,
  });

  if (!emailResult.queued && !emailResult.sent) {
    // Only fail if email provider is configured and sending failed permanently.
    // If SMTP not configured, it logs to console and succeeds gracefully.
    console.warn(
      `[AUTH] Password reset email send failed for ${user.email}, but token persisted.`
    );
    // Still return success to user since token is valid; they can retry request.
    throw new AppError("Failed to send password reset email", 502, "EMAIL_SEND_FAILED");
  }
}

async function resetPassword({ token, password }) {
  const user = await User.findOne({ resetToken: token }).select("+resetToken +resetTokenExpiry");
  if (!user) {
    throw new AppError("Invalid or expired reset token", 400, "INVALID_TOKEN");
  }

  if (user.resetTokenExpiry < new Date()) {
    throw new AppError("Reset token has expired", 400, "TOKEN_EXPIRED");
  }

  // Hash new password
  const hashed = await bcrypt.hash(password, 12);
  user.password = hashed;
  user.resetToken = null;
  user.resetTokenExpiry = null;
  await user.save();

  // Return token for immediate login
  const newToken = signToken(user);
  return { token: newToken, user: toSafeUser(user) };
}

async function verifyEmail({ token }) {
  const user = await User.findOne({ emailVerificationToken: token }).select("+emailVerificationToken +emailVerificationExpiry");
  if (!user) {
    throw new AppError("Invalid or expired verification token", 400, "INVALID_TOKEN");
  }

  if (user.emailVerificationExpiry < new Date()) {
    throw new AppError("Verification token has expired", 400, "TOKEN_EXPIRED");
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpiry = null;
  await user.save();

  return { message: "Email verified successfully" };
}

async function resendVerificationEmail({ email }) {
  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal whether email exists (security)
    return { message: "If email exists, verification link sent" };
  }

  if (user.isEmailVerified) {
    throw new AppError("Email already verified", 400, "ALREADY_VERIFIED");
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpiry = verificationExpiry;
  await user.save();

  const emailResult = await enqueueEmail("verification", {
    to: user.email,
    name: user.name,
    verificationToken,
  });

  if (!emailResult.queued && !emailResult.sent) {
    throw new AppError("Failed to send verification email", 502, "EMAIL_SEND_FAILED");
  }

  return {
    message: emailResult.queued
      ? "Verification email queued. It may take a few moments to arrive."
      : "Verification link sent to your email",
  };
}

module.exports = {
  register,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  toSafeUser,
};
