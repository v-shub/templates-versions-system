import request from 'supertest';
import { createTestApp } from './testApp.helper'; 
import mongoose from 'mongoose';

const app = createTestApp();

describe('Template API Integration', () => {
  let templateId: string;

  beforeEach(async () => {
    // Очищаем базу данных перед каждым тестом
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('Complete Template CRUD Flow', () => {
    it('should create, read, update and delete template', async () => {
      // 1. Create
      const createResponse = await request(app)
        .post('/api/templates')
        .field('name', 'Integration Test Template')
        .field('description', 'Integration test description')
        .field('category', 'Integration')
        .field('department', 'Testing')
        .field('author', 'Test Author')
        .attach('file', Buffer.from('test content'), {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        });

      expect(createResponse.status).toBe(201);
      templateId = createResponse.body._id;

      // 2. Read
      const getResponse = await request(app)
        .get(`/api/templates/${templateId}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.name).toBe('Integration Test Template');

      // 3. Update
      const updateResponse = await request(app)
        .put(`/api/templates/${templateId}`)
        .field('name', 'Updated Integration Template')
        .field('status', 'approved')
        .field('author', 'Updated Author');

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe('Updated Integration Template');
      expect(updateResponse.body.metadata.status).toBe('approved');

      // 4. Get versions
      const versionsResponse = await request(app)
        .get(`/api/templates/${templateId}/versions`);

      expect(versionsResponse.status).toBe(200);
      expect(versionsResponse.body.versions.length).toBeGreaterThan(0);

      // 5. Delete
      const deleteResponse = await request(app)
        .delete(`/api/templates/${templateId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toContain('deleted successfully');
    }, 20000); // Увеличиваем таймаут
  });
});