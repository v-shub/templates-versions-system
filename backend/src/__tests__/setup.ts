import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import nock from 'nock';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  }

  // Mock Elasticsearch
  nock('https://localhost:9200')
    .persist()
    .head('/')
    .reply(200);

  nock('https://localhost:9200')
    .persist()
    .post('/_bulk')
    .reply(200, { items: [] });

  nock('https://localhost:9200')
    .persist()
    .get('/templates/_search')
    .reply(200, {
      hits: {
        total: { value: 0 },
        hits: []
      }
    });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
  nock.cleanAll();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  nock.cleanAll();
});

// Mock services
jest.mock('../services/ElasticsearchService', () => {
  return {
    ElasticsearchService: jest.fn().mockImplementation(() => ({
      indexTemplate: jest.fn().mockResolvedValue({}),
      updateTemplate: jest.fn().mockResolvedValue({}),
      deleteTemplate: jest.fn().mockResolvedValue({}),
      searchTemplates: jest.fn().mockResolvedValue({ 
        hits: [], 
        total: 0,
        took: 0 
      }),
      searchTemplatesEnhanced: jest.fn().mockResolvedValue({ 
        hits: [], 
        total: 0 
      }),
      autocomplete: jest.fn().mockResolvedValue([]),
      healthCheck: jest.fn().mockResolvedValue(true),
      createIndexIfNotExists: jest.fn().mockResolvedValue({})
    }))
  };
});

jest.mock('../services/FileStorageService', () => {
  return {
    FileStorageService: jest.fn().mockImplementation(() => ({
      uploadFile: jest.fn().mockResolvedValue({
        originalName: 'test.pdf',
        storedName: '123-test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        url: 'http://test.com/files/123-test.pdf', // ИСПРАВЛЕНО: добавил /files/
        checksum: 'abc123'
      }),
      deleteFile: jest.fn().mockResolvedValue({}),
      testConnection: jest.fn().mockResolvedValue(true)
    }))
  };
});

jest.mock('../services/RedisService', () => {
  return {
    RedisService: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      del: jest.fn().mockResolvedValue(true),
      delPattern: jest.fn().mockResolvedValue(0),
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(true),
      exists: jest.fn().mockResolvedValue(false),
      healthCheck: jest.fn().mockResolvedValue(true),
      connect: jest.fn().mockResolvedValue({}),
      ensureConnection: jest.fn().mockResolvedValue({})
    }))
  };
});

// Добавьте этот пустой тест чтобы Jest не ругался
describe('Setup', () => {
  it('should setup test environment', () => {
    expect(true).toBe(true);
  });
});

afterAll(async () => {
  // Ждем завершения всех асинхронных операций
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
  nock.cleanAll();
  
  // Закрываем все открытые таймеры
  jest.useRealTimers();
});