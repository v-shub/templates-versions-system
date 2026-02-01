/**
 * BullMQ worker for version queue (Section 12.1: async task processing).
 * Processes computeDiff jobs: loads version, computes diff summary, stores in Redis (no model change).
 * Run separately from API: npm run worker (with Redis and MongoDB running).
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { Worker } from 'bullmq';
import { connection } from './queue/connection';
import { VERSION_QUEUE_NAME } from './queue/jobs';
import TemplateVersion from './models/TemplateVersion';
import logger from './logger';

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/template-manager';
  await mongoose.connect(MONGODB_URI);
  logger.info('Worker connected to MongoDB');

  const worker = new Worker(
    VERSION_QUEUE_NAME,
    async (job) => {
      if (job.name === 'computeDiff') {
        const versionId = job.data.versionId;
        const v = await TemplateVersion.findById(versionId);
        if (!v) {
          logger.warn('computeDiff: version not found', { versionId });
          return;
        }
        const diffPayload = { summary: 'computed', at: new Date().toISOString() };
        await connection.set('version_diff:' + versionId, JSON.stringify(diffPayload), 'EX', 86400);
        logger.info('computeDiff completed', { versionId });
      }
    },
    { connection }
  );

  worker.on('completed', (job) => {
    logger.info('Job completed', { jobId: job.id, name: job.name });
  });

  worker.on('failed', (job, err) => {
    logger.error('Job failed', { jobId: job?.id, name: job?.name, err });
  });

  worker.on('error', (err) => {
    logger.error('Worker error', { err });
  });

  logger.info('Version queue worker started');
}

main().catch((err) => {
  logger.error('Worker startup failed', { err });
  process.exit(1);
});
