import { Request, Response } from 'express';
import Template from '../models/Template';
import TemplateVersion from '../models/TemplateVersion';
import { FileStorageService } from '../services/FileStorageService';
import { ElasticsearchService } from '../services/ElasticsearchService';
import { RedisService } from '../services/RedisService';
import fs from 'fs';
import path from 'path';

export class TemplateController {
  private fileStorage: FileStorageService;
  private elasticsearch: ElasticsearchService;
  private redis: RedisService;

  constructor() {
    this.fileStorage = new FileStorageService({
      type: process.env.STORAGE_TYPE as 'local' | 's3' || 'local',
      local: {
        uploadPath: process.env.UPLOAD_PATH || './uploads',
        baseUrl: process.env.BASE_URL || 'http://localhost:3000'
      },
      s3: {
        bucket: process.env.S3_BUCKET || '',
        region: process.env.S3_REGION || '',
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
        endpoint: process.env.S3_ENDPOINT || 'https://storage.yandexcloud.net'
      }
    });

    this.fileStorage.testConnection().then(success => {
      if (!success) {
        console.error('❌ Storage connection failed. Check your S3 configuration.');
      }
    });

    this.elasticsearch = new ElasticsearchService();
    this.redis = new RedisService();
  }

  createTemplate = async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'File is required' });
      }

    // Парсинг tags
    let tags: string[] = [];
    if (req.body.tags) {
      try {
        if (typeof req.body.tags === 'string') {
          tags = JSON.parse(req.body.tags);
        } else if (Array.isArray(req.body.tags)) {
          tags = req.body.tags;
        }
      } catch (parseError) {
        if (typeof req.body.tags === 'string') {
          tags = req.body.tags.split(',').map((tag: string) => tag.trim());
        }
      }
    }

    const fileData = await this.fileStorage.uploadFile(file);

    const templateFileData = {
      originalName: fileData.originalName,
      storedName: fileData.storedName,
      mimeType: fileData.mimeType,
      size: fileData.size,
      url: fileData.url,
      checksum: fileData.checksum 
    };

    const templateData = {
      ...req.body,
      tags: tags,
      file: templateFileData, 
      metadata: {
        author: req.body.author || 'system',
        status: req.body.status || 'draft',
        version: 1,
        lastModified: new Date(),
        checksum: fileData.checksum
      }
    };

    const template = new Template(templateData);
      await template.save();

      // Создаем первую версию
      const templateVersion = new TemplateVersion({
        templateId: template._id,
        version: 1,
        changes: 'Initial version',
        file: templateFileData,
        metadata: {
          author: template.metadata.author,
          status: template.metadata.status,
          created: new Date()
        }
      });
      await templateVersion.save();

      // Индексируем в Elasticsearch
      await this.elasticsearch.indexTemplate(template);

      // Инвалидируем кэш списков шаблонов
      await this.redis.delPattern('templates:*');

      res.status(201).json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getTemplates = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, category, department, status } = req.query;
      
      // Создаем ключ кэша на основе параметров запроса
      const cacheKey = `templates:${page}:${limit}:${category}:${department}:${status}`;
      
      // Пытаемся получить данные из кэша
      const cachedData = await this.redis.get(cacheKey);
      if (cachedData) {
        console.log('Cache hit for:', cacheKey);
        return res.json(JSON.parse(cachedData));
      }

      const filter: any = {};
      if (category) filter.category = category;
      if (department) filter.department = department;
      if (status) filter['metadata.status'] = status;

      const templates = await Template.find(filter)
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .sort({ 'metadata.lastModified': -1 });

      const total = await Template.countDocuments(filter);

      const responseData = {
        templates,
        totalPages: Math.ceil(total / Number(limit)),
        currentPage: Number(page),
        total
      };

      // Сохраняем в кэш на 5 минут
      await this.redis.set(cacheKey, JSON.stringify(responseData), 300);

      res.json(responseData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getTemplate = async (req: Request, res: Response) => {
    try {
      const templateId = req.params.id;
      const cacheKey = `template:${templateId}`;
      
      // Пытаемся получить из кэша
      const cachedTemplate = await this.redis.get(cacheKey);
      if (cachedTemplate) {
        console.log('Cache hit for template:', templateId);
        return res.json(JSON.parse(cachedTemplate));
      }

      const template = await Template.findById(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Сохраняем в кэш на 10 минут
      await this.redis.set(cacheKey, JSON.stringify(template), 600);

      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  updateTemplate = async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const updateFields: any = {};
    
    // Простые поля
    const simpleFields = ['name', 'description', 'category', 'department'];
    simpleFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    // Tags
    if (req.body.tags) {
      let tags: string[] = [];
      try {
        if (typeof req.body.tags === 'string') {
          tags = JSON.parse(req.body.tags);
        } else if (Array.isArray(req.body.tags)) {
          tags = req.body.tags;
        }
      } catch (parseError) {
        if (typeof req.body.tags === 'string') {
          tags = req.body.tags.split(',').map((tag: string) => tag.trim());
        }
      }
      updateFields.tags = tags;
    }

    let newFileData = null;
    let shouldCreateVersion = false;
    let versionChanges = req.body.changes || '';
    let newVersion = template.metadata.version;

    // Обработка файла
    if (req.file) {
      shouldCreateVersion = true;
      await this.fileStorage.deleteFile(template.file.storedName);
      newFileData = await this.fileStorage.uploadFile(req.file);
      
      updateFields.file = {
        originalName: newFileData.originalName,
        storedName: newFileData.storedName,
        mimeType: newFileData.mimeType,
        size: newFileData.size,
        url: newFileData.url,
        checksum: newFileData.checksum
      };
      
      newVersion += 1;
      updateFields['metadata.version'] = newVersion;
      updateFields['metadata.lastModified'] = new Date();
      updateFields['metadata.checksum'] = newFileData.checksum;
      versionChanges = versionChanges || 'File updated';
    }

    // Критические изменения без файла
    const criticalFields = ['name', 'description', 'category', 'department'];
    const hasCriticalChanges = criticalFields.some(field => 
      req.body[field] && req.body[field] !== template[field as keyof typeof template]
    );

    if (hasCriticalChanges && !shouldCreateVersion) {
      shouldCreateVersion = true;
      newVersion += 1;
      updateFields['metadata.version'] = newVersion;
      updateFields['metadata.lastModified'] = new Date();
      versionChanges = versionChanges || 'Content updated';
    }

    // Явное создание версии
    if (req.body.createVersion === 'true' && !shouldCreateVersion) {
      shouldCreateVersion = true;
      newVersion += 1;
      updateFields['metadata.version'] = newVersion;
      updateFields['metadata.lastModified'] = new Date();
      versionChanges = versionChanges || 'Manual version creation';
    }

    // Обновление author и status
    if (req.body.author) {
      updateFields['metadata.author'] = req.body.author;
    }
    if (req.body.status) {
      updateFields['metadata.status'] = req.body.status;
    }

    // создание версии
    if (shouldCreateVersion) {
      const versionFileData = newFileData ? {
        originalName: newFileData.originalName,
        storedName: newFileData.storedName,
        mimeType: newFileData.mimeType,
        size: newFileData.size,
        url: newFileData.url,
        checksum: newFileData.checksum
      } : {
        originalName: template.file.originalName,
        storedName: template.file.storedName,
        mimeType: template.file.mimeType,
        size: template.file.size,
        url: template.file.url,
        checksum: template.file.checksum || 'fallback-checksum'
      };

      const templateVersion = new TemplateVersion({
        templateId: template._id,
        version: newVersion,
        changes: versionChanges,
        file: versionFileData,
        metadata: {
          author: req.body.author || template.metadata.author,
          status: req.body.status || template.metadata.status,
          created: new Date()
        }
      });
      await templateVersion.save();
    }

    // обновление шаблона
    const updatedTemplate = await Template.findByIdAndUpdate(
        templateId,
        { $set: updateFields },
        { new: true, runValidators: true }
      );

      if (updatedTemplate) {
        await this.elasticsearch.updateTemplate(updatedTemplate);
        
        // Инвалидируем кэш
        await this.redis.del(`template:${templateId}`);
        await this.redis.delPattern('templates:*');
        await this.redis.delPattern(`template_versions:${templateId}:*`);
      }

      res.json(updatedTemplate);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  restoreTemplateVersion = async (req: Request, res: Response) => {
  try {
    const { id, versionId } = req.params;
    
    console.log('Restoring version:', { id, versionId });

    // 1. Находим версию для восстановления
    const versionToRestore = await TemplateVersion.findById(versionId);
    if (!versionToRestore) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // 2. Проверяем принадлежность
    if (versionToRestore.templateId.toString() !== id) {
      return res.status(400).json({ error: 'Version does not belong to this template' });
    }

    // 3. Находим текущий шаблон
    const currentTemplate = await Template.findById(id);
    if (!currentTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // 4. Увеличиваем версию
    const newVersionNumber = currentTemplate.metadata.version + 1;
    
    // 5. ВАЖНО: Полностью обновляем шаблон данными из версии
    // (если в TemplateVersion хранятся полные данные шаблона)
    
    const updateData: any = {
      // Обновляем файл из восстанавливаемой версии
      file: {
        originalName: versionToRestore.file.originalName,
        storedName: versionToRestore.file.storedName,
        mimeType: versionToRestore.file.mimeType,
        size: versionToRestore.file.size,
        url: versionToRestore.file.url,
        checksum: versionToRestore.file.checksum
      },
      // Обновляем метаданные
      'metadata.version': newVersionNumber,
      'metadata.lastModified': new Date(),
      'metadata.checksum': versionToRestore.file.checksum,
      // Также обновляем статус если он был в версии
      'metadata.status': versionToRestore.metadata?.status || currentTemplate.metadata.status
    };

    // . Обновляем шаблон
    const updatedTemplate = await Template.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // 7. Создаем запись о восстановлении как новую версию
    const restorationVersion = new TemplateVersion({
      templateId: currentTemplate._id,
      version: newVersionNumber,
      changes: `Restored from version ${versionToRestore.version}: ${versionToRestore.changes}`,
      file: versionToRestore.file,
      metadata: {
        author: req.body.author || currentTemplate.metadata.author,
        status: versionToRestore.metadata?.status || currentTemplate.metadata.status,
        created: new Date()
      }
    });
    await restorationVersion.save();

    // 8. Обновляем поиск и кэш
    await this.elasticsearch.updateTemplate(updatedTemplate!);
    await this.redis.del(`template:${id}`);
    await this.redis.delPattern('templates:*');
    await this.redis.delPattern(`template_versions:${id}:*`);

    // 9. Возвращаем обновленный шаблон
    res.json({
      message: `Version ${versionToRestore.version} restored as version ${newVersionNumber}`,
      template: updatedTemplate, 
      restoredVersion: versionToRestore.version,
      newVersion: newVersionNumber,
      success: true
    });

  } catch (error: any) {
    console.error('Restore version error:', error);
    res.status(500).json({ 
      error: error.message,
      success: false 
    });
  }
};

  searchTemplatesEnhanced = async (req: Request, res: Response) => {
  try {
    const { 
      q, 
      category, 
      department, 
      status,
      tags,
      highlight = 'true',
      fuzzy = 'true',
      fields = 'name,description,tags'
    } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const searchFields = (fields as string).split(',').map(f => f.trim());
    
    const results = await this.elasticsearch.searchTemplatesEnhanced(q as string, {
      category: category as string,
      department: department as string,
      status: status as string,
      tags: tags ? (tags as string).split(',').map(t => t.trim()) : [],
      highlight: highlight === 'true',
      fuzzy: fuzzy === 'true',
      fields: searchFields
    });

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 7. Автокомплит для поиска
autocomplete = async (req: Request, res: Response) => {
  try {
    const { q, field = 'name' } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await this.elasticsearch.autocomplete(
      q as string,
      field as 'name' | 'category' | 'tags'
    );

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 8. Скачивание файла шаблона
downloadTemplate = async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const template = await Template.findById(templateId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Если файл хранится локально
    if (process.env.STORAGE_TYPE === 'local') {
      const filePath = path.join(process.env.UPLOAD_PATH || './uploads', template.file.storedName);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.download(filePath, template.file.originalName);
    } else {
      // Для S3 редирект на URL файла
      res.redirect(template.file.url);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 9. Предпросмотр файла
previewTemplate = async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const template = await Template.findById(templateId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const previewableTypes = [
      'application/pdf',
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'text/plain', 'text/html'
    ];

    if (previewableTypes.includes(template.file.mimeType)) {
      // Для поддерживаемых типов - отдаем с правильным Content-Type
      res.set('Content-Type', template.file.mimeType);
      
      if (process.env.STORAGE_TYPE === 'local') {
        const filePath = path.join(process.env.UPLOAD_PATH || './uploads', template.file.storedName);
        res.sendFile(path.resolve(filePath));
      } else {
        // Для S3 - редирект
        res.redirect(template.file.url);
      }
    } else {
      res.status(415).json({ 
        error: 'File type not supported for preview',
        mimeType: template.file.mimeType
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 10. Загрузка новой версии файла (уже есть как часть updateTemplate)
uploadNewVersion = async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Используем существующий код из updateTemplate
    req.body.createVersion = 'true';
    req.body.changes = req.body.changes || 'New version uploaded';
    
    return this.updateTemplate(req, res);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 12. Восстановление версии
restoreVersion = async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const versionId = req.params.versionId;

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const version = await TemplateVersion.findById(versionId);
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Создаем новую версию на основе восстановленной
    const newVersionNumber = template.metadata.version + 1;
    
    const newVersion = new TemplateVersion({
      templateId: template._id,
      version: newVersionNumber,
      changes: `Restored from version ${version.version}`,
      file: version.file,
      metadata: {
        author: req.body.author || template.metadata.author,
        status: template.metadata.status,
        created: new Date()
      }
    });
    await newVersion.save();

    // Обновляем основной шаблон
    const updatedTemplate = await Template.findByIdAndUpdate(
      templateId,
      {
        $set: {
          'file': version.file,
          'metadata.version': newVersionNumber,
          'metadata.lastModified': new Date()
        }
      },
      { new: true }
    );

    // Обновляем Elasticsearch
    if (updatedTemplate) {
      await this.elasticsearch.updateTemplate(updatedTemplate);
      
      // Инвалидируем кэш
      await this.redis.del(`template:${templateId}`);
      await this.redis.delPattern('templates:*');
      await this.redis.delPattern(`template_versions:${templateId}:*`);
    }

    res.json({
      message: `Version ${version.version} restored as version ${newVersionNumber}`,
      template: updatedTemplate
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 13. Получение метаданных шаблона
getTemplateMetadata = async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const cacheKey = `template_metadata:${templateId}`;
    
    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const template = await Template.findById(templateId).select('name metadata category department tags');
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const metadata = {
      id: template._id,
      name: template.name,
      category: template.category,
      department: template.department,
      tags: template.tags,
      author: template.metadata.author,
      version: template.metadata.version,
      status: template.metadata.status,
      lastModified: template.metadata.lastModified,
      checksum: template.metadata.checksum,
      createdAt: (template as any).createdAt,
      updatedAt: (template as any).updatedAt
    };

    // Кэшируем на 5 минут
    await this.redis.set(cacheKey, JSON.stringify(metadata), 300);

    res.json(metadata);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 14. Обновление статуса шаблона
updateTemplateStatus = async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const { status } = req.body;

    if (!status || !['draft', 'approved', 'deprecated'].includes(status)) {
      return res.status(400).json({ 
        error: 'Valid status is required (draft, approved, deprecated)' 
      });
    }

    const template = await Template.findByIdAndUpdate(
      templateId,
      {
        $set: {
          'metadata.status': status,
          'metadata.lastModified': new Date()
        }
      },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Обновляем Elasticsearch
    await this.elasticsearch.updateTemplate(template);
    
    // Инвалидируем кэш
    await this.redis.del(`template:${templateId}`);
    await this.redis.del(`template_metadata:${templateId}`);
    await this.redis.delPattern('templates:*');

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 15. Получение доступных категорий
getCategories = async (req: Request, res: Response) => {
  try {
    const cacheKey = 'categories';
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // Базовые категории по умолчанию
    const defaultCategories = [
      'Документация',
      'Формы',
      'Отчеты',
      'Инструкции',
      'Презентации',
      'Шаблоны писем',
      'Договоры',
      'Политики',
    ];

    // Получаем уникальные категории из существующих шаблонов
    const templateCategories = await Template.distinct('category');
    
    // Объединяем базовые категории с категориями из шаблонов, убираем дубликаты
    const allCategories = [...new Set([...defaultCategories, ...templateCategories])].sort();
    
    // Кэшируем на 10 минут
    await this.redis.set(cacheKey, JSON.stringify(allCategories), 600);

    res.json(allCategories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 16. Получение доступных отделов
getDepartments = async (req: Request, res: Response) => {
  try {
    const cacheKey = 'departments';
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // Базовые отделы по умолчанию
    const defaultDepartments = [
      'Отдел кадров',
      'Финансовый отдел',
      'IT-отдел',
      'Отдел продаж',
      'Маркетинг',
      'Юридический отдел',
      'Отдел закупок',
      'Производственный отдел',
    ];

    // Получаем уникальные отделы из существующих шаблонов
    const templateDepartments = await Template.distinct('department');
    
    // Объединяем базовые отделы с отделами из шаблонов, убираем дубликаты
    const allDepartments = [...new Set([...defaultDepartments, ...templateDepartments])].sort();
    
    // Кэшируем на 10 минут
    await this.redis.set(cacheKey, JSON.stringify(allDepartments), 600);

    res.json(allDepartments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 17. Получение популярных тегов
getPopularTags = async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    const cacheKey = `tags:${limit}`;
    
    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const tags = await Template.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: Number(limit) },
      { $project: { tag: '$_id', count: 1, _id: 0 } }
    ]);

    // Кэшируем на 5 минут
    await this.redis.set(cacheKey, JSON.stringify(tags), 300);

    res.json(tags);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 18. Статистика по шаблонам
getTemplateStats = async (req: Request, res: Response) => {
  try {
    const cacheKey = 'template_stats';
    const cachedData = await this.redis.get(cacheKey);
    
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const stats = await Promise.all([
      // Статистика по статусам
      Template.aggregate([
        { $group: { _id: '$metadata.status', count: { $sum: 1 } } }
      ]),
      
      // Статистика по категориям
      Template.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Статистика по отделам
      Template.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Общее количество
      Template.countDocuments(),
      
      // Количество версий
      TemplateVersion.countDocuments()
    ]);

    const result = {
      byStatus: stats[0].reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      byCategory: stats[1],
      byDepartment: stats[2],
      totalTemplates: stats[3],
      totalVersions: stats[4],
      lastUpdated: new Date()
    };

    // Кэшируем на 2 минуты
    await this.redis.set(cacheKey, JSON.stringify(result), 120);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};



  deleteTemplate = async (req: Request, res: Response) => {
    try {
      const templateId = req.params.id;
      const template = await Template.findById(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      await this.fileStorage.deleteFile(template.file.storedName);
      await Template.findByIdAndDelete(templateId);
      await TemplateVersion.deleteMany({ templateId: templateId });
      await this.elasticsearch.deleteTemplate(templateId);

      // Инвалидируем весь связанный кэш
      await this.redis.del(`template:${templateId}`);
      await this.redis.delPattern('templates:*');
      await this.redis.delPattern(`template_versions:${templateId}:*`);

      res.json({ message: 'Template deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };


  searchTemplates = async (req: Request, res: Response) => {
  try {
    const { 
      q, 
      category, 
      department, 
      status,
      page = 1, 
      limit = 10 
    } = req.query;
    
    console.log('Search request:', { 
      q, 
      category, 
      department, 
      status,
      page,
      limit 
    });
    
    if (!q) {
      return res.status(400).json({ 
        success: false,
        error: 'Query parameter "q" is required' 
      });
    }

    // Выполняем поиск
    const searchResults = await this.elasticsearch.searchTemplates(q as string, {
      category: category as string,
      department: department as string,
      status: status as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    console.log('Elasticsearch results:', {
      took: searchResults.took,
      total: searchResults.total,
      hitsCount: searchResults.hits?.length || 0,
      totalType: typeof searchResults.total
    });

    // Форматируем ответ - УБЕДИТЕСЬ, что total это число
    const totalNumber = Number(searchResults.total) || 0;
    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = parseInt(limit as string) || 10;
    
    const response = {
      success: true,
      data: searchResults.hits || [],
      total: totalNumber, 
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalNumber / limitNumber),
      took: searchResults.took || 0
    };

    console.log('Response prepared:', {
      success: response.success,
      total: response.total,
      dataLength: response.data.length,
      totalType: typeof response.total
    });
    
    res.json(response);
    
  } catch (error: any) {
    console.error('Search error:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Search failed' 
    });
  }
};


  getTemplateVersions = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const templateId = req.params.id;
      
      const cacheKey = `template_versions:${templateId}:${page}:${limit}`;
      
      const cachedData = await this.redis.get(cacheKey);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const versions = await TemplateVersion.find({ 
        templateId: templateId 
      })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ version: -1 });

      const total = await TemplateVersion.countDocuments({ 
        templateId: templateId 
      });

      const responseData = {
        versions,
        totalPages: Math.ceil(total / Number(limit)),
        currentPage: Number(page),
        total
      };

      // Кэшируем на 10 минут
      await this.redis.set(cacheKey, JSON.stringify(responseData), 600);

      res.json(responseData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}