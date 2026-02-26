import { Router } from 'express';
import { TemplateController } from '../controllers/TemplateController';
import multer from 'multer';
import path from 'path';
import {
  validateTemplateCreate,
  validateTemplateUpdate,
  validateTemplateStatus,
  validateTemplateId,
  validateRestoreVersionParams,
  validateCompareVersionsParams,
  validateVersionDownloadParams,
  validateSearchQuery,
  validateAutocompleteQuery,
} from '../middleware/validators';

const router = Router();
const templateController = new TemplateController();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    fields: 20,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Только Office (DOCX, XLSX, PPTX) + PDF
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    const allowedExtensions = ['.pdf', '.docx', '.xlsx', '.pptx'];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const extension = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(extension)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowedExtensions.join(', ')}`));
      }
    }
  }
});

const handleMulterError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field' });
    }
  }
  if (error.message === 'Invalid file type') {
    return res.status(400).json({ error: 'Invalid file type' });
  }
  next(error);
};

// CRUD операции
router.post('/templates', upload.single('file'), validateTemplateCreate, templateController.createTemplate);
router.put('/templates/:id', upload.single('file'), validateTemplateId, validateTemplateUpdate, templateController.updateTemplate);

// Поиск
router.get('/templates', templateController.getTemplates);
router.get('/templates/search', validateSearchQuery, templateController.searchTemplates);
router.get('/templates/search/enhanced', validateSearchQuery, templateController.searchTemplatesEnhanced);
router.get('/templates/autocomplete', validateAutocompleteQuery, templateController.autocomplete);

// Статистика - ВАЖНО: ДО маршрута с :id
router.get('/templates/stats', templateController.getTemplateStats);

// Отдельные операции с ID
router.get('/templates/:id', validateTemplateId, templateController.getTemplate);
router.delete('/templates/:id', validateTemplateId, templateController.deleteTemplate);

// Файлы
router.get('/templates/:id/download', validateTemplateId, templateController.downloadTemplate);
router.get('/templates/:id/preview', validateTemplateId, templateController.previewTemplate);

// Версии — более специфичные маршруты раньше общих
router.get('/templates/:id/versions/compare/:version1Id/:version2Id', validateCompareVersionsParams, templateController.compareVersions);
router.get(
  '/templates/:id/versions/:versionId/download',
  validateVersionDownloadParams,
  templateController.downloadVersion
);
router.get(
  '/templates/:id/versions/:versionId/preview',
  validateVersionDownloadParams,
  templateController.previewVersion
);
router.post('/templates/:id/versions/:versionId/restore', validateRestoreVersionParams, templateController.restoreVersion);
router.post('/templates/:id/versions', upload.single('file'), validateTemplateId, templateController.uploadNewVersion);
router.get('/templates/:id/versions', validateTemplateId, templateController.getTemplateVersions);

// Метаданные
router.get('/templates/:id/metadata', validateTemplateId, templateController.getTemplateMetadata);
router.patch('/templates/:id/status', validateTemplateId, validateTemplateStatus, templateController.updateTemplateStatus);

// Справочники
router.get('/categories', templateController.getCategories);
router.get('/departments', templateController.getDepartments);
router.get('/tags', templateController.getPopularTags);

router.use(handleMulterError);

export default router;