import request from 'supertest';
import { createTestApp } from '../../__tests__/testApp.helper';
import mongoose from 'mongoose';

const app = createTestApp();

describe('Template Routes', () => {
  beforeEach(async () => {
    // Очищаем базу данных перед каждым тестом
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('POST /api/templates', () => {
    it('should create a new template', async () => {
      const response = await request(app)
        .post('/api/templates')
        .field('name', 'Test Template')
        .field('description', 'Test Description')
        .field('category', 'Test Category')
        .field('department', 'Test Department')
        .field('tags', '["tag1", "tag2"]')
        .attach('file', Buffer.from('test content'), {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe('Test Template');
    });
  });

  describe('GET /api/templates', () => {
    it('should return all templates', async () => {
      const response = await request(app)
        .get('/api/templates');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('templates');
      expect(response.body).toHaveProperty('total');
    });
  });

  describe('GET /api/templates/search', () => {
    it('should search templates', async () => {
      const response = await request(app)
        .get('/api/templates/search')
        .query({ q: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.services).toHaveProperty('mongodb');
    });
  });
});