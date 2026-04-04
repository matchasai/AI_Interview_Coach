/**
 * Email queue with exponential backoff retry logic.
 * Allows email sending to fail without blocking user requests.
 */

const { sendPasswordResetEmail, sendPracticeReminderEmail } = require('./email.service');

// In-memory queue (in production, use Bull/BullMQ with Redis)
const emailQueue = [];
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000; // 2 seconds

let queueStats = {
  pending: 0,
  failed: 0,
  retrying: 0,
  processed: 0,
  lastProcessed: null,
};

class EmailJob {
  constructor(type, payload) {
    this.id = `${type}-${Date.now()}-${Math.random()}`;
    this.type = type;
    this.payload = payload;
    this.retries = 0;
    this.maxRetries = MAX_RETRIES;
    this.nextRetryAt = Date.now();
  }

  async execute() {
    try {
      if (this.type === 'password-reset') {
        await sendPasswordResetEmail(this.payload);
      } else if (this.type === 'practice-reminder') {
        await sendPracticeReminderEmail(this.payload);
      }
      return true;
    } catch (error) {
      this.retries += 1;
      if (this.retries >= this.maxRetries) {
        console.error(
          `[EMAIL QUEUE] Job ${this.id} failed after ${this.maxRetries} retries`,
          error.message
        );
        return false; // Give up
      }
      const delay = INITIAL_DELAY_MS * Math.pow(2, this.retries - 1);
      this.nextRetryAt = Date.now() + delay;
      console.warn(
        `[EMAIL QUEUE] Job ${this.id} retry ${this.retries}/${this.maxRetries} in ${delay}ms`
      );
      return null; // Retry
    }
  }
}

// Background worker
let workerRunning = false;
function startWorker() {
  if (workerRunning) return;
  workerRunning = true;

  setInterval(async () => {
    const now = Date.now();
    for (let i = emailQueue.length - 1; i >= 0; i -= 1) {
      const job = emailQueue[i];
      if (job.nextRetryAt <= now) {
        const result = await job.execute();
        if (result === true) {
          emailQueue.splice(i, 1); // Remove from queue on success
          queueStats.processed += 1;
          queueStats.lastProcessed = new Date();
        } else if (result === false) {
          emailQueue.splice(i, 1); // Remove from queue on permanent failure
          queueStats.failed += 1;
        }
        // If result is null, keep job in queue for next retry
      }
    }
    updateQueueStats();
  }, 5000); // Check every 5 seconds
}

function updateQueueStats() {
  queueStats.pending = emailQueue.filter(job => job.retries === 0).length;
  queueStats.retrying = emailQueue.filter(job => job.retries > 0).length;
}

function getQueueStatus() {
  return { ...queueStats };
}

// Start worker on module load
startWorker();

async function enqueueEmail(type, payload) {
  const job = new EmailJob(type, payload);
  emailQueue.push(job);

  // Try immediately first
  const result = await job.execute();
  if (result === true) {
    emailQueue.pop(); // Remove if succeeded
    queueStats.processed += 1;
    queueStats.lastProcessed = new Date();
    return { queued: false, sent: true };
  }
  if (result === false) {
    emailQueue.pop(); // Remove if failed permanently
    queueStats.failed += 1;
    console.error(`[EMAIL QUEUE] Email job failed permanently: ${type}`);
    return { queued: false, sent: false };
  }
  // result === null: will retry in background
  updateQueueStats();
  return { queued: true, sent: false };
}

module.exports = {
  enqueueEmail,
  getQueueStatus,
};
