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

  it('should calculate checksum', () => {
    // Так как метод приватный, тестируем через публичный интерфейс
    const mockFile = {
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test content')
    } as any;

    // Проверяем что checksum создается
    service.uploadFile(mockFile).then(result => {
      expect(result.checksum).toBeDefined();
      expect(typeof result.checksum).toBe('string');
      expect(result.checksum.length).toBe(32); // MD5
    });
  });
});