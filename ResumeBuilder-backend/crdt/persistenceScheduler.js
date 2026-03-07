import { Queue } from 'bullmq';
import { documentManager } from './DocumentManager.js';

const FLUSH_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Start the periodic scheduler that checks for dirty Y.Docs
 * and enqueues BullMQ jobs to persist them to MongoDB.
 *
 * @param {import('ioredis').RedisOptions} redisOpts
 * @returns {{ queue: Queue, stop: () => void }}
 */
export function startPersistenceScheduler(redisOpts) {
  const queue = new Queue('yjs-persist', { connection: redisOpts });

  const intervalId = setInterval(async () => {
    const dirtyIds = documentManager.flushDirtyIds();
    for (const resumeId of dirtyIds) {
      await queue.add('persist', { resumeId }, {
        // De-duplicate: if a job for this resume is already waiting, skip
        jobId: `persist-${resumeId}`,
        removeOnComplete: true,
        removeOnFail: 50,
      });
    }
  }, FLUSH_INTERVAL_MS);

  const stop = () => {
    clearInterval(intervalId);
    queue.close();
  };

  return { queue, stop };
}
