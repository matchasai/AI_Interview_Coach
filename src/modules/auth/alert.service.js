const {
  sendPasswordResetEmail,
  sendPracticeReminderEmail,
  sendVerificationEmail,
} = require("./email.service");

const DEFAULT_RETRY_ATTEMPTS = 2;
const RETRY_BASE_DELAY_MS = 350;

const alertStats = {
  sent: 0,
  failed: 0,
  retried: 0,
  lastSentAt: null,
  lastFailureAt: null,
  lastError: null,
};

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function dispatchWithRetry(sendFn, payload, type, attempts = DEFAULT_RETRY_ATTEMPTS) {
  let lastFailure = null;

  for (let i = 1; i <= attempts; i += 1) {
    try {
      const result = await sendFn(payload);
      if (result && result.delivered === true) {
        alertStats.sent += 1;
        alertStats.lastSentAt = new Date();
        return {
          sent: true,
          attempts: i,
          type,
          result,
        };
      }

      const reason = result?.reason || "not-delivered";
      throw new Error(reason);
    } catch (error) {
      lastFailure = error;
      alertStats.retried += 1;
      if (i < attempts) {
        const delay = RETRY_BASE_DELAY_MS * i;
        await wait(delay);
      }
    }
  }

  alertStats.failed += 1;
  alertStats.lastFailureAt = new Date();
  alertStats.lastError = lastFailure?.message || "unknown-error";

  return {
    sent: false,
    attempts,
    type,
    reason: lastFailure?.message || "unknown-error",
  };
}

async function sendVerificationAlert(payload) {
  return dispatchWithRetry(sendVerificationEmail, payload, "verification");
}

async function sendPasswordResetAlert(payload) {
  return dispatchWithRetry(sendPasswordResetEmail, payload, "password-reset");
}

async function sendPracticeReminderAlert(payload) {
  return dispatchWithRetry(sendPracticeReminderEmail, payload, "practice-reminder");
}

function getAlertStatus() {
  return { ...alertStats };
}

module.exports = {
  sendVerificationAlert,
  sendPasswordResetAlert,
  sendPracticeReminderAlert,
  getAlertStatus,
};
