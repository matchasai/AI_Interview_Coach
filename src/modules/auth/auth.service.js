const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { env } = require("../../config/env");
const { AppError } = require("../../utils/AppError");
const { User } = require("./user.model");
const {
  sendPasswordResetAlert,
  sendVerificationAlert,
} = require("./alert.service");

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

function buildVerificationLink(token) {
  const baseUrl = (env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
  return `${baseUrl}/verify-email/${token}`;
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

  const emailResult = await sendVerificationAlert({
    to: user.email,
    name: user.name,
    verificationToken,
  });

  const verificationLink = buildVerificationLink(verificationToken);

  let message = "Registration successful. Please verify your email.";

  if (emailResult.sent) {
    message = "Registration successful. Verification link sent to your email.";
  } else {
    console.warn(
      `[AUTH] Verification email send failed for ${user.email}: ${emailResult.reason}`
    );
    message = "Registration successful, but verification email failed. Use the link shown in the app to verify.";
  }

  // Don't return auth token yet - user must verify email first
  return { message, user: toSafeUser(user), verificationLink, deliveryStatus: emailResult.sent ? "sent" : "failed" };
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
  const emailResult = await sendPasswordResetAlert({
    to: user.email,
    resetToken,
  });

  if (!emailResult.sent) {
    console.warn(
      `[AUTH] Password reset email send failed for ${user.email}: ${emailResult.reason}`
    );
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

  const emailResult = await sendVerificationAlert({
    to: user.email,
    name: user.name,
    verificationToken,
  });

  const verificationLink = buildVerificationLink(verificationToken);

  if (!emailResult.sent) {
    return {
      message:
        "Verification email provider timed out. Use the verification link shown in the app.",
      deliveryStatus: "failed",
      reason: emailResult.reason || "delivery-error",
      verificationLink,
    };
  }

  return {
    message: "Verification link sent to your email",
    deliveryStatus: "sent",
    verificationLink,
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
