import { Queue, QueueEvents } from "bullmq";

let aiQueue;
let queueEvents;

export function initAiQueue(redisOpts) {
  if (!aiQueue) {
    aiQueue = new Queue("ai-tasks", { connection: redisOpts });
    queueEvents = new QueueEvents("ai-tasks", { connection: redisOpts });
  }
}

export async function runAiJob(jobName, payload, dedupId, { timeoutMs = 30000 } = {}) {
  if (!aiQueue || !queueEvents) {
    throw new Error("AI Queue not initialized");
  }

  const job = await aiQueue.add(jobName, payload, {
    deduplication: { id: dedupId, ttl: 15000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  });

  try {
    const result = await job.waitUntilFinished(queueEvents, timeoutMs);
    return result;
  } catch (error) {
    throw new Error(`AI Job failed or timed out: ${error.message}`);
  }
}
