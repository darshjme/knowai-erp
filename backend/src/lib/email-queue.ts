import { sendEmail } from "./email";
import { logger } from "./logger";

interface EmailJob {
  id: string;
  to: string;
  subject: string;
  html: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  status: "pending" | "sent" | "failed";
  lastError?: string;
}

const queue: EmailJob[] = [];
let processing = false;
const MAX_QUEUE_SIZE = 1000;

export function enqueueEmail(to: string, subject: string, html: string, maxAttempts = 3): string {
  const id = `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (queue.length >= MAX_QUEUE_SIZE) {
    // Remove oldest completed/failed jobs
    const activeJobs = queue.filter(j => j.status === "pending");
    queue.length = 0;
    queue.push(...activeJobs);
  }

  queue.push({ id, to, subject, html, attempts: 0, maxAttempts, createdAt: new Date(), status: "pending" });
  processQueue(); // Start processing if not already running
  return id;
}

async function processQueue() {
  if (processing) return;
  processing = true;

  while (true) {
    const job = queue.find(j => j.status === "pending");
    if (!job) break;

    job.attempts++;
    try {
      await sendEmail(job.to, job.subject, job.html);
      job.status = "sent";
      logger.info({ jobId: job.id, to: job.to }, "Email sent successfully");
    } catch (err: any) {
      job.lastError = err.message;
      if (job.attempts >= job.maxAttempts) {
        job.status = "failed";
        logger.error({ jobId: job.id, to: job.to, attempts: job.attempts, error: err.message }, "Email failed permanently");
      } else {
        // Exponential backoff: wait before retry
        const delay = Math.min(1000 * Math.pow(2, job.attempts), 30000);
        await new Promise(r => setTimeout(r, delay));
        logger.warn({ jobId: job.id, to: job.to, attempt: job.attempts }, "Email retry scheduled");
      }
    }
  }

  processing = false;
}

export function getQueueStatus() {
  return {
    total: queue.length,
    pending: queue.filter(j => j.status === "pending").length,
    sent: queue.filter(j => j.status === "sent").length,
    failed: queue.filter(j => j.status === "failed").length,
  };
}
