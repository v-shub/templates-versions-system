/**
 * Handlers for template versions: list, restore, compare.
 */

import { Request, Response } from 'express';
import Template from '../../models/Template';
import TemplateVersion from '../../models/TemplateVersion';
import type { TemplateControllerServices } from '../types';
import type { AuthRequest } from '../../middleware/auth';

export async function getTemplateVersions(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const { page = 1, limit = 10 } = req.query;
    const templateId = req.params.id;
    const cacheKey = `template_versions:${templateId}:${page}:${limit}`;

    const cachedData = await services.redis.get(cacheKey);
    if (cachedData) {
      res.json(JSON.parse(cachedData));
      return;
    }

    const versions = await TemplateVersion.find({ templateId })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ version: -1 });

    const total = await TemplateVersion.countDocuments({ templateId });
    const responseData = {
      versions,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total,
    };

    await services.redis.set(cacheKey, JSON.stringify(responseData), 600);
    res.json(responseData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

async function getCopiedFileDataForRestore(services: TemplateControllerServices, version: any): Promise<any> {
  try {
    const fileExists = await services.fileStorage.fileExists(version.file.storedName);
    if (fileExists) {
      return await services.fileStorage.copyFile(
        version.file.storedName,
        version.file.originalName,
        version.file.mimeType
      );
    }
    return {
      originalName: version.file.originalName,
      storedName: version.file.storedName,
      mimeType: version.file.mimeType,
      size: version.file.size,
      url: version.file.url,
      checksum: version.file.checksum || 'missing-file',
    };
  } catch (error: any) {
    console.warn(`Could not copy file for restore: ${error.message}`);
    return {
      originalName: version.file.originalName,
      storedName: version.file.storedName,
      mimeType: version.file.mimeType,
      size: version.file.size,
      url: version.file.url,
      checksum: version.file.checksum || 'missing-file',
    };
  }
}

function versionAuthor(authReq: AuthRequest, bodyAuthor?: string, fallback?: string): string {
  return authReq.user?.name ?? bodyAuthor ?? fallback ?? 'system';
}

export async function restoreVersion(
  req: AuthRequest,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const { id, versionId } = req.params;

    console.log('Restoring version:', { id, versionId });

    const versionToRestore = await TemplateVersion.findById(versionId);
    if (!versionToRestore) {
      res.status(404).json({ error: 'Version not found' });
      return;
    }

    if (versionToRestore.templateId.toString() !== id) {
      res.status(400).json({ error: 'Version does not belong to this template' });
      return;
    }

    const currentTemplate = await Template.findById(id);
    if (!currentTemplate) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const newVersionNumber = currentTemplate.metadata.version + 1;
    const copiedFileData = await getCopiedFileDataForRestore(services, versionToRestore);

    const updateData: any = {
      file: {
        originalName: copiedFileData.originalName,
        storedName: copiedFileData.storedName,
        mimeType: copiedFileData.mimeType,
        size: copiedFileData.size,
        url: copiedFileData.url,
        checksum: copiedFileData.checksum,
      },
      'metadata.version': newVersionNumber,
      'metadata.lastModified': new Date(),
      'metadata.checksum': copiedFileData.checksum,
      'metadata.status': versionToRestore.metadata?.status || currentTemplate.metadata.status,
    };

    const updatedTemplate = await Template.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    const author = versionAuthor(req, req.body.author, currentTemplate.metadata.author);
    const restorationVersion = new TemplateVersion({
      templateId: currentTemplate._id,
      version: newVersionNumber,
      changes: `Restored from version ${versionToRestore.version}: ${versionToRestore.changes}`,
      createdBy: req.user?._id,
      file: {
        originalName: copiedFileData.originalName,
        storedName: copiedFileData.storedName,
        mimeType: copiedFileData.mimeType,
        size: copiedFileData.size,
        url: copiedFileData.url,
        checksum: copiedFileData.checksum,
      },
      metadata: {
        author,
        status: versionToRestore.metadata?.status || currentTemplate.metadata.status,
        created: new Date(),
      },
    });
    await restorationVersion.save();

    if (updatedTemplate) {
      await services.elasticsearch.updateTemplate(updatedTemplate);
      await services.redis.del(`template:${id}`);
      await services.redis.delPattern('templates:*');
      await services.redis.delPattern(`template_versions:${id}:*`);

      // WebSocket: notify clients about version restore
      const io = (req as any).app?.get?.('io');
      if (io) {
        io.emit('template-changed', {
          templateId: String(id),
          versionId: String(restorationVersion._id),
          event: 'version_restored',
        });
      }
    }

    res.json({
      message: `Version ${versionToRestore.version} restored as version ${newVersionNumber}`,
      template: updatedTemplate,
      restoredVersion: versionToRestore.version,
      newVersion: newVersionNumber,
      success: true,
    });
  } catch (error: any) {
    console.error('Restore version error:', error);
    res.status(500).json({ error: error.message, success: false });
  }
}

export async function compareVersions(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const { version1Id, version2Id } = req.params;

    if (version1Id === version2Id) {
      res.status(400).json({ error: 'Cannot compare a version with itself' });
      return;
    }

    const version1 = await TemplateVersion.findById(version1Id);
    const version2 = await TemplateVersion.findById(version2Id);

    if (!version1) {
      res.status(404).json({ error: 'Version 1 not found' });
      return;
    }
    if (!version2) {
      res.status(404).json({ error: 'Version 2 not found' });
      return;
    }

    if (version1.templateId.toString() !== version2.templateId.toString()) {
      res.status(400).json({ error: 'Versions must belong to the same template' });
      return;
    }

    const template = await Template.findById(version1.templateId);
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const comparison = await services.versionCompare.compare(
      version1 as any,
      version2 as any,
      { name: template.name }
    );

    const cacheKey = `version_compare:${version1Id}:${version2Id}`;
    await services.redis.set(cacheKey, JSON.stringify(comparison), 3600);

    res.json(comparison);
  } catch (error: any) {
    console.error('Compare versions error:', error);
    res.status(500).json({ error: error.message });
  }
}
