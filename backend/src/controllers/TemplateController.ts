/**
 * Template controller: wires services and delegates to handlers.
 */

import { Request, Response } from 'express';
import { FileStorageService } from '../services/FileStorageService';
import { ElasticsearchService } from '../services/ElasticsearchService';
import { RedisService } from '../services/RedisService';
import { OfficeDocumentService } from '../services/OfficeDocumentService';
import { PdfService } from '../services/PdfService';
import { VersionCompareService } from '../services/VersionCompareService';
import type { TemplateControllerServices } from './types';
import * as templateCrudHandlers from './handlers/templateCrudHandlers';
import * as templateSearchHandlers from './handlers/templateSearchHandlers';
import * as templateFileHandlers from './handlers/templateFileHandlers';
import * as templateVersionHandlers from './handlers/templateVersionHandlers';
import * as templateMetadataHandlers from './handlers/templateMetadataHandlers';

export class TemplateController {
  private services: TemplateControllerServices;

  constructor() {
    const fileStorage = new FileStorageService({
      type: (process.env.STORAGE_TYPE as 'local' | 's3') ?? 'local',
      local: {
        uploadPath: process.env.UPLOAD_PATH ?? './uploads',
        baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
      },
      s3: {
        bucket: process.env.S3_BUCKET ?? '',
        region: process.env.S3_REGION ?? '',
        accessKeyId: process.env.S3_ACCESS_KEY ?? '',
        secretAccessKey: process.env.S3_SECRET_KEY ?? '',
        endpoint: process.env.S3_ENDPOINT ?? 'https://storage.yandexcloud.net',
      },
    });

    fileStorage.testConnection().then((success) => {
      if (!success) {
        console.error('❌ Storage connection failed. Check your S3 configuration.');
      }
    });

    const elasticsearch = new ElasticsearchService();
    const redis = new RedisService();
    const officeService = new OfficeDocumentService();
    const pdfService = new PdfService();
    const versionCompare = new VersionCompareService(fileStorage, officeService, pdfService);

    this.services = {
      fileStorage,
      elasticsearch,
      redis,
      officeService,
      pdfService,
      versionCompare,
    };
  }

  createTemplate = (req: Request, res: Response) =>
    templateCrudHandlers.createTemplate(req, res, this.services);

  getTemplates = (req: Request, res: Response) =>
    templateCrudHandlers.getTemplates(req, res, this.services);

  getTemplate = (req: Request, res: Response) =>
    templateCrudHandlers.getTemplate(req, res, this.services);

  updateTemplate = (req: Request, res: Response) =>
    templateCrudHandlers.updateTemplate(req, res, this.services);

  deleteTemplate = (req: Request, res: Response) =>
    templateCrudHandlers.deleteTemplate(req, res, this.services);

  searchTemplates = (req: Request, res: Response) =>
    templateSearchHandlers.searchTemplates(req, res, this.services);

  searchTemplatesEnhanced = (req: Request, res: Response) =>
    templateSearchHandlers.searchTemplatesEnhanced(req, res, this.services);

  autocomplete = (req: Request, res: Response) =>
    templateSearchHandlers.autocomplete(req, res, this.services);

  downloadTemplate = (req: Request, res: Response) =>
    templateFileHandlers.downloadTemplate(req, res, this.services);

  downloadVersion = (req: Request, res: Response) =>
    templateFileHandlers.downloadVersion(req, res, this.services);

  previewTemplate = (req: Request, res: Response) =>
    templateFileHandlers.previewTemplate(req, res, this.services);

  previewVersion = (req: Request, res: Response) =>
    templateFileHandlers.previewVersion(req, res, this.services);

  uploadNewVersion = (req: Request, res: Response) =>
    templateFileHandlers.uploadNewVersion(req, res, this.services);

  getTemplateVersions = (req: Request, res: Response) =>
    templateVersionHandlers.getTemplateVersions(req, res, this.services);

  restoreVersion = (req: Request, res: Response) =>
    templateVersionHandlers.restoreVersion(req, res, this.services);

  compareVersions = (req: Request, res: Response) =>
    templateVersionHandlers.compareVersions(req, res, this.services);

  getTemplateMetadata = (req: Request, res: Response) =>
    templateMetadataHandlers.getTemplateMetadata(req, res, this.services);

  updateTemplateStatus = (req: Request, res: Response) =>
    templateMetadataHandlers.updateTemplateStatus(req, res, this.services);

  getCategories = (req: Request, res: Response) =>
    templateMetadataHandlers.getCategories(req, res, this.services);

  getDepartments = (req: Request, res: Response) =>
    templateMetadataHandlers.getDepartments(req, res, this.services);

  getPopularTags = (req: Request, res: Response) =>
    templateMetadataHandlers.getPopularTags(req, res, this.services);

  getTemplateStats = (req: Request, res: Response) =>
    templateMetadataHandlers.getTemplateStats(req, res, this.services);
}
