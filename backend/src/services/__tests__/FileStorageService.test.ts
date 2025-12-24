import { FileStorageService } from '../FileStorageService';
import fs from 'fs';
import path from 'path';

jest.unmock('../FileStorageService');

describe('FileStorageService Real Tests', () => {
  let service: FileStorageService;
  const testUploadPath = './test-uploads-' + Date.now();

  beforeAll(() => {
    service = new FileStorageService({
      type: 'local',
      local: {
        uploadPath: testUploadPath,
        baseUrl: 'http://test.com'
      }
    });
  });

  afterAll(() => {
    // Очищаем тестовую директорию
    if (fs.existsSync(testUploadPath)) {
      fs.rmSync(testUploadPath, { recursive: true });
    }
  });

  beforeEach(() => {
    // Создаем тестовую директорию
    if (!fs.existsSync(testUploadPath)) {
      fs.mkdirSync(testUploadPath, { recursive: true });
    }
  });

  afterEach(() => {
    // Очищаем тестовую директорию после каждого теста
    if (fs.existsSync(testUploadPath)) {
      const files = fs.readdirSync(testUploadPath);
      for (const file of files) {
        fs.unlinkSync(path.join(testUploadPath, file));
      }
    }
  });

  describe('testConnection', () => {
    it('should return false for local storage', async () => {
      const result = await service.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('uploadFile', () => {
    it('should upload file locally', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test content')
      } as any;

      const result = await service.uploadFile(mockFile);
      
      expect(result.originalName).toBe('test.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.size).toBe(1024);
      expect(result.checksum).toBeDefined();
      // Проверяем структуру URL
      expect(result.url).toMatch(/http:\/\/test\.com\/files\/\d+-[a-z0-9]+\.pdf/);
      
      // Проверяем, что файл создан
      const filePath = path.join(testUploadPath, result.storedName);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should calculate checksum', async () => {
      // Так как метод приватный, тестируем через публичный интерфейс
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test content')
      } as any;

      const result = await service.uploadFile(mockFile);
      expect(result.checksum).toBeDefined();
      expect(typeof result.checksum).toBe('string');
      expect(result.checksum.length).toBe(32); // MD5
    });
  });

  describe('deleteFile', () => {
    it('should delete file', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test content')
      } as any;

      const result = await service.uploadFile(mockFile);
      
      // Удаляем файл
      await service.deleteFile(result.storedName);
      
      // Проверяем, что файл удален
      const filePath = path.join(testUploadPath, result.storedName);
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test content')
      } as any;

      const result = await service.uploadFile(mockFile);
      const exists = await service.fileExists(result.storedName);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const exists = await service.fileExists('non-existent-file.pdf');
      expect(exists).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const content = 'test file content';
      const mockFile = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: content.length,
        buffer: Buffer.from(content)
      } as any;

      const result = await service.uploadFile(mockFile);
      const fileBuffer = await service.readFile(result.storedName);
      
      expect(fileBuffer.toString()).toBe(content);
    });

    it('should throw error for non-existing file', async () => {
      await expect(service.readFile('non-existent-file.pdf')).rejects.toThrow();
    });
  });

  describe('readTextFile', () => {
    it('should read text file as string', async () => {
      const content = 'test file content';
      const mockFile = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: content.length,
        buffer: Buffer.from(content)
      } as any;

      const result = await service.uploadFile(mockFile);
      const text = await service.readTextFile(result.storedName);
      
      expect(text).toBe(content);
    });
  });

  describe('copyFile', () => {
    it('should copy file with new name', async () => {
      const content = 'original content';
      const mockFile = {
        originalname: 'original.txt',
        mimetype: 'text/plain',
        size: content.length,
        buffer: Buffer.from(content)
      } as any;

      const original = await service.uploadFile(mockFile);
      const copy = await service.copyFile(
        original.storedName,
        'copy.txt',
        'text/plain'
      );

      expect(copy.originalName).toBe('copy.txt');
      expect(copy.storedName).not.toBe(original.storedName);
      
      const copiedContent = await service.readTextFile(copy.storedName);
      expect(copiedContent).toBe(content);
    });
  });
});