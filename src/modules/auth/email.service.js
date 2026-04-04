const nodemailer = require("nodemailer");
const { env } = require("../../config/env");

function normalizeBaseUrl(value) {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return "";
  return trimmed.replace(/\/+$/, "");
}

function isLocalhostUrl(value) {
  return /localhost|127\.0\.0\.1/i.test(String(value || ""));
}

function resolveFrontendBaseUrl() {
  const frontendUrl = normalizeBaseUrl(env.FRONTEND_URL);
  const corsOrigin = normalizeBaseUrl(env.CORS_ORIGIN);

  if (env.NODE_ENV === "production") {
    if (frontendUrl && !isLocalhostUrl(frontendUrl)) return frontendUrl;
    if (corsOrigin && !isLocalhostUrl(corsOrigin)) return corsOrigin;
  }

  return frontendUrl || corsOrigin || "http://localhost:5173";
}

function hasSmtpConfig() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function resolveFromAddress() {
  return 'IntervAI Coach <noreply@intervai.com>';
}

function createTransport() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

function emailShell({ title, preheader, bodyHtml, ctaText, ctaHref, note }) {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<title>${title}</title>`,
    "</head>",
    '<body style="margin:0;padding:0;background:#f4f6ff;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1f2937;">',
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>`,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">',
    "<tr><td align=\"center\">",
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">',
    '<tr><td style="padding:18px 24px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#ffffff;">',
    '<div style="font-size:14px;opacity:.9;">IntervAI Coach</div>',
    `<div style="font-size:22px;font-weight:700;margin-top:6px;">${title}</div>`,
    "</td></tr>",
    `<tr><td style="padding:22px 24px 8px 24px;font-size:15px;line-height:1.65;">${bodyHtml}</td></tr>`,
    '<tr><td style="padding:12px 24px 6px 24px;">',
    `<a href="${ctaHref}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;text-decoration:none;font-weight:600;padding:11px 18px;border-radius:10px;">${ctaText}</a>`,
    "</td></tr>",
    `<tr><td style="padding:12px 24px 24px 24px;color:#6b7280;font-size:13px;line-height:1.6;">${note}</td></tr>`,
    "</table>",
    '</td></tr></table>',
    "</body>",
    "</html>",
  ].join("");
}

async function sendPasswordResetEmail({ to, resetToken }) {
  const resetLink = `${resolveFrontendBaseUrl()}/reset-password/${resetToken}`;

  if (!hasSmtpConfig() || env.EMAIL_PROVIDER !== "smtp") {
    console.log(`[DEV EMAIL LOG] Password reset link for ${to}: ${resetLink}`);
    return { delivered: false, reason: "smtp-not-configured", resetLink };
  }

  const transporter = createTransport();

  await transporter.sendMail({
    from: resolveFromAddress(),
    to,
    subject: "Reset your AI Interview Coach password",
    text: [
      "We received a request to reset your password.",
      `Reset link: ${resetLink}`,
      "This link expires in 1 hour.",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: emailShell({
      title: "Reset Your Password",
      preheader: "Use this secure link to reset your IntervAI Coach password.",
      bodyHtml: [
        "<p>We received a request to reset your password.</p>",
        "<p>For your security, this link expires in <strong>1 hour</strong>.</p>",
      ].join(""),
      ctaText: "Reset Password",
      ctaHref: resetLink,
      note: "If you did not request this, you can safely ignore this email.",
    }),
  });

  return { delivered: true, resetLink };
}

async function sendVerificationEmail({ to, name, verificationToken }) {
  const verificationLink = `${resolveFrontendBaseUrl()}/verify-email/${verificationToken}`;

  if (!hasSmtpConfig() || env.EMAIL_PROVIDER !== "smtp") {
    console.log(`[DEV EMAIL LOG] Email verification link for ${to}: ${verificationLink}`);
    return { delivered: false, reason: "smtp-not-configured", verificationLink };
  }

  const transporter = createTransport();

  await transporter.sendMail({
    from: resolveFromAddress(),
    to,
    subject: "Verify your AI Interview Coach email",
    text: [
      `Welcome, ${name}!`,
      "Please verify your email to complete registration.",
      `Verification link: ${verificationLink}`,
      "This link expires in 24 hours.",
      "If you did not create this account, you can ignore this email.",
    ].join("\n"),
    html: emailShell({
      title: "Verify Your Email",
      preheader: "Confirm your email and activate your IntervAI Coach account.",
      bodyHtml: [
        `<p>Welcome, <strong>${name}</strong>!</p>`,
        "<p>Thanks for registering. Please verify your email to activate your account.</p>",
        "<p>This verification link expires in <strong>24 hours</strong>.</p>",
      ].join(""),
      ctaText: "Verify Email",
      ctaHref: verificationLink,
      note: "If you did not create this account, you can ignore this email.",
    }),
  });

  return { delivered: true, verificationLink };
}

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
  hasSmtpConfig,
};
