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

    if (!PREVIEWABLE_TYPES.includes(template.file.mimeType)) {
      res.status(415).json({
        error: 'File type not supported for preview',
        mimeType: template.file.mimeType,
      });
      return;
    }

    res.set('Content-Type', template.file.mimeType);

    if (process.env.STORAGE_TYPE === 'local') {
      const filePath = path.join(process.env.UPLOAD_PATH ?? './uploads', template.file.storedName);
      res.sendFile(path.resolve(filePath));
    } else {
      res.redirect(template.file.url);
    }
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
