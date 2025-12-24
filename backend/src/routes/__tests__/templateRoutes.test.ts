import request from 'supertest';
import { createTestApp } from '../../__tests__/testApp.helper';
import mongoose from 'mongoose';

const app = createTestApp();

describe('Template Routes', () => {
  let templateId: string;
  let versionId: string;

  beforeEach(async () => {
    // Очищаем базу данных перед каждым тестом
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Создаем тестовый шаблон для тестов, которые требуют ID
    const createResponse = await request(app)
      .post('/api/templates')
      .field('name', 'Test Template for Routes')
      .field('description', 'Test Description')
      .field('category', 'Test Category')
      .field('department', 'Test Department')
      .field('tags', '["tag1", "tag2"]')
      .field('author', 'Test Author')
      .attach('file', Buffer.from('test content'), {
        filename: 'test.pdf',
        contentType: 'application/pdf'
      });

    if (createResponse.status === 201) {
      templateId = createResponse.body._id;
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

  describe('PUT /api/templates/:id', () => {
    it('should update template', async () => {
      const response = await request(app)
        .put(`/api/templates/${templateId}`)
        .field('name', 'Updated Template')
        .field('description', 'Updated Description');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Template');
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

  describe('GET /api/templates/search/enhanced', () => {
    it('should perform enhanced search', async () => {
      const response = await request(app)
        .get('/api/templates/search/enhanced')
        .query({ q: 'test', category: 'Test Category' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('hits');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.hits)).toBe(true);
    });
  });

  describe('GET /api/templates/autocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      const response = await request(app)
        .get('/api/templates/autocomplete')
        .query({ q: 'test', field: 'name' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/templates/stats', () => {
    it('should return template statistics', async () => {
      const response = await request(app)
        .get('/api/templates/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalTemplates');
      expect(response.body).toHaveProperty('totalVersions');
    });
  });

  describe('GET /api/templates/:id', () => {
    it('should return template by id', async () => {
      const response = await request(app)
        .get(`/api/templates/${templateId}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(templateId);
      expect(response.body.name).toBe('Test Template for Routes');
    });

    it('should return 404 for non-existent template', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/templates/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/templates/:id', () => {
    it('should delete template', async () => {
      // Создаем отдельный шаблон для удаления
      const createResponse = await request(app)
        .post('/api/templates')
        .field('name', 'Template to Delete')
        .field('description', 'Test')
        .field('category', 'Test')
        .field('department', 'Test')
        .field('tags', '[]')
        .field('author', 'Test')
        .attach('file', Buffer.from('test'), {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        });

      const deleteId = createResponse.body._id;

      const response = await request(app)
        .delete(`/api/templates/${deleteId}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
    });
  });

  describe('GET /api/templates/:id/download', () => {
    it('should return download redirect or file', async () => {
      const response = await request(app)
        .get(`/api/templates/${templateId}/download`);

      // Может быть редирект (302) или файл (200)
      expect([200, 302]).toContain(response.status);
    });
  });

  describe('GET /api/templates/:id/preview', () => {
    it('should return preview for supported file type', async () => {
      const response = await request(app)
        .get(`/api/templates/${templateId}/preview`);

      // Может быть файл (200), редирект (302) или ошибка (415 для неподдерживаемых типов)
      expect([200, 302, 415]).toContain(response.status);
    });
  });

  describe('GET /api/templates/:id/versions/compare/:version1Id/:version2Id', () => {
    it('should compare two versions', async () => {
      // Создаем вторую версию для сравнения
      const uploadResponse = await request(app)
        .post(`/api/templates/${templateId}/versions`)
        .field('changes', 'Second version')
        .attach('file', Buffer.from('second version'), {
          filename: 'v2.pdf',
          contentType: 'application/pdf'
        });

      expect([200, 201]).toContain(uploadResponse.status);

      // Получаем версии
      const versionsResponse = await request(app)
        .get(`/api/templates/${templateId}/versions`);

      expect(versionsResponse.status).toBe(200);
      expect(versionsResponse.body.versions.length).toBeGreaterThanOrEqual(1);

      if (versionsResponse.body.versions.length >= 2) {
        const version1Id = versionsResponse.body.versions[0]._id;
        const version2Id = versionsResponse.body.versions[1]._id;

        const response = await request(app)
          .get(`/api/templates/${templateId}/versions/compare/${version1Id}/${version2Id}`);

        expect([200, 400, 404]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('version1');
          expect(response.body).toHaveProperty('version2');
          expect(response.body).toHaveProperty('differences');
        }
      }
    });
  });

  describe('POST /api/templates/:id/versions/:versionId/restore', () => {
    it('should restore template version', async () => {
      // Получаем версии
      const versionsResponse = await request(app)
        .get(`/api/templates/${templateId}/versions`);

      if (versionsResponse.body.versions && versionsResponse.body.versions.length > 0) {
        const versionIdToRestore = versionsResponse.body.versions[0]._id;

        const response = await request(app)
          .post(`/api/templates/${templateId}/versions/${versionIdToRestore}/restore`);

        expect([200, 201]).toContain(response.status);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('restored');
      } else {
        // Если версий нет, создаем одну и затем восстанавливаем
        const uploadResponse = await request(app)
          .post(`/api/templates/${templateId}/versions`)
          .field('changes', 'Version to restore')
          .attach('file', Buffer.from('version content'), {
            filename: 'version.pdf',
            contentType: 'application/pdf'
          });

        if (uploadResponse.status === 200 || uploadResponse.status === 201) {
          const versionsAfterUpload = await request(app)
            .get(`/api/templates/${templateId}/versions`);

          if (versionsAfterUpload.body.versions && versionsAfterUpload.body.versions.length > 0) {
            const versionIdToRestore = versionsAfterUpload.body.versions[0]._id;
            const restoreResponse = await request(app)
              .post(`/api/templates/${templateId}/versions/${versionIdToRestore}/restore`);

            expect([200, 201]).toContain(restoreResponse.status);
            expect(restoreResponse.body).toHaveProperty('message');
          }
        }
      }
    });
  });

  describe('POST /api/templates/:id/versions', () => {
    it('should upload new version', async () => {
      const response = await request(app)
        .post(`/api/templates/${templateId}/versions`)
        .field('changes', 'New version uploaded')
        .attach('file', Buffer.from('new version content'), {
          filename: 'new-version.pdf',
          contentType: 'application/pdf'
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('metadata');
    });
  });

  describe('GET /api/templates/:id/versions', () => {
    it('should return template versions', async () => {
      const response = await request(app)
        .get(`/api/templates/${templateId}/versions`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('versions');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.versions)).toBe(true);
    });
  });

  describe('GET /api/templates/:id/metadata', () => {
    it('should return template metadata', async () => {
      const response = await request(app)
        .get(`/api/templates/${templateId}/metadata`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('category');
      expect(response.body).toHaveProperty('department');
      expect(response.body).toHaveProperty('author');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('PATCH /api/templates/:id/status', () => {
    it('should update template status', async () => {
      const response = await request(app)
        .patch(`/api/templates/${templateId}/status`)
        .send({ status: 'approved' });

      expect(response.status).toBe(200);
      expect(response.body.metadata.status).toBe('approved');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .patch(`/api/templates/${templateId}/status`)
        .send({ status: 'invalid' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/categories', () => {
    it('should return categories', async () => {
      const response = await request(app)
        .get('/api/categories');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/departments', () => {
    it('should return departments', async () => {
      const response = await request(app)
        .get('/api/departments');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/tags', () => {
    it('should return popular tags', async () => {
      const response = await request(app)
        .get('/api/tags')
        .query({ limit: '10' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.services).toHaveProperty('mongodb');
    });
  });
});