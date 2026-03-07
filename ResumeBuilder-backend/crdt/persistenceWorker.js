import { Worker } from 'bullmq';
import Resume from '../models/resumeDatamodel.js';
import { documentManager } from './DocumentManager.js';

/**
 * Start the BullMQ worker that persists dirty Y.Doc state to MongoDB.
 * Each job carries { resumeId }.  The worker:
 *   1. Reads the in-memory Y.Doc via DocumentManager
 *   2. Encodes binary state  (yjsState)
 *   3. Extracts plain JSON    (resumeData, globalStyles, selectedTemplate)
 *   4. Writes both to MongoDB in a single update
 *
 * @param {import('ioredis').RedisOptions} redisOpts - ioredis connection options for BullMQ
 */
export function startPersistenceWorker(redisOpts) {
  const worker = new Worker(
    'yjs-persist',
    async (job) => {
      const { resumeId } = job.data;

      const state = documentManager.encodeState(resumeId);
      if (!state) return; // doc already evicted

      const json = documentManager.toJSON(resumeId);
      if (!json) return;

      await Resume.updateOne(
        { id: resumeId },
        {
          $set: {
            yjsState: Buffer.from(state),
            resumeData: json.resumeData,
            globalStyles: json.globalStyles,
            selectedTemplate: json.selectedTemplate,
          },
        }
      );
    },
    { connection: redisOpts, concurrency: 5 }
  );

  worker.on('failed', (job, err) => {
    console.error(`[Persist Worker] Job ${job?.id} failed for resume ${job?.data?.resumeId}:`, err.message);
  });

  return worker;
}
