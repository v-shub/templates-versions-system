import { Router } from 'express';
import { TemplateController } from '../controllers/TemplateController';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

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
    // Разрешенные MIME-типы
    const allowedTypes = [
      // Документы
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      
      // Текстовые файлы
      'text/plain',
      'text/html',
      'text/csv',
      'application/rtf',
      
      // Изображения (для превью)
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp',
      'image/svg+xml',
      
      // Архивы
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
      
      // Другие
      'application/json',
      'application/xml'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.log('Invalid file type:', file.mimetype, 'Original name:', file.originalname);
      
      // Дополнительная проверка по расширению файла
      const allowedExtensions = [
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.txt', '.html', '.csv', '.rtf',
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
        '.zip', '.rar', '.7z', '.tar', '.gz',
        '.json', '.xml'
      ];
      
      const extension = path.extname(file.originalname).toLowerCase();
      
      if (allowedExtensions.includes(extension)) {
        // Разрешаем файл даже если MIME-тип не опознан
        console.log('File allowed by extension:', extension);
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedExtensions.join(', ')}`));
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
router.post('/templates', upload.single('file'), templateController.createTemplate);
router.put('/templates/:id', upload.single('file'), templateController.updateTemplate);

// Поиск
router.get('/templates', templateController.getTemplates);
router.get('/templates/search', templateController.searchTemplates); 
router.get('/templates/search/enhanced', templateController.searchTemplatesEnhanced); 
router.get('/templates/autocomplete', templateController.autocomplete);

// Статистика - ВАЖНО: ДО маршрута с :id
router.get('/templates/stats', templateController.getTemplateStats);

// Отдельные операции с ID
router.get('/templates/:id', templateController.getTemplate);
router.delete('/templates/:id', templateController.deleteTemplate);

// Файлы
router.get('/templates/:id/download', templateController.downloadTemplate);
router.get('/templates/:id/preview', templateController.previewTemplate);

// Версии
// ВАЖНО: более специфичные маршруты должны быть раньше общих
router.get('/templates/:id/versions/compare/:version1Id/:version2Id', templateController.compareVersions);
router.post('/templates/:id/versions/:versionId/restore', templateController.restoreVersion);
router.post('/templates/:id/versions', upload.single('file'), templateController.uploadNewVersion);
router.get('/templates/:id/versions', templateController.getTemplateVersions);

// Метаданные
router.get('/templates/:id/metadata', templateController.getTemplateMetadata);
router.patch('/templates/:id/status', templateController.updateTemplateStatus);

// Справочники
router.get('/categories', templateController.getCategories);
router.get('/departments', templateController.getDepartments);
router.get('/tags', templateController.getPopularTags);

router.use(handleMulterError);

export default router;