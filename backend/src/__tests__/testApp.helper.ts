import express from 'express';
import cors from 'cors';
import { TemplateController } from '../controllers/TemplateController';
import multer from 'multer';
import {
  validateTemplateCreate,
  validateTemplateUpdate,
  validateTemplateStatus,
  validateTemplateId,
  validateRestoreVersionParams,
  validateCompareVersionsParams,
  validateSearchQuery,
  validateAutocompleteQuery,
} from '../middleware/validators';

export const createTestApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Инициализация контроллера
  const templateController = new TemplateController();
  
  // Настройка multer для тестов
  const upload = multer({ storage: multer.memoryStorage() });
  
  // Создаем отдельный роутер для тестов (с validators как в production)
  const testRouter = express.Router();
  
  testRouter.post('/templates', upload.single('file'), validateTemplateCreate, templateController.createTemplate);
  testRouter.get('/templates', templateController.getTemplates);
  testRouter.get('/templates/search', validateSearchQuery, templateController.searchTemplates);
  testRouter.get('/templates/search/enhanced', validateSearchQuery, templateController.searchTemplatesEnhanced);
  testRouter.get('/templates/autocomplete', validateAutocompleteQuery, templateController.autocomplete);
  testRouter.get('/templates/stats', templateController.getTemplateStats);
  testRouter.get('/templates/:id', validateTemplateId, templateController.getTemplate);
  testRouter.delete('/templates/:id', validateTemplateId, templateController.deleteTemplate);
  testRouter.put('/templates/:id', upload.single('file'), validateTemplateId, validateTemplateUpdate, templateController.updateTemplate);
  testRouter.get('/templates/:id/download', validateTemplateId, templateController.downloadTemplate);
  testRouter.get('/templates/:id/preview', validateTemplateId, templateController.previewTemplate);
  testRouter.get('/templates/:id/versions/compare/:version1Id/:version2Id', validateCompareVersionsParams, templateController.compareVersions);
  testRouter.post('/templates/:id/versions/:versionId/restore', validateRestoreVersionParams, templateController.restoreVersion);
  testRouter.post('/templates/:id/versions', upload.single('file'), validateTemplateId, templateController.uploadNewVersion);
  testRouter.get('/templates/:id/versions', validateTemplateId, templateController.getTemplateVersions);
  testRouter.get('/templates/:id/metadata', validateTemplateId, templateController.getTemplateMetadata);
  testRouter.patch('/templates/:id/status', validateTemplateId, validateTemplateStatus, templateController.updateTemplateStatus);
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

