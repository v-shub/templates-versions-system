/**
 * Handlers for template metadata, categories, departments, tags, and stats.
 */

import { Request, Response } from 'express';
import Template from '../../models/Template';
import type { TemplateControllerServices } from '../types';

const DEFAULT_CATEGORIES = [
  'Документация', 'Формы', 'Отчеты', 'Инструкции',
  'Презентации', 'Шаблоны писем', 'Договоры', 'Политики',
];

const DEFAULT_DEPARTMENTS = [
  'Отдел кадров', 'Финансовый отдел', 'IT-отдел', 'Отдел продаж',
  'Маркетинг', 'Юридический отдел', 'Отдел закупок', 'Производственный отдел',
];

export async function getTemplateMetadata(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const templateId = req.params.id;
    const cacheKey = `template_metadata:${templateId}`;
    const cachedData = await services.redis.get(cacheKey);
    if (cachedData) {
      res.json(JSON.parse(cachedData));
      return;
    }

    const template = await Template.findById(templateId).select('name metadata category department tags');
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
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
      updatedAt: (template as any).updatedAt,
    };

    await services.redis.set(cacheKey, JSON.stringify(metadata), 300);
    res.json(metadata);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateTemplateStatus(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const templateId = req.params.id;
    const { status } = req.body;

    if (!status || !['draft', 'approved', 'deprecated'].includes(status)) {
      res.status(400).json({ error: 'Valid status is required (draft, approved, deprecated)' });
      return;
    }

    const template = await Template.findByIdAndUpdate(
      templateId,
      { $set: { 'metadata.status': status, 'metadata.lastModified': new Date() } },
      { new: true }
    );

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    await services.elasticsearch.updateTemplate(template);
    await services.redis.del(`template:${templateId}`);
    await services.redis.del(`template_metadata:${templateId}`);
    await services.redis.delPattern('templates:*');
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getCategories(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const cacheKey = 'categories';
    const cachedData = await services.redis.get(cacheKey);
    if (cachedData) {
      res.json(JSON.parse(cachedData));
      return;
    }

    const templateCategories = await Template.distinct('category');
    const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...templateCategories])].sort();
    await services.redis.set(cacheKey, JSON.stringify(allCategories), 600);
    res.json(allCategories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getDepartments(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const cacheKey = 'departments';
    const cachedData = await services.redis.get(cacheKey);
    if (cachedData) {
      res.json(JSON.parse(cachedData));
      return;
    }

    const templateDepartments = await Template.distinct('department');
    const allDepartments = [...new Set([...DEFAULT_DEPARTMENTS, ...templateDepartments])].sort();
    await services.redis.set(cacheKey, JSON.stringify(allDepartments), 600);
    res.json(allDepartments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getPopularTags(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const { limit = 20 } = req.query;
    const cacheKey = `tags:${limit}`;
    const cachedData = await services.redis.get(cacheKey);
    if (cachedData) {
      res.json(JSON.parse(cachedData));
      return;
    }

    const tags = await Template.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: Number(limit) },
      { $project: { tag: '$_id', count: 1, _id: 0 } },
    ]);

    await services.redis.set(cacheKey, JSON.stringify(tags), 300);
    res.json(tags);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getTemplateStats(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const TemplateVersion = (await import('../../models/TemplateVersion')).default;
    const cacheKey = 'template_stats';
    const cachedData = await services.redis.get(cacheKey);
    if (cachedData) {
      res.json(JSON.parse(cachedData));
      return;
    }

    const stats = await Promise.all([
      Template.aggregate([{ $group: { _id: '$metadata.status', count: { $sum: 1 } } }]),
      Template.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Template.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Template.countDocuments(),
      TemplateVersion.countDocuments(),
    ]);

    const result = {
      byStatus: stats[0].reduce((acc: any, curr: any) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      byCategory: stats[1],
      byDepartment: stats[2],
      totalTemplates: stats[3],
      totalVersions: stats[4],
      lastUpdated: new Date(),
    };

    await services.redis.set(cacheKey, JSON.stringify(result), 120);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
