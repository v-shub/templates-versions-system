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

const app = express();
const server = http.createServer(app);

// CORS origins for HTTP and WebSocket
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3001,http://localhost:3000').split(',').filter(Boolean);

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
elasticsearchService.createIndexIfNotExists().catch(console.error);

// Routes (auth public, templates protected by JWT)
app.use('/api/auth', authRoutes);
app.use('/api', protect, templateRoutes);

// Health check route с проверкой Elasticsearch
app.get('/health', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const elasticsearchStatus = await elasticsearchService.healthCheck() ? 'connected' : 'disconnected';
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoStatus,
      elasticsearch: elasticsearchStatus
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Socket.io for real-time template change notifications
const io = new SocketIOServer(server, {
  cors: { origin: corsOrigins, credentials: true },
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log('WebSocket client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('WebSocket client disconnected:', socket.id);
  });
});

// Подключение к MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/template-manager';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
});

export default app;