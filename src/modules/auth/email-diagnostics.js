/**
 * Email diagnostics utilities for troubleshooting delivery issues
 */
const nodemailer = require("nodemailer");
const { env } = require("../../config/env");

function hasSmtpConfig() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
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

  return canUseConfiguredFrom && configuredFromRaw
    ? configuredFromRaw
    : `IntervAI Coach <${senderEmail}>`;
}

function createTransport() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    pool: true,
    maxConnections: 3,
    connectionTimeout: 7000,
    greetingTimeout: 7000,
    socketTimeout: 10000,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

/**
 * Get complete diagnostics about email configuration
 */
async function getDiagnostics() {
  const config = {
    nodeEnv: env.NODE_ENV,
    emailProvider: env.EMAIL_PROVIDER,
    hasSmtpConfig: hasSmtpConfig(),
    frontendUrl: env.FRONTEND_URL,
    corsOrigin: env.CORS_ORIGIN,
    smtp: {
      host: env.SMTP_HOST || "(not set)",
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER ? `${env.SMTP_USER.substring(0, 3)}***` : "(not set)",
      from: resolveFromAddress(),
    },
  };

  if (!hasSmtpConfig()) {
    return {
      status: "unconfigured",
      message: "SMTP not configured. Emails will not be sent.",
      config,
      suggestion: "Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables",
    };
  }

  // Try to verify SMTP connection
  try {
    const transporter = createTransport();
    await transporter.verify();
    return {
      status: "healthy",
      message: "SMTP connection verified successfully",
      config,
      suggestion: null,
    };
  } catch (error) {
    const errorMessage = error.message || String(error);
    return {
      status: "error",
      message: `SMTP connection failed: ${errorMessage}`,
      config,
      suggestion: "Check SMTP credentials and firewall rules. Common issues: invalid password, port blocked, or provider requires authentication changes.",
      errorCode: error.code || error.responseCode,
    };
  }
}

/**
 * Send a test email to verify the complete pipeline
 */
async function sendTestEmail(testEmail) {
  if (!hasSmtpConfig()) {
    return {
      success: false,
      message: "SMTP not configured",
      status: "unconfigured",
    };
  }

  try {
    const transporter = createTransport();
    const response = await transporter.sendMail({
      from: resolveFromAddress(),
      to: testEmail,
      subject: "[TEST] AI Interview Coach Email Verification",
      text: "This is a test email from AI Interview Coach. If you received this, email delivery is working correctly.",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Email Delivery Test</h2>
          <p>This is a test email from <strong>AI Interview Coach</strong>.</p>
          <p>If you received this, your email configuration is working correctly.</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Sent at: ${new Date().toISOString()}<br/>
            Message ID: ${response.messageId}
          </p>
        </div>
      `,
    });
    return {
      success: true,
      message: "Test email sent successfully",
      status: "sent",
      messageId: response.messageId,
      sentTo: testEmail,
    };
  } catch (error) {
    return {
      success: false,
      message: `Test email failed: ${error.message || String(error)}`,
      status: "error",
      errorCode: error.code || error.responseCode,
      suggestion: "Check your email address and SMTP configuration",
    };
  }
}

module.exports = {
  getDiagnostics,
  sendTestEmail,
  hasSmtpConfig,
  resolveFromAddress,
};
