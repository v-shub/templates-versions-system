/**
 * Shared types for template controller and handlers.
 */

import { FileStorageService } from '../services/FileStorageService';
import { ElasticsearchService } from '../services/ElasticsearchService';
import { RedisService } from '../services/RedisService';
import { OfficeDocumentService } from '../services/OfficeDocumentService';
import { PdfService } from '../services/PdfService';
import { VersionCompareService } from '../services/VersionCompareService';

export interface TemplateControllerServices {
  fileStorage: FileStorageService;
  elasticsearch: ElasticsearchService;
  redis: RedisService;
  officeService: OfficeDocumentService;
  pdfService: PdfService;
  versionCompare: VersionCompareService;
}
