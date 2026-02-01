/**
 * Prometheus metrics and request middleware (Ch. 11 — team3_advanced_guide).
 */
import { Request, Response, NextFunction } from 'express';
import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();

const requestCount = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'endpoint', 'status'],
  registers: [register],
});

const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'endpoint'],
  registers: [register],
});

collectDefaultMetrics({ register });

function normalizeEndpoint(path: string | undefined): string {
  if (!path || path === '/') return '/';
  const parts = path.split('/').filter(Boolean);
  const normalized = parts.map((p) => (/^[0-9a-fA-F-]{24}$/.test(p) ? ':id' : p)).join('/');
  return '/' + normalized;
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    try {
      const durationSec = (Date.now() - start) / 1000;
      const status = String(res.statusCode ?? 0);
      const pathOnly = req.path ?? (req.originalUrl ?? '/').toString().split('?')[0];
      const endpoint = normalizeEndpoint(pathOnly);
      const method = req.method ?? 'UNKNOWN';
      requestCount.labels(method, endpoint, status).inc();
      requestDuration.labels(method, endpoint).observe(durationSec);
    } catch (_e) {
      // never let metrics break the response
    }
  });

  next();
}

export async function getMetrics(): Promise<string> {
  return register.metrics();
}

export function getContentType(): string {
  return register.contentType;
}
