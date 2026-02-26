/**
 * Handlers for template file download, preview, and upload new version.
 */

import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import Template from '../../models/Template';
import TemplateVersion from '../../models/TemplateVersion';
import type { TemplateControllerServices } from '../types';
import * as templateCrudHandlers from './templateCrudHandlers';

const PREVIEWABLE_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'text/plain', 'text/html',
];

const OFFICE_MIME_PATTERNS = ['wordprocessingml', 'spreadsheetml', 'presentationml'];

function isOfficeMimeType(mimeType: string): boolean {
  return OFFICE_MIME_PATTERNS.some((p) => mimeType.toLowerCase().includes(p));
}

function isPreviewableMimeType(mimeType: string): boolean {
  return PREVIEWABLE_TYPES.includes(mimeType) || isOfficeMimeType(mimeType);
}

export async function downloadTemplate(
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

    if (process.env.STORAGE_TYPE === 'local') {
      const filePath = path.join(process.env.UPLOAD_PATH ?? './uploads', template.file.storedName);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      res.download(filePath, template.file.originalName);
    } else {
      res.redirect(template.file.url);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function downloadVersion(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const templateId = req.params.id;
    const versionId = req.params.versionId;

    const version = await TemplateVersion.findOne({
      _id: versionId,
      templateId,
    });

    if (!version) {
      res.status(404).json({ error: 'Version not found' });
      return;
    }

    if (process.env.STORAGE_TYPE === 'local') {
      const filePath = path.join(
        process.env.UPLOAD_PATH ?? './uploads',
        version.file.storedName
      );

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      res.download(filePath, version.file.originalName);
    } else {
      res.redirect(version.file.url);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function previewTemplate(
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

    if (!isPreviewableMimeType(template.file.mimeType)) {
      res.status(415).json({
        error: 'File type not supported for preview',
        mimeType: template.file.mimeType,
      });
      return;
    }

    const buffer = await services.fileStorage.readFile(template.file.storedName);

    if (isOfficeMimeType(template.file.mimeType)) {
      const html = await services.officeService.convertOfficeToHtml(
        buffer,
        template.file.mimeType,
        template.file.originalName
      );
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
      return;
    }

    res.set('Content-Type', template.file.mimeType);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function previewVersion(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const templateId = req.params.id;
    const versionId = req.params.versionId;
    const version = await TemplateVersion.findOne({ _id: versionId, templateId });

    if (!version) {
      res.status(404).json({ error: 'Version not found' });
      return;
    }

    const file = version.file;
    if (!isPreviewableMimeType(file.mimeType)) {
      res.status(415).json({ error: 'File type not supported for preview', mimeType: file.mimeType });
      return;
    }

    const buffer = await services.fileStorage.readFile(file.storedName);

    if (isOfficeMimeType(file.mimeType)) {
      const html = await services.officeService.convertOfficeToHtml(
        buffer,
        file.mimeType,
        file.originalName
      );
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
      return;
    }

    res.set('Content-Type', file.mimeType);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function uploadNewVersion(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const templateId = req.params.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }

    const template = await Template.findById(templateId);
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    req.body.createVersion = 'true';
    req.body.changes = req.body.changes || 'New version uploaded';

    await templateCrudHandlers.updateTemplate(req, res, services);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
