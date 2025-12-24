// src/models/__tests__/Template.test.ts
import mongoose from 'mongoose';
import Template from '../Template';
import TemplateVersion from '../TemplateVersion';

describe('Template Model', () => {
  describe('create', () => {
    it('should create a template successfully', async () => {
      const templateData = {
        name: 'Test Template',
        description: 'Test Description',
        category: 'Test Category',
        department: 'Test Department',
        tags: ['tag1', 'tag2'],
        file: {
          originalName: 'test.pdf',
          storedName: '123-test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/file.pdf',
          checksum: 'abc123'
        },
        metadata: {
          author: 'Test Author',
          version: 1,
          status: 'draft' as const,
          lastModified: new Date(),
          checksum: 'abc123'
        }
      };

      const template = new Template(templateData);
      await template.save();

      expect(template._id).toBeDefined();
      expect(template.name).toBe(templateData.name);
      expect(template.metadata.status).toBe('draft');
      expect(template.metadata.version).toBe(1);
    });
  });

  describe('validation', () => {
    it('should fail without required fields', async () => {
      const template = new Template({
        // Отсутствуют обязательные поля
      });

      let error;
      try {
        await template.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
    });

    it('should validate status enum', async () => {
      const template = new Template({
        name: 'Test',
        description: 'Test',
        category: 'Test',
        department: 'Test',
        tags: [],
        file: {
          originalName: 'test.pdf',
          storedName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/test.pdf',
          checksum: 'test'
        },
        metadata: {
          author: 'Test',
          version: 1,
          status: 'invalid_status', // Неверный статус
          lastModified: new Date(),
          checksum: 'test'
        }
      });

      let error;
      try {
        await template.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
    });
  });
});

describe('TemplateVersion Model', () => {
  describe('create', () => {
    it('should create a template version successfully', async () => {
      const templateId = new mongoose.Types.ObjectId();
      const versionData = {
        templateId,
        version: 1,
        changes: 'Initial version',
        file: {
          originalName: 'test.pdf',
          storedName: '123-test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/file.pdf',
          checksum: 'abc123'
        },
        metadata: {
          author: 'Test Author',
          status: 'draft',
          created: new Date()
        }
      };

      const version = new TemplateVersion(versionData);
      await version.save();

      expect(version._id).toBeDefined();
      expect(version.templateId).toEqual(templateId);
      expect(version.version).toBe(1);
      expect(version.changes).toBe('Initial version');
    });
  });
});