const nodemailer = require("nodemailer");
const { env } = require("../../config/env");

function hasSmtpConfig() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM);
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

async function sendPasswordResetEmail({ to, resetToken }) {
  const resetLink = `${env.FRONTEND_URL.replace(/\/$/, "")}/reset-password/${resetToken}`;

  if (!hasSmtpConfig() || env.EMAIL_PROVIDER !== "smtp") {
    console.log(`[DEV EMAIL LOG] Password reset link for ${to}: ${resetLink}`);
    return { delivered: false, reason: "smtp-not-configured", resetLink };
  }

  const transporter = createTransport();

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: "Reset your AI Interview Coach password",
    text: [
      "We received a request to reset your password.",
      `Reset link: ${resetLink}`,
      "This link expires in 1 hour.",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: [
      "<p>We received a request to reset your password.</p>",
      `<p><a href=\"${resetLink}\">Click here to reset password</a></p>`,
      "<p>This link expires in 1 hour.</p>",
      "<p>If you did not request this, you can ignore this email.</p>",
    ].join(""),
  });

  return { delivered: true, resetLink };
}

module.exports = {
  sendPasswordResetEmail,
};
