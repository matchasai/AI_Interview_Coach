const nodemailer = require("nodemailer");
const { env } = require("../../config/env");

let sharedTransporter = null;

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

function logNonProduction(message) {
  if (env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(message);
  }
}

function extractEmailAddress(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/<([^>]+)>/);
  if (match && match[1]) {
    return match[1].trim().toLowerCase();
  }

  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  return "";
}

function resolveFromAddress() {
  const smtpUser = extractEmailAddress(env.SMTP_USER);
  const configuredFromEmail = extractEmailAddress(env.EMAIL_FROM);
  const configuredFromRaw = typeof env.EMAIL_FROM === "string" ? env.EMAIL_FROM.trim() : "";

  const canUseConfiguredFrom =
    configuredFromEmail &&
    (env.NODE_ENV !== "production" || configuredFromEmail === smtpUser);

  const senderEmail = canUseConfiguredFrom
    ? configuredFromEmail
    : (smtpUser || configuredFromEmail || "testingexample70@gmail.com");

  const from =
    canUseConfiguredFrom && configuredFromRaw
      ? configuredFromRaw
      : `IntervAI Coach <${senderEmail}>`;

  return {
    from,
    envelopeFrom: senderEmail,
    replyTo: senderEmail,
  };
}

function createTransport() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    tls: {
      servername: env.SMTP_HOST,
      minVersion: "TLSv1.2",
    },
  });
}

function getTransporter() {
  if (!sharedTransporter) {
    sharedTransporter = createTransport();
  }
  return sharedTransporter;
}

function resetTransporter() {
  sharedTransporter = null;
}

function shouldVerifyBeforeSend() {
  return String(process.env.SMTP_VERIFY_BEFORE_SEND || "false").toLowerCase() === "true";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isRecipientAccepted(response, to) {
  const target = normalizeEmail(to);
  const accepted = Array.isArray(response?.accepted)
    ? response.accepted.map((entry) => normalizeEmail(entry))
    : [];
  const rejected = Array.isArray(response?.rejected)
    ? response.rejected.map((entry) => normalizeEmail(entry))
    : [];

  if (rejected.includes(target)) return false;
  if (accepted.length === 0) return false;
  if (!target) return accepted.length > 0;
  return accepted.includes(target);
}

async function maybeVerifyTransport(transporter, to) {
  if (!shouldVerifyBeforeSend()) {
    return { ok: true };
  }
  return verifyTransport(transporter, to);
}

  async function verifyTransport(transporter, to) {
    try {
      await transporter.verify();
      return { ok: true };
    } catch (error) {
      console.error(`[EMAIL] SMTP verify failed for ${to}:`, {
        message: error.message,
        code: error.code,
        responseCode: error.responseCode,
        command: error.command,
      });
      return {
        ok: false,
        reason: error.message || 'smtp-verify-failed',
      };
    }
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
  const sender = resolveFromAddress();

  if (!hasSmtpConfig() || env.EMAIL_PROVIDER !== "smtp") {
    logNonProduction(`[DEV EMAIL LOG] Password reset link for ${to}: ${resetLink}`);
    return { delivered: false, reason: "smtp-not-configured", resetLink };
  }

  try {
    const transporter = getTransporter();
    const verified = await maybeVerifyTransport(transporter, to);
    if (!verified.ok) {
      return { delivered: false, reason: verified.reason, resetLink };
    }
    const response = await transporter.sendMail({
      from: sender.from,
      to,
      envelope: { from: sender.envelopeFrom, to },
      replyTo: sender.replyTo,
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
    if (!isRecipientAccepted(response, to)) {
      return { delivered: false, reason: "recipient-rejected", resetLink };
    }
    logNonProduction(`[EMAIL] Password reset sent to ${to}, messageId: ${response.messageId}`);
    return { delivered: true, resetLink };
  } catch (error) {
    resetTransporter();
    console.error(`[EMAIL] Password reset send failed for ${to}:`, error.message);
    return { delivered: false, reason: error.message, resetLink };
  }
}

async function sendVerificationEmail({ to, name, verificationToken }) {
  const verificationLink = `${resolveFrontendBaseUrl()}/verify-email/${verificationToken}`;
  const sender = resolveFromAddress();

  if (!hasSmtpConfig() || env.EMAIL_PROVIDER !== "smtp") {
    logNonProduction(`[DEV EMAIL LOG] Email verification link for ${to}: ${verificationLink}`);
    return { delivered: false, reason: "smtp-not-configured", verificationLink };
  }

  try {
    const transporter = getTransporter();
    const verified = await maybeVerifyTransport(transporter, to);
    if (!verified.ok) {
      return { delivered: false, reason: verified.reason, verificationLink };
    }
    const response = await transporter.sendMail({
      from: sender.from,
      to,
      envelope: { from: sender.envelopeFrom, to },
      replyTo: sender.replyTo,
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
    if (!isRecipientAccepted(response, to)) {
      return { delivered: false, reason: "recipient-rejected", verificationLink };
    }
    logNonProduction(`[EMAIL] Verification sent to ${to}, messageId: ${response.messageId}`);
    return { delivered: true, verificationLink };
  } catch (error) {
    resetTransporter();
    console.error(`[EMAIL] Verification send failed for ${to}:`, {
      message: error.message,
      code: error.code,
      responseCode: error.responseCode,
      command: error.command,
    });
    return { delivered: false, reason: error.message, verificationLink };
  }
}

async function sendPracticeReminderEmail({ to, name, guideSummary, topFocusAreas = [], dashboardLink }) {
  const link = `${resolveFrontendBaseUrl()}${dashboardLink || '/dashboard'}`;
  const sender = resolveFromAddress();

  if (!hasSmtpConfig() || env.EMAIL_PROVIDER !== "smtp") {
    logNonProduction(`[DEV EMAIL LOG] Practice reminder for ${to}: ${guideSummary || 'Practice today'} -> ${link}`);
    return { delivered: false, reason: "smtp-not-configured", reminderLink: link };
  }

  try {
    const focusItems = Array.isArray(topFocusAreas) && topFocusAreas.length
      ? topFocusAreas.slice(0, 3).map((item) => `<li style="margin-bottom:8px;"><strong>${item.role}</strong>: ${item.focus}</li>`).join('')
      : '<li style="margin-bottom:8px;">Review your last interview and repeat the hardest 3 questions.</li>';

    const transporter = getTransporter();
    const verified = await maybeVerifyTransport(transporter, to);
    if (!verified.ok) {
      return { delivered: false, reason: verified.reason, reminderLink: link };
    }
    const response = await transporter.sendMail({
      from: sender.from,
      to,
      envelope: { from: sender.envelopeFrom, to },
      replyTo: sender.replyTo,
      subject: "Your IntervAI Coach practice reminder",
      text: [
        `Hi ${name || 'there'},`,
        guideSummary || 'Time for a short practice session.',
        `Open your dashboard: ${link}`,
        'Use the weak areas shown there to pick your next practice topic.',
      ].join("\n"),
      html: emailShell({
        title: "Practice Reminder",
        preheader: "A quick reminder to keep your interview practice on track.",
        bodyHtml: [
          `<p>Hi <strong>${name || 'there'}</strong>,</p>`,
          `<p>${guideSummary || 'Time for a short practice session.'}</p>`,
          '<p>Your current focus areas:</p>',
          `<ul style="padding-left:18px;margin:12px 0 0 0;">${focusItems}</ul>`,
          '<p style="margin-top:16px;">Keep the streak going with one focused interview session today.</p>',
        ].join(''),
        ctaText: 'Open Dashboard',
        ctaHref: link,
        note: 'Practice reminders help you revisit weak areas and improve consistently.',
      }),
    });
    if (!isRecipientAccepted(response, to)) {
      return { delivered: false, reason: "recipient-rejected", reminderLink: link };
    }
    logNonProduction(`[EMAIL] Practice reminder sent to ${to}, messageId: ${response.messageId}`);
    return { delivered: true, reminderLink: link };
  } catch (error) {
    resetTransporter();
    console.error(`[EMAIL] Practice reminder send failed for ${to}:`, error.message);
    return { delivered: false, reason: error.message, reminderLink: link };
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendPracticeReminderEmail,
  hasSmtpConfig,
  verifyTransport,
};
