import { TemplateController } from '../TemplateController';
import Template from '../../models/Template';
import TemplateVersion from '../../models/TemplateVersion';
import { Request, Response } from 'express';
import mongoose from 'mongoose';

describe('TemplateController', () => {
  let controller: TemplateController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    controller = new TemplateController();
    mockJson = jest.fn();
    mockStatus = jest.fn(() => ({ json: mockJson }));
    
    mockResponse = {
      status: mockStatus as any,
      json: mockJson as any
    };
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      mockRequest = {
        file: {
          originalname: 'test.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('test'),
          fieldname: 'file',
          encoding: '7bit',
          destination: '',
          filename: 'test.pdf',
          path: ''
        } as Express.Multer.File,
        body: {
          name: 'Test Template',
          description: 'Test Description',
          category: 'Test Category',
          department: 'Test Department',
          tags: '["tag1", "tag2"]',
          author: 'Test Author'
        }
      };

      await controller.createTemplate(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(201);
      
      // Проверяем создание в базе данных
      const templates = await Template.find();
      expect(templates).toHaveLength(1);
      expect(templates[0].name).toBe('Test Template');
    });

    it('should return 400 if no file provided', async () => {
      mockRequest = {
        body: {
          name: 'Test Template'
        }
      };

      await controller.createTemplate(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'File is required' });
    });

    it('should handle tags as array', async () => {
  mockRequest = {
    file: {
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test')
    } as Express.Multer.File,
    body: {
      name: 'Test Template',
      author: 'Test Author',
      description: 'Test',
      category: 'Test',
      department: 'Test'
    }
  };

  // Проверяем несколько форматов tags
  const testCases = [
    { input: '["tag1", "tag2"]', expected: ['tag1', 'tag2'] },
    { input: 'tag1,tag2', expected: ['tag1', 'tag2'] },
    { input: ['tag1', 'tag2'], expected: ['tag1', 'tag2'] }
  ];

  for (const testCase of testCases) {
    mockRequest.body.tags = testCase.input;
    await controller.createTemplate(
      mockRequest as Request,
      mockResponse as Response
    );
    const template = await Template.findOne({ name: 'Test Template' });
    expect(template?.tags).toEqual(testCase.expected);
    
    await Template.deleteMany({ name: 'Test Template' });
  }
});

  describe('getTemplates', () => {
    beforeEach(async () => {
      // Создаем тестовые данные
      await Template.create([
        {
          name: 'Template 1',
          description: 'Desc 1',
          category: 'Category A',
          department: 'Department X',
          tags: ['tag1', 'tag2'],
          file: {
            originalName: 'file1.pdf',
            storedName: 'stored1.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'http://test.com/file1.pdf',
            checksum: 'checksum1'
          },
          metadata: {
            author: 'Author 1',
            version: 1,
            status: 'draft',
            lastModified: new Date(),
            checksum: 'checksum1'
          }
        },
        {
          name: 'Template 2',
          description: 'Desc 2',
          category: 'Category B',
          department: 'Department Y',
          tags: ['tag3'],
          file: {
            originalName: 'file2.pdf',
            storedName: 'stored2.pdf',
            mimeType: 'application/pdf',
            size: 2048,
            url: 'http://test.com/file2.pdf',
            checksum: 'checksum2'
          },
          metadata: {
            author: 'Author 2',
            version: 1,
            status: 'approved',
            lastModified: new Date(),
            checksum: 'checksum2'
          }
        }
      ]);
    });

    it('should return all templates', async () => {
      mockRequest = {
        query: {}
      };

      await controller.getTemplates(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalled();
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.templates).toHaveLength(2);
      expect(responseData.total).toBe(2);
    });

    it('should filter by category', async () => {
      mockRequest = {
        query: { category: 'Category A' }
      };

      await controller.getTemplates(
        mockRequest as Request,
        mockResponse as Response
      );

      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.templates).toHaveLength(1);
      expect(responseData.templates[0].category).toBe('Category A');
    });

    it('should paginate results', async () => {
      mockRequest = {
        query: { page: '1', limit: '1' }
      };

      await controller.getTemplates(
        mockRequest as Request,
        mockResponse as Response
      );

      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.templates).toHaveLength(1);
      expect(responseData.currentPage).toBe(1);
      expect(responseData.totalPages).toBe(2);
    });
  });

  describe('getTemplate', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await Template.create({
        name: 'Test Template',
        description: 'Test Description',
        category: 'Test Category',
        department: 'Test Department',
        tags: ['tag1'],
        file: {
          originalName: 'test.pdf',
          storedName: 'stored.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/file.pdf',
          checksum: 'checksum'
        },
        metadata: {
          author: 'Test Author',
          version: 1,
          status: 'draft',
          lastModified: new Date(),
          checksum: 'checksum'
        }
      });
      templateId = template.id.toString();
    });

    it('should return template by id', async () => {
      mockRequest = {
        params: { id: templateId }
      };

      await controller.getTemplate(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalled();
      const template = mockJson.mock.calls[0][0];
      expect(template.name).toBe('Test Template');
    });

    it('should return 404 if template not found', async () => {
      mockRequest = {
        params: { id: '507f1f77bcf86cd799439011' }
      };

      await controller.getTemplate(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Template not found' });
    });
  });

  describe('updateTemplate', () => {
  let templateId: string;
  let originalTemplate: any;

  beforeEach(async () => {
    // Создаем шаблон с первой версией
    originalTemplate = await Template.create({
      name: 'Original Template',
      description: 'Original Description',
      category: 'Original Category',
      department: 'Original Department',
      tags: ['original'],
      file: {
        originalName: 'original.pdf',
        storedName: 'stored.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        url: 'http://test.com/file.pdf',
        checksum: 'original-checksum'
      },
      metadata: {
        author: 'Original Author',
        version: 1,
        status: 'draft',
        lastModified: new Date(),
        checksum: 'original-checksum'
      }
    });
    
    // Создаем первую версию в TemplateVersion
    await TemplateVersion.create({
      templateId: originalTemplate._id,
      version: 1,
      changes: 'Initial version',
      file: {
        originalName: 'original.pdf',
        storedName: 'stored.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        url: 'http://test.com/file.pdf',
        checksum: 'original-checksum'
      },
      metadata: {
        author: 'Original Author',
        status: 'draft',
        created: new Date()
      }
    });
    
    templateId = originalTemplate._id.toString();
  });

  it('should create new version when file is updated', async () => {
    mockRequest = {
      params: { id: templateId },
      file: {
        originalname: 'new.pdf',
        mimetype: 'application/pdf',
        size: 2048,
        buffer: Buffer.from('new content')
      } as Express.Multer.File,
      body: {
        changes: 'Updated file',
        author: 'Updated Author' 
      }
    };

    await controller.updateTemplate(
      mockRequest as Request,
      mockResponse as Response
    );

    // Проверяем что теперь 2 версии
    const versions = await TemplateVersion.find({ templateId }).sort({ version: 1 });
    expect(versions).toHaveLength(2); 
    
    const version1 = versions[0];
    const version2 = versions[1];
    
    expect(version1.version).toBe(1);
    expect(version1.changes).toBe('Initial version');
    
    expect(version2.version).toBe(2);
    expect(version2.changes).toBe('Updated file');
    expect(version2.metadata.author).toBe('Updated Author');
    
    const template = await Template.findById(templateId);
    expect(template?.metadata.version).toBe(2);
    expect(template?.metadata.author).toBe('Updated Author');
  });
  });

  describe('restoreTemplateVersion', () => {
    let templateId: string;
    let versionId: string;

    beforeEach(async () => {
      const template = await Template.create({
        name: 'Template to Restore',
        description: 'Test',
        category: 'Test',
        department: 'Test',
        tags: ['test'],
        file: {
          originalName: 'current.pdf',
          storedName: 'current.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/current.pdf',
          checksum: 'current'
        },
        metadata: {
          author: 'Current Author',
          version: 1,
          status: 'draft',
          lastModified: new Date(),
          checksum: 'current'
        }
      });
      templateId = template.id.toString();

      const version = await TemplateVersion.create({
        templateId: template._id,
        version: 1,
        changes: 'Original version',
        file: {
          originalName: 'original.pdf',
          storedName: 'original.pdf',
          mimeType: 'application/pdf',
          size: 512,
          url: 'http://test.com/original.pdf',
          checksum: 'original'
        },
        metadata: {
          author: 'Original Author',
          status: 'draft',
          created: new Date()
        }
      });
      versionId = version.id.toString();
    });

    it('should restore template version', async () => {
      mockRequest = {
        params: { id: templateId, versionId },
        body: {}
      };

      await controller.restoreTemplateVersion(
        mockRequest as Request,
        mockResponse as Response
      );

      const updatedTemplate = await Template.findById(templateId);
      expect(updatedTemplate?.metadata.version).toBe(2);
      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.restoredVersion).toBe(1);
      expect(response.newVersion).toBe(2);
    });

    it('should return 404 if version not found', async () => {
      mockRequest = {
        params: { id: templateId, versionId: new mongoose.Types.ObjectId().toString() },
        body: {}
      };

      await controller.restoreTemplateVersion(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Version not found' });
    });

    it('should return 400 if version does not belong to template', async () => {
      const otherTemplate = await Template.create({
        name: 'Other Template',
        description: 'Other',
        category: 'Test',
        department: 'Test',
        tags: ['test'],
        file: {
          originalName: 'other.pdf',
          storedName: 'other.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/other.pdf',
          checksum: 'other'
        },
        metadata: {
          author: 'Other',
          version: 1,
          status: 'draft',
          lastModified: new Date(),
          checksum: 'other'
        }
      });

      mockRequest = {
        params: { id: otherTemplate.id.toString(), versionId },
        body: {}
      };

      await controller.restoreTemplateVersion(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Version does not belong to this template' });
    });
  });

  describe('searchTemplatesEnhanced', () => {
    it('should search templates with enhanced options', async () => {
      mockRequest = {
        query: { 
          q: 'test',
          category: 'Test',
          highlight: 'true',
          fuzzy: 'true'
        }
      };

      await controller.searchTemplatesEnhanced(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 if query is missing', async () => {
      mockRequest = {
        query: {}
      };

      await controller.searchTemplatesEnhanced(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Query parameter "q" is required' });
    });
  });

  describe('autocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      mockRequest = {
        query: { q: 'test', field: 'name' }
      };

      await controller.autocomplete(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 if query is missing', async () => {
      mockRequest = {
        query: {}
      };

      await controller.autocomplete(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Query parameter "q" is required' });
    });
  });

  describe('downloadTemplate', () => {
    let templateId: string;
    let mockDownload: jest.Mock;
    let mockRedirect: jest.Mock;

    beforeEach(() => {
      mockDownload = jest.fn();
      mockRedirect = jest.fn();
      mockResponse.download = mockDownload as any;
      mockResponse.redirect = mockRedirect as any;
    });

    beforeEach(async () => {
      const template = await Template.create({
        name: 'Download Template',
        description: 'Test',
        category: 'Test',
        department: 'Test',
        tags: ['test'],
        file: {
          originalName: 'download.pdf',
          storedName: 'download.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/download.pdf',
          checksum: 'download'
        },
        metadata: {
          author: 'Test',
          version: 1,
          status: 'draft',
          lastModified: new Date(),
          checksum: 'download'
        }
      });
      templateId = template.id.toString();
    });

    it('should return 404 if template not found', async () => {
      mockRequest = {
        params: { id: new mongoose.Types.ObjectId().toString() }
      };

      await controller.downloadTemplate(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Template not found' });
    });
  });

  describe('previewTemplate', () => {
    let templateId: string;
    let mockSendFile: jest.Mock;
    let mockRedirect: jest.Mock;
    let mockSet: jest.Mock;

    beforeEach(() => {
      mockSendFile = jest.fn();
      mockRedirect = jest.fn();
      mockSet = jest.fn();
      mockResponse.sendFile = mockSendFile as any;
      mockResponse.redirect = mockRedirect as any;
      mockResponse.set = mockSet as any;
    });

    beforeEach(async () => {
      const template = await Template.create({
        name: 'Preview Template',
        description: 'Test',
        category: 'Test',
        department: 'Test',
        tags: ['test'],
        file: {
          originalName: 'preview.pdf',
          storedName: 'preview.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/preview.pdf',
          checksum: 'preview'
        },
        metadata: {
          author: 'Test',
          version: 1,
          status: 'draft',
          lastModified: new Date(),
          checksum: 'preview'
        }
      });
      templateId = template.id.toString();
    });

    it('should return 404 if template not found', async () => {
      mockRequest = {
        params: { id: new mongoose.Types.ObjectId().toString() }
      };

      await controller.previewTemplate(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Template not found' });
    });

    it('should return 415 for unsupported file type', async () => {
      const template = await Template.create({
        name: 'Unsupported Template',
        description: 'Test',
        category: 'Test',
        department: 'Test',
        tags: ['test'],
        file: {
          originalName: 'unsupported.bin',
          storedName: 'unsupported.bin',
          mimeType: 'application/octet-stream',
          size: 1024,
          url: 'http://test.com/unsupported.bin',
          checksum: 'unsupported'
        },
        metadata: {
          author: 'Test',
          version: 1,
          status: 'draft',
          lastModified: new Date(),
          checksum: 'unsupported'
        }
      });

      mockRequest = {
        params: { id: template.id.toString() }
      };

      await controller.previewTemplate(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(415);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'File type not supported for preview',
        mimeType: 'application/octet-stream'
      });
    });
  });

  describe('uploadNewVersion', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await Template.create({
        name: 'Version Upload Template',
        description: 'Test',
        category: 'Test',
        department: 'Test',
        tags: ['test'],
        file: {
          originalName: 'original.pdf',
          storedName: 'original.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/original.pdf',
          checksum: 'original'
        },
        metadata: {
          author: 'Test',
          version: 1,
          status: 'draft',
          lastModified: new Date(),
          checksum: 'original'
        }
      });
      templateId = template.id.toString();
    });

    it('should upload new version', async () => {
      mockRequest = {
        params: { id: templateId },
        file: {
          originalname: 'new-version.pdf',
          mimetype: 'application/pdf',
          size: 2048,
          buffer: Buffer.from('new version'),
          fieldname: 'file',
          encoding: '7bit',
          destination: '',
          filename: 'new-version.pdf',
          path: ''
        } as Express.Multer.File,
        body: {
          changes: 'New version uploaded'
        }
      };

      await controller.uploadNewVersion(
        mockRequest as Request,
        mockResponse as Response
      );

      const template = await Template.findById(templateId);
      expect(template?.metadata.version).toBeGreaterThan(1);
    });

    it('should return 400 if no file provided', async () => {
      mockRequest = {
        params: { id: templateId },
        body: {}
      };

      await controller.uploadNewVersion(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'File is required' });
    });

    it('should return 404 if template not found', async () => {
      mockRequest = {
        params: { id: new mongoose.Types.ObjectId().toString() },
        file: {
          originalname: 'test.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('test')
        } as Express.Multer.File,
        body: {}
      };

      await controller.uploadNewVersion(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Template not found' });
    });
  });

  describe('restoreVersion', () => {
    let templateId: string;
    let versionId: string;

    beforeEach(async () => {
      const template = await Template.create({
        name: 'Template to Restore',
        description: 'Test',
        category: 'Test',
        department: 'Test',
        tags: ['test'],
        file: {
          originalName: 'current.pdf',
          storedName: 'current.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/current.pdf',
          checksum: 'current'
        },
        metadata: {
          author: 'Current Author',
          version: 1,
          status: 'draft',
          lastModified: new Date(),
          checksum: 'current'
        }
      });
      templateId = template.id.toString();

      const version = await TemplateVersion.create({
        templateId: template._id,
        version: 1,
        changes: 'Original version',
        file: {
          originalName: 'original.pdf',
          storedName: 'original.pdf',
          mimeType: 'application/pdf',
          size: 512,
          url: 'http://test.com/original.pdf',
          checksum: 'original'
        },
        metadata: {
          author: 'Original Author',
          status: 'draft',
          created: new Date()
        }
      });
      versionId = version.id.toString();
    });

    it('should restore template version', async () => {
      mockRequest = {
        params: { id: templateId, versionId },
        body: {}
      };

      await controller.restoreVersion(
        mockRequest as Request,
        mockResponse as Response
      );

      const updatedTemplate = await Template.findById(templateId);
      expect(updatedTemplate?.metadata.version).toBe(2);
      
      const versions = await TemplateVersion.find({ templateId });
      expect(versions).toHaveLength(2); 
    });
  });

  describe('getTemplateMetadata', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await Template.create({
        name: 'Metadata Template',
        description: 'Test Description',
        category: 'Test Category',
        department: 'Test Department',
        tags: ['tag1', 'tag2'],
        file: {
          originalName: 'metadata.pdf',
          storedName: 'metadata.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/metadata.pdf',
          checksum: 'metadata'
        },
        metadata: {
          author: 'Test Author',
          version: 1,
          status: 'draft',
          lastModified: new Date(),
          checksum: 'metadata'
        }
      });
      templateId = template.id.toString();
    });

    it('should return template metadata', async () => {
      mockRequest = {
        params: { id: templateId }
      };

      await controller.getTemplateMetadata(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalled();
      const metadata = mockJson.mock.calls[0][0];
      expect(metadata.name).toBe('Metadata Template');
      expect(metadata.category).toBe('Test Category');
      expect(metadata.department).toBe('Test Department');
      expect(metadata.author).toBe('Test Author');
      expect(metadata.version).toBe(1);
      expect(metadata.status).toBe('draft');
    });

    it('should return 404 if template not found', async () => {
      mockRequest = {
        params: { id: new mongoose.Types.ObjectId().toString() }
      };

      await controller.getTemplateMetadata(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Template not found' });
    });
  });

  describe('updateTemplateStatus', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await Template.create({
        name: 'Status Template',
        description: 'Test',
        category: 'Test',
        department: 'Test',
        tags: ['test'],
        file: {
          originalName: 'status.pdf',
          storedName: 'status.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/status.pdf',
          checksum: 'status'
        },
        metadata: {
          author: 'Test',
          version: 1,
          status: 'draft',
          lastModified: new Date(),
          checksum: 'status'
        }
      });
      templateId = template.id.toString();
    });

    it('should update template status', async () => {
      mockRequest = {
        params: { id: templateId },
        body: { status: 'approved' }
      };

      await controller.updateTemplateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      const template = await Template.findById(templateId);
      expect(template?.metadata.status).toBe('approved');
      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 for invalid status', async () => {
      mockRequest = {
        params: { id: templateId },
        body: { status: 'invalid' }
      };

      await controller.updateTemplateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Valid status is required (draft, approved, deprecated)'
      });
    });

    it('should return 404 if template not found', async () => {
      mockRequest = {
        params: { id: new mongoose.Types.ObjectId().toString() },
        body: { status: 'approved' }
      };

      await controller.updateTemplateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Template not found' });
    });
  });

  describe('getCategories', () => {
    beforeEach(async () => {
      await Template.create([
        {
          name: 'Template 1',
          description: 'Test',
          category: 'Custom Category 1',
          department: 'Test',
          tags: ['test'],
          file: {
            originalName: 'test1.pdf',
            storedName: 'test1.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'http://test.com/test1.pdf',
            checksum: 'test1'
          },
          metadata: {
            author: 'Test',
            version: 1,
            status: 'draft',
            lastModified: new Date(),
            checksum: 'test1'
          }
        },
        {
          name: 'Template 2',
          description: 'Test',
          category: 'Custom Category 2',
          department: 'Test',
          tags: ['test'],
          file: {
            originalName: 'test2.pdf',
            storedName: 'test2.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'http://test.com/test2.pdf',
            checksum: 'test2'
          },
          metadata: {
            author: 'Test',
            version: 1,
            status: 'draft',
            lastModified: new Date(),
            checksum: 'test2'
          }
        }
      ]);
    });

    it('should return categories', async () => {
      mockRequest = {
        query: {}
      };

      await controller.getCategories(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalled();
      const categories = mockJson.mock.calls[0][0];
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  describe('getDepartments', () => {
    beforeEach(async () => {
      await Template.create([
        {
          name: 'Template 1',
          description: 'Test',
          category: 'Test',
          department: 'Custom Department 1',
          tags: ['test'],
          file: {
            originalName: 'test1.pdf',
            storedName: 'test1.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'http://test.com/test1.pdf',
            checksum: 'test1'
          },
          metadata: {
            author: 'Test',
            version: 1,
            status: 'draft',
            lastModified: new Date(),
            checksum: 'test1'
          }
        },
        {
          name: 'Template 2',
          description: 'Test',
          category: 'Test',
          department: 'Custom Department 2',
          tags: ['test'],
          file: {
            originalName: 'test2.pdf',
            storedName: 'test2.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'http://test.com/test2.pdf',
            checksum: 'test2'
          },
          metadata: {
            author: 'Test',
            version: 1,
            status: 'draft',
            lastModified: new Date(),
            checksum: 'test2'
          }
        }
      ]);
    });

    it('should return departments', async () => {
      mockRequest = {
        query: {}
      };

      await controller.getDepartments(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalled();
      const departments = mockJson.mock.calls[0][0];
      expect(Array.isArray(departments)).toBe(true);
      expect(departments.length).toBeGreaterThan(0);
    });
  });

  describe('getPopularTags', () => {
    beforeEach(async () => {
      await Template.create([
        {
          name: 'Template 1',
          description: 'Test',
          category: 'Test',
          department: 'Test',
          tags: ['tag1', 'tag2', 'tag3'],
          file: {
            originalName: 'test1.pdf',
            storedName: 'test1.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'http://test.com/test1.pdf',
            checksum: 'test1'
          },
          metadata: {
            author: 'Test',
            version: 1,
            status: 'draft',
            lastModified: new Date(),
            checksum: 'test1'
          }
        },
        {
          name: 'Template 2',
          description: 'Test',
          category: 'Test',
          department: 'Test',
          tags: ['tag1', 'tag2'],
          file: {
            originalName: 'test2.pdf',
            storedName: 'test2.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'http://test.com/test2.pdf',
            checksum: 'test2'
          },
          metadata: {
            author: 'Test',
            version: 1,
            status: 'draft',
            lastModified: new Date(),
            checksum: 'test2'
          }
        },
        {
          name: 'Template 3',
          description: 'Test',
          category: 'Test',
          department: 'Test',
          tags: ['tag1'],
          file: {
            originalName: 'test3.pdf',
            storedName: 'test3.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'http://test.com/test3.pdf',
            checksum: 'test3'
          },
          metadata: {
            author: 'Test',
            version: 1,
            status: 'draft',
            lastModified: new Date(),
            checksum: 'test3'
          }
        }
      ]);
    });

    it('should return popular tags', async () => {
      mockRequest = {
        query: { limit: '10' }
      };

      await controller.getPopularTags(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalled();
      const tags = mockJson.mock.calls[0][0];
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
      // tag1 должен быть самым популярным (3 раза)
      expect(tags[0].tag).toBe('tag1');
      expect(tags[0].count).toBe(3);
    });

    it('should respect limit parameter', async () => {
      mockRequest = {
        query: { limit: '2' }
      };

      await controller.getPopularTags(
        mockRequest as Request,
        mockResponse as Response
      );

      const tags = mockJson.mock.calls[0][0];
      expect(tags.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getTemplateStats', () => {
    beforeEach(async () => {
      // Создаем тестовые данные для статистики
      await Template.create([
        {
          name: 'Template 1',
          description: 'Desc 1',
          category: 'Category A',
          department: 'Department X',
          tags: ['tag1'],
          file: {
            originalName: 'file1.pdf',
            storedName: 'stored1.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'http://test.com/file1.pdf',
            checksum: 'checksum1'
          },
          metadata: {
            author: 'Author 1',
            version: 1,
            status: 'draft',
            lastModified: new Date(),
            checksum: 'checksum1'
          }
        },
        {
          name: 'Template 2',
          description: 'Desc 2',
          category: 'Category B',
          department: 'Department X',
          tags: ['tag1', 'tag2'],
          file: {
            originalName: 'file2.pdf',
            storedName: 'stored2.pdf',
            mimeType: 'application/pdf',
            size: 2048,
            url: 'http://test.com/file2.pdf',
            checksum: 'checksum2'
          },
          metadata: {
            author: 'Author 2',
            version: 1,
            status: 'approved',
            lastModified: new Date(),
            checksum: 'checksum2'
          }
        }
      ]);

      await TemplateVersion.create([
        {
          templateId: new mongoose.Types.ObjectId(),
          version: 1,
          changes: 'Test',
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
            status: 'draft',
            created: new Date()
          }
        }
      ]);
    });

    it('should return template statistics', async () => {
      mockRequest = {
        query: {}
      };

      await controller.getTemplateStats(
        mockRequest as Request,
        mockResponse as Response
      );

      const stats = mockJson.mock.calls[0][0];
      expect(stats.totalTemplates).toBe(2);
      expect(stats.totalVersions).toBe(1);
      expect(stats.byStatus).toHaveProperty('draft');
      expect(stats.byStatus).toHaveProperty('approved');
    });
  });

  describe('deleteTemplate', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await Template.create({
        name: 'To Delete',
        description: 'To be deleted',
        category: 'Test',
        department: 'Test',
        tags: ['test'],
        file: {
          originalName: 'delete.pdf',
          storedName: 'delete.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/delete.pdf',
          checksum: 'checksum'
        },
        metadata: {
          author: 'Test',
          version: 1,
          status: 'draft',
          lastModified: new Date(),
          checksum: 'checksum'
        }
      });
      templateId = template.id.toString();
    });

    it('should delete template', async () => {
      mockRequest = {
        params: { id: templateId }
      };

      await controller.deleteTemplate(
        mockRequest as Request,
        mockResponse as Response
      );

      const template = await Template.findById(templateId);
      expect(template).toBeNull();
      
      expect(mockJson).toHaveBeenCalledWith({ 
        message: 'Template deleted successfully' 
      });
    });
  });

  describe('searchTemplates', () => {
    it('should search templates via elasticsearch', async () => {
      mockRequest = {
        query: { q: 'test' }
      };

      await controller.searchTemplates(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalled();
      const response = mockJson.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should return 400 if query is missing', async () => {
      mockRequest = {
        query: {}
      };

      await controller.searchTemplates(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Query parameter "q" is required'
      });
    });
  });

  describe('getTemplateVersions', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await Template.create({
        name: 'Versioned Template',
        description: 'Template with versions',
        category: 'Test',
        department: 'Test',
        tags: ['test'],
        file: {
          originalName: 'test.pdf',
          storedName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/test.pdf',
          checksum: 'checksum'
        },
        metadata: {
          author: 'Test',
          version: 2,
          status: 'draft',
          lastModified: new Date(),
          checksum: 'checksum'
        }
      });
      templateId = template.id.toString();

      // Создаем версии
      await TemplateVersion.create([
        {
          templateId: template._id,
          version: 1,
          changes: 'Initial version',
          file: {
            originalName: 'v1.pdf',
            storedName: 'v1.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            url: 'http://test.com/v1.pdf',
            checksum: 'checksum1'
          },
          metadata: {
            author: 'Author 1',
            status: 'draft',
            created: new Date()
          }
        },
        {
          templateId: template._id,
          version: 2,
          changes: 'Updated version',
          file: {
            originalName: 'v2.pdf',
            storedName: 'v2.pdf',
            mimeType: 'application/pdf',
            size: 2048,
            url: 'http://test.com/v2.pdf',
            checksum: 'checksum2'
          },
          metadata: {
            author: 'Author 2',
            status: 'approved',
            created: new Date()
          }
        }
      ]);
    });

    it('should return template versions', async () => {
      mockRequest = {
        params: { id: templateId },
        query: {}
      };

      await controller.getTemplateVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.versions).toHaveLength(2);
      expect(responseData.total).toBe(2);
    });

    it('should paginate versions', async () => {
      mockRequest = {
        params: { id: templateId },
        query: { page: '1', limit: '1' } 
      };

      await controller.getTemplateVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.versions).toHaveLength(1);
      expect(responseData.totalPages).toBe(2);
    });
  });

  describe('compareVersions', () => {
    let templateId: string;
    let version1Id: string;
    let version2Id: string;

    beforeEach(async () => {
      const template = await Template.create({
        name: 'Template to Compare',
        description: 'Template for comparison',
        category: 'Test',
        department: 'Test',
        tags: ['test'],
        file: {
          originalName: 'template.pdf',
          storedName: 'template.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/template.pdf',
          checksum: 'template-checksum'
        },
        metadata: {
          author: 'Test Author',
          version: 2,
          status: 'draft',
          lastModified: new Date(),
          checksum: 'template-checksum'
        }
      });
      templateId = template.id.toString();

      // Создаем первую версию
      const version1 = await TemplateVersion.create({
        templateId: template._id,
        version: 1,
        changes: 'Initial version',
        file: {
          originalName: 'v1.pdf',
          storedName: 'v1.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/v1.pdf',
          checksum: 'checksum1'
        },
        metadata: {
          author: 'Author 1',
          status: 'draft',
          created: new Date('2024-01-01')
        }
      });
      version1Id = version1.id.toString();

      // Создаем вторую версию с изменениями
      const version2 = await TemplateVersion.create({
        templateId: template._id,
        version: 2,
        changes: 'Updated version with changes',
        file: {
          originalName: 'v2.pdf',
          storedName: 'v2.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          url: 'http://test.com/v2.pdf',
          checksum: 'checksum2'
        },
        metadata: {
          author: 'Author 2',
          status: 'approved',
          created: new Date('2024-01-02')
        }
      });
      version2Id = version2.id.toString();
    });

    it('should compare two versions successfully', async () => {
      mockRequest = {
        params: { 
          id: templateId,
          version1Id,
          version2Id
        }
      };

      await controller.compareVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalled();
      const comparison = mockJson.mock.calls[0][0];
      
      expect(comparison.templateId).toBe(templateId);
      expect(comparison.templateName).toBe('Template to Compare');
      expect(comparison.version1.version).toBe(1);
      expect(comparison.version2.version).toBe(2);
      expect(comparison.differences.summary.hasChanges).toBe(true);
      expect(comparison.differences.metadata.version).toBeDefined();
      expect(comparison.differences.metadata.changes).toBeDefined();
      expect(comparison.differences.metadata.author).toBeDefined();
      expect(comparison.differences.metadata.status).toBeDefined();
      expect(comparison.differences.fileMetadata.size).toBeDefined();
      expect(comparison.differences.fileContent.contentChanged).toBe(true);
    });

    it('should return 404 if version1 not found', async () => {
      mockRequest = {
        params: { 
          id: templateId,
          version1Id: new mongoose.Types.ObjectId().toString(),
          version2Id
        }
      };

      await controller.compareVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Version 1 not found' });
    });

    it('should return 404 if version2 not found', async () => {
      mockRequest = {
        params: { 
          id: templateId,
          version1Id,
          version2Id: new mongoose.Types.ObjectId().toString()
        }
      };

      await controller.compareVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Version 2 not found' });
    });

    it('should return 400 if versions belong to different templates', async () => {
      // Создаем другой шаблон и версию
      const otherTemplate = await Template.create({
        name: 'Other Template',
        description: 'Other',
        category: 'Test',
        department: 'Test',
        tags: ['test'],
        file: {
          originalName: 'other.pdf',
          storedName: 'other.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/other.pdf',
          checksum: 'other'
        },
        metadata: {
          author: 'Other',
          version: 1,
          status: 'draft',
          lastModified: new Date(),
          checksum: 'other'
        }
      });

      const otherVersion = await TemplateVersion.create({
        templateId: otherTemplate._id,
        version: 1,
        changes: 'Other version',
        file: {
          originalName: 'other.pdf',
          storedName: 'other.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/other.pdf',
          checksum: 'other'
        },
        metadata: {
          author: 'Other',
          status: 'draft',
          created: new Date()
        }
      });

      mockRequest = {
        params: { 
          id: templateId,
          version1Id,
          version2Id: otherVersion.id.toString()
        }
      };

      await controller.compareVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ 
        error: 'Versions must belong to the same template' 
      });
    });

    it('should return 400 if comparing version with itself', async () => {
      mockRequest = {
        params: { 
          id: templateId,
          version1Id,
          version2Id: version1Id
        }
      };

      await controller.compareVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ 
        error: 'Cannot compare a version with itself' 
      });
    });

    it('should return 400 if version1Id is missing', async () => {
      mockRequest = {
        params: { 
          id: templateId,
          version2Id
        }
      };

      await controller.compareVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ 
        error: 'Both version1Id and version2Id are required' 
      });
    });

    it('should return 400 if version2Id is missing', async () => {
      mockRequest = {
        params: { 
          id: templateId,
          version1Id
        }
      };

      await controller.compareVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ 
        error: 'Both version1Id and version2Id are required' 
      });
    });

    it('should detect no file content changes when checksums are identical', async () => {
      // Создаем новый шаблон для этого теста
      const template3 = await Template.create({
        name: 'Template 3',
        description: 'Test',
        category: 'Test',
        department: 'Test',
        tags: ['test'],
        file: {
          originalName: 'template3.pdf',
          storedName: 'template3.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/template3.pdf',
          checksum: 'template3'
        },
        metadata: {
          author: 'Test',
          version: 2,
          status: 'draft',
          lastModified: new Date(),
          checksum: 'template3'
        }
      });

      // Создаем две версии с одинаковым checksum (файл не изменился)
      const version3 = await TemplateVersion.create({
        templateId: template3._id,
        version: 1,
        changes: 'Initial version',
        file: {
          originalName: 'v1.pdf',
          storedName: 'v1.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/v1.pdf',
          checksum: 'same-checksum'
        },
        metadata: {
          author: 'Author 1',
          status: 'draft',
          created: new Date('2024-01-01')
        }
      });

      const version4 = await TemplateVersion.create({
        templateId: template3._id,
        version: 2,
        changes: 'Updated description but same file',
        file: {
          originalName: 'v1.pdf',
          storedName: 'v1.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'http://test.com/v1.pdf',
          checksum: 'same-checksum' // Тот же checksum - файл не изменился
        },
        metadata: {
          author: 'Author 1',
          status: 'draft',
          created: new Date('2024-01-02')
        }
      });

      mockRequest = {
        params: { 
          id: template3.id.toString(),
          version1Id: version3.id.toString(),
          version2Id: version4.id.toString()
        }
      };

      await controller.compareVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      const comparison = mockJson.mock.calls[0][0];
      // Файл не изменился (checksum одинаковый)
      expect(comparison.differences.fileContent.contentChanged).toBe(false);
      // Но метаданные изменились
      expect(comparison.differences.metadata.changes).toBeDefined();
      expect(comparison.differences.metadata.version).toBeDefined();
    });
  });

});
});