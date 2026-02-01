/**
 * BullMQ version queue. Jobs are added when a new template version is created (computeDiff).
 * Section 12.1: async task processing.
 */

import { Queue } from 'bullmq';
import { connection } from './connection';

const queueName = 'versionQueue';

export const versionQueue = new Queue(queueName, { connection });

export const VERSION_QUEUE_NAME = queueName;
