/**
 * CRUD handlers for templates: create, get list, get one, update, delete.
 */

import { Request, Response } from 'express';
import Template from '../../models/Template';
import TemplateVersion from '../../models/TemplateVersion';
import type { TemplateControllerServices } from '../types';
import { parseTags } from './parseTags';
import logger from '../../logger';

export async function createTemplate(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }

    const tags = parseTags(req.body);
    const fileData = await services.fileStorage.uploadFile(file);

    const templateFileData = {
      originalName: fileData.originalName,
      storedName: fileData.storedName,
      mimeType: fileData.mimeType,
      size: fileData.size,
      url: fileData.url,
      checksum: fileData.checksum,
    };

    const templateData = {
      ...req.body,
      tags,
      file: templateFileData,
      metadata: {
        author: req.body.author || 'system',
        status: req.body.status || 'draft',
        version: 1,
        lastModified: new Date(),
        checksum: fileData.checksum,
      },
    };

    const template = new Template(templateData);
    await template.save();

    let versionFileData;
    try {
      versionFileData = await services.fileStorage.copyFile(
        templateFileData.storedName,
        templateFileData.originalName,
        templateFileData.mimeType
      );
    } catch (error: any) {
      console.warn(`Could not copy file for initial version: ${error.message}`);
      versionFileData = templateFileData;
    }

    const templateVersion = new TemplateVersion({
      templateId: template._id,
      version: 1,
      changes: 'Initial version',
      file: {
        originalName: versionFileData.originalName,
        storedName: versionFileData.storedName,
        mimeType: versionFileData.mimeType,
        size: versionFileData.size,
        url: versionFileData.url,
        checksum: versionFileData.checksum,
      },
      metadata: {
        author: template.metadata.author,
        status: template.metadata.status,
        created: new Date(),
      },
    });
    await templateVersion.save();

    if (process.env.REDIS_URL) {
      try {
        const { versionQueue } = await import('../../queue/jobs');
        await versionQueue.add('computeDiff', { versionId: (templateVersion as any)._id.toString() });
      } catch (err) {
        logger.warn('Failed to enqueue computeDiff', { err, versionId: (templateVersion as any)._id });
      }
    }

    await services.elasticsearch.indexTemplate(template);
    await services.redis.delPattern('templates:*');

    // WebSocket: notify clients about new template
    const io = (req as any).app?.get?.('io');
    if (io) {
      io.emit('template-changed', {
        templateId: String(template._id),
        versionId: String((templateVersion as any)._id),
        event: 'created',
      });
    }

    res.status(201).json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getTemplates(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const { page = 1, limit = 10, category, department, status } = req.query;
    const cacheKey = `templates:${page}:${limit}:${category}:${department}:${status}`;

    const cachedData = await services.redis.get(cacheKey);
    if (cachedData) {
      console.log('Cache hit for:', cacheKey);
      res.json(JSON.parse(cachedData));
      return;
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
      total,
    };

    await services.redis.set(cacheKey, JSON.stringify(responseData), 300);
    res.json(responseData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getTemplate(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const templateId = req.params.id;
    const cacheKey = `template:${templateId}`;

    const cachedTemplate = await services.redis.get(cacheKey);
    if (cachedTemplate) {
      console.log('Cache hit for template:', templateId);
      res.json(JSON.parse(cachedTemplate));
      return;
    }

    const template = await Template.findById(templateId);
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    await services.redis.set(cacheKey, JSON.stringify(template), 600);
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

async function getVersionFileData(
  services: TemplateControllerServices,
  newFileData: any,
  template: any
): Promise<any> {
  if (newFileData) {
    try {
      const fileExists = await services.fileStorage.fileExists(newFileData.storedName);
      if (fileExists) {
        const copied = await services.fileStorage.copyFile(
          newFileData.storedName,
          newFileData.originalName,
          newFileData.mimeType
        );
        return { originalName: copied.originalName, storedName: copied.storedName, mimeType: copied.mimeType, size: copied.size, url: copied.url, checksum: copied.checksum };
      }
      return { originalName: newFileData.originalName, storedName: newFileData.storedName, mimeType: newFileData.mimeType, size: newFileData.size, url: newFileData.url, checksum: newFileData.checksum };
    } catch (error: any) {
      console.warn(`Could not copy new file for version: ${error.message}`);
      return { originalName: newFileData.originalName, storedName: newFileData.storedName, mimeType: newFileData.mimeType, size: newFileData.size, url: newFileData.url, checksum: newFileData.checksum };
    }
  } else {
    try {
      const fileExists = await services.fileStorage.fileExists(template.file.storedName);
      if (fileExists) {
        const copied = await services.fileStorage.copyFile(
          template.file.storedName,
          template.file.originalName,
          template.file.mimeType
        );
        return { originalName: copied.originalName, storedName: copied.storedName, mimeType: copied.mimeType, size: copied.size, url: copied.url, checksum: copied.checksum };
      }
      return { originalName: template.file.originalName, storedName: template.file.storedName, mimeType: template.file.mimeType, size: template.file.size, url: template.file.url, checksum: template.file.checksum || 'missing-file' };
    } catch (error: any) {
      console.warn(`Could not copy file for version: ${error.message}`);
      return { originalName: template.file.originalName, storedName: template.file.storedName, mimeType: template.file.mimeType, size: template.file.size, url: template.file.url, checksum: template.file.checksum || 'missing-file' };
    }
  }
}

export async function updateTemplate(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const templateId = req.params.id;
    const template = await Template.findById(templateId);
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const updateFields: any = {};
    ['name', 'description', 'category', 'department'].forEach((field) => {
      if (req.body[field] !== undefined) updateFields[field] = req.body[field];
    });

    if (req.body.tags) {
      updateFields.tags = parseTags(req.body);
    }

    let newFileData: any = null;
    let shouldCreateVersion = false;
    let versionChanges = req.body.changes || '';
    let newVersion = template.metadata.version;

    if (req.file) {
      shouldCreateVersion = true;
      try {
        await services.fileStorage.deleteFile(template.file.storedName);
      } catch (error: any) {
        console.warn(`Could not delete old file: ${error.message}`);
      }
      newFileData = await services.fileStorage.uploadFile(req.file);
      updateFields.file = {
        originalName: newFileData.originalName,
        storedName: newFileData.storedName,
        mimeType: newFileData.mimeType,
        size: newFileData.size,
        url: newFileData.url,
        checksum: newFileData.checksum,
      };
      newVersion = template.metadata.version + 1;
      updateFields['metadata.version'] = newVersion;
      updateFields['metadata.lastModified'] = new Date();
      updateFields['metadata.checksum'] = newFileData.checksum;
      versionChanges = versionChanges || 'File updated';
    }

    const criticalFields = ['name', 'description', 'category', 'department'];
    const hasCriticalChanges = criticalFields.some(
      (field) => req.body[field] && req.body[field] !== (template as any)[field]
    );
    if (hasCriticalChanges && !shouldCreateVersion) {
      shouldCreateVersion = true;
      newVersion += 1;
      updateFields['metadata.version'] = newVersion;
      updateFields['metadata.lastModified'] = new Date();
      versionChanges = versionChanges || 'Content updated';
    }

    if (req.body.createVersion === 'true' && !shouldCreateVersion) {
      shouldCreateVersion = true;
      newVersion += 1;
      updateFields['metadata.version'] = newVersion;
      updateFields['metadata.lastModified'] = new Date();
      versionChanges = versionChanges || 'Manual version creation';
    }

    if (req.body.author) updateFields['metadata.author'] = req.body.author;
    if (req.body.status) updateFields['metadata.status'] = req.body.status;

    let savedVersion: any = null;
    if (shouldCreateVersion) {
      const versionFileData = await getVersionFileData(services, newFileData, template);
      const templateVersion = new TemplateVersion({
        templateId: template._id,
        version: newVersion,
        changes: versionChanges,
        file: versionFileData,
        metadata: {
          author: req.body.author || template.metadata.author,
          status: req.body.status || template.metadata.status,
          created: new Date(),
        },
      });
      await templateVersion.save();
      savedVersion = templateVersion;

      // Section 12.1: enqueue computeDiff when REDIS_URL is set (worker processes async)
      if (process.env.REDIS_URL) {
        try {
          const { versionQueue } = await import('../../queue/jobs');
          await versionQueue.add('computeDiff', { versionId: savedVersion._id.toString() });
        } catch (err) {
          logger.warn('Failed to enqueue computeDiff', { err, versionId: savedVersion._id });
        }
      }
    }

    const updatedTemplate = await Template.findByIdAndUpdate(
      templateId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (updatedTemplate) {
      await services.elasticsearch.updateTemplate(updatedTemplate);
      await services.redis.del(`template:${templateId}`);
      await services.redis.delPattern('templates:*');
      await services.redis.delPattern(`template_versions:${templateId}:*`);

      // WebSocket: notify clients about template update
      const io = (req as any).app?.get?.('io');
      if (io) {
        io.emit('template-changed', {
          templateId: String(templateId),
          versionId: savedVersion ? String(savedVersion._id) : undefined,
          event: shouldCreateVersion ? 'version_created' : 'updated',
        });
      }
    }

    res.json(updatedTemplate);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteTemplate(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const templateId = req.params.id;
    const template = await Template.findById(templateId);
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    await services.fileStorage.deleteFile(template.file.storedName);
    await Template.findByIdAndDelete(templateId);
    await TemplateVersion.deleteMany({ templateId });
    await services.elasticsearch.deleteTemplate(templateId);
    await services.redis.del(`template:${templateId}`);
    await services.redis.delPattern('templates:*');
    await services.redis.delPattern(`template_versions:${templateId}:*`);

    // WebSocket: notify clients about template deletion
    const io = (req as any).app?.get?.('io');
    if (io) {
      io.emit('template-changed', {
        templateId: String(templateId),
        event: 'deleted',
      });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
