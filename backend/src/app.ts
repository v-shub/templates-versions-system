import 'dotenv/config';
import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import templateRoutes from './routes/templateRoutes';
import authRoutes from './routes/authRoutes';
import { protect } from './middleware/auth';
import { ElasticsearchService } from './services/ElasticsearchService';
import { setupSwagger } from './swagger';
import logger from './logger';
import { metricsMiddleware, getMetrics, getContentType } from './monitoring/metrics';

const app = express();
const server = http.createServer(app);

// CORS origins for HTTP and WebSocket (from .env)
const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost,http://localhost:3001,http://localhost:3000').split(',').filter(Boolean);

// Prometheus metrics (before routes so every request is timed)
app.use(metricsMiddleware);

// Middleware (Authorization for JWT)
app.use(cors({ origin: corsOrigins, allowedHeaders: ['Content-Type', 'Authorization'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for local storage
app.use('/files', express.static('uploads'));

// Swagger Documentation
setupSwagger(app);

// Инициализация Elasticsearch
const elasticsearchService = new ElasticsearchService();
elasticsearchService.createIndexIfNotExists().catch((err) => logger.error('Elasticsearch createIndexIfNotExists failed', { err, context: 'Elasticsearch createIndex' }));

// Metrics endpoint (Prometheus scrape)
app.get('/metrics', async (_req, res) => {
  try {
    res.setHeader('Content-Type', getContentType());
    res.end(await getMetrics());
  } catch (err) {
    logger.error('metrics export failed', { err });
    res.status(500).end();
  }
});

// Routes (auth public, templates protected by JWT)
app.use('/api/auth', authRoutes);
app.use('/api', protect, templateRoutes);

// Health check route с проверкой Elasticsearch (Ch. 11 — healthy/unhealthy)
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const elasticsearchOk = await elasticsearchService.healthCheck().catch(() => false);
  const healthy = mongoOk && elasticsearchOk;

  res.json({
    status: healthy ? 'healthy' : 'unhealthy',
    database: mongoOk ? 'connected' : 'disconnected',
    elasticsearch: elasticsearchOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware (must have 4 args so Express treats it as error handler only)
function errorHandler(err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction): void {
  if (!res.headersSent) {
    // Validation errors (e.g. from express-validator passed to next())
    if (err && typeof err === 'object' && 'array' in err && typeof (err as { array: unknown }).array === 'function') {
      res.status(400).json({
        error: 'Ошибка валидации',
        details: (err as { array: () => unknown[] }).array(),
      });
      return;
    }
    try {
      logger.error(err instanceof Error ? err.message : 'Internal server error', { type: 'error', err });
    } catch {
      // avoid throwing while handling an error
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}
app.use(errorHandler);

// Socket.io for real-time template change notifications
const io = new SocketIOServer(server, {
  cors: { origin: corsOrigins, credentials: true },
});
app.set('io', io);

io.on('connection', (socket) => {
  logger.info('WebSocket client connected', { type: 'ws_connection', socketId: socket.id });
  socket.on('disconnect', () => {
    logger.info('WebSocket client disconnected', { type: 'ws_disconnect', socketId: socket.id });
  });
});

// Подключение к MongoDB (from .env)
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI is required in .env');
mongoose.connect(MONGODB_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch((err) => logger.error('MongoDB connection error', { err }));

const PORT = process.env.PORT ?? '3000';
server.listen(PORT, () => {
  logger.info('Server is running', {
    type: 'server_start',
    port: PORT,
    health: `http://localhost:${PORT}/health`,
    metrics: `http://localhost:${PORT}/metrics`,
    websocket: `ws://localhost:${PORT}`,
  });
});

export default app;