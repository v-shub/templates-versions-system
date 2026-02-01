/**
 * BullMQ queue connection (ioredis). Used by queue/jobs and worker.
 * Section 12.1: async task processing.
 */

import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

connection.on('error', (err) => {
  console.error('Queue Redis connection error:', err);
});

connection.on('connect', () => {
  console.log('Queue Redis connected');
});
