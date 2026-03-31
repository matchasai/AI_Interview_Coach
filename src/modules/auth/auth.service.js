const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { env } = require("../../config/env");
const { AppError } = require("../../utils/AppError");
const { User } = require("./user.model");

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

  const user = await User.create({
    name,
    email,
    password: hashed,
    role: "user",
  });

  const token = signToken(user);
  return { token, user: toSafeUser(user) };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
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

  // In production, send email here. For now, just log it.
  console.log(`[MOCK EMAIL] Password reset link: ${resetToken}`);
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

module.exports = {
  register,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  toSafeUser,
};
