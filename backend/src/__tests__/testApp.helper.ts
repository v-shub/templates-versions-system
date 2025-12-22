import express from 'express';
import cors from 'cors';
import { TemplateController } from '../controllers/TemplateController';
import multer from 'multer';

export const createTestApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Инициализация контроллера
  const templateController = new TemplateController();
  
  // Настройка multer для тестов
  const upload = multer({ storage: multer.memoryStorage() });
  
  // Создаем отдельный роутер для тестов
  const testRouter = express.Router();
  
  // Копируем маршруты из оригинального роутера
  testRouter.post('/templates', upload.single('file'), templateController.createTemplate);
  testRouter.get('/templates', templateController.getTemplates);
  testRouter.get('/templates/search', templateController.searchTemplates);
  testRouter.get('/templates/search/enhanced', templateController.searchTemplatesEnhanced);
  testRouter.get('/templates/autocomplete', templateController.autocomplete);
  testRouter.get('/templates/stats', templateController.getTemplateStats);
  testRouter.get('/templates/:id', templateController.getTemplate);
  testRouter.delete('/templates/:id', templateController.deleteTemplate);
  testRouter.put('/templates/:id', upload.single('file'), templateController.updateTemplate);
  testRouter.get('/templates/:id/download', templateController.downloadTemplate);
  testRouter.get('/templates/:id/preview', templateController.previewTemplate);
  testRouter.post('/templates/:id/versions', upload.single('file'), templateController.uploadNewVersion);
  testRouter.get('/templates/:id/versions', templateController.getTemplateVersions);
  testRouter.post('/templates/:id/versions/:versionId/restore', templateController.restoreVersion);
  testRouter.get('/templates/:id/metadata', templateController.getTemplateMetadata);
  testRouter.patch('/templates/:id/status', templateController.updateTemplateStatus);
  testRouter.get('/categories', templateController.getCategories);
  testRouter.get('/departments', templateController.getDepartments);
  testRouter.get('/tags', templateController.getPopularTags);

  app.use('/api', testRouter);

  app.get('/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      services: {
        mongodb: 'connected',
        elasticsearch: 'connected'
      }
    });
  });

  // Middleware для ошибок
  app.use((error: any, req: any, res: any, next: any) => {
    console.error('Test app error:', error);
    res.status(500).json({ error: error.message });
  });

  return app;
};

