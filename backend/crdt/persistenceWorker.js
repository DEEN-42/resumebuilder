import { Worker } from 'bullmq';
import Resume from '../models/resumeDatamodel.js';
import { documentManager } from './DocumentManager.js';

const C = '\x1b[36m'; // cyan
const R = '\x1b[0m';  // reset
const log  = (...a) => console.log(`${C}[Persist Worker]${R}`, ...a);
const lerr = (...a) => console.error(`${C}[Persist Worker]${R}`, ...a);

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
      log(`Job ${job.id} started → resumeId: ${resumeId}`);

      const state = documentManager.encodeState(resumeId);
      if (!state) {
        log(`Job ${job.id} skipped — doc already evicted (resumeId: ${resumeId})`);
        return;
      }

      const json = documentManager.toJSON(resumeId);
      if (!json) {
        log(`Job ${job.id} skipped — toJSON returned null (resumeId: ${resumeId})`);
        return;
      }

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

      log(`Job ${job.id} completed — persisted resumeId: ${resumeId} (yjsState: ${state.byteLength}B)`);
    },
    { connection: redisOpts, concurrency: 5 }
  );

  worker.on('failed', (job, err) => {
    lerr(`Job ${job?.id} failed — resumeId: ${job?.data?.resumeId}:`, err.message);
  });

  return worker;
}
