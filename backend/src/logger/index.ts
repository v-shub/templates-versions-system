/**
 * Structured logging with file rotation (Ch. 11 — team3_advanced_guide).
 * Levels: debug, info, warn, error. JSON format for parsing; daily rotate to logs/.
 */
import fs from 'fs';
import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logLevel = process.env.LOG_LEVEL || 'info';
const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

try {
  fs.mkdirSync(logDir, { recursive: true });
} catch {
  // ignore; file transport may still work or fall back to console
}

const fileTransport = new DailyRotateFile({
  filename: path.join(logDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '5d',
});

const logger = winston.createLogger({
  level: logLevel,
  defaultMeta: { service: 'template-version-control' },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    fileTransport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        })
      ),
    }),
  ],
});

export default logger;
