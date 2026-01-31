/**
 * Service for comparing two template versions (metadata and file content diff).
 */

import { diffLines } from 'diff';
import { FileStorageService } from './FileStorageService';
import { OfficeDocumentService } from './OfficeDocumentService';
import { PdfService } from './PdfService';
import type { ITemplateVersion } from '../models/TemplateVersion';
import type { Document } from 'mongoose';

const TEXT_MIME_TYPES = [
  'text/plain', 'text/html', 'text/css', 'text/javascript', 'text/csv', 'text/xml',
  'application/json', 'application/xml', 'application/javascript', 'application/x-javascript',
  'application/x-yaml', 'application/yaml',
];

const TEXT_EXTENSIONS = /\.(txt|md|json|xml|html|htm|css|js|ts|jsx|tsx|yaml|yml|csv|log|ini|conf|config|sh|bat|cmd|ps1|svg|rtf)$/i;

export interface VersionComparisonResult {
  templateId: string;
  templateName: string;
  version1: VersionSummary;
  version2: VersionSummary;
  differences: {
    metadata: Record<string, { old: unknown; new: unknown }>;
    fileMetadata: Record<string, { old: unknown; new: unknown }>;
    fileContent: FileContentComparison;
    summary: {
      hasChanges: boolean;
      metadataChangesCount: number;
      fileMetadataChangesCount: number;
      fileContentChanged: boolean;
      totalChangesCount: number;
    };
  };
  comparedAt: Date;
}

interface VersionSummary {
  id: string;
  version: number;
  changes: string;
  author: string;
  status: string;
  createdAt: Date;
  file: { originalName: string; mimeType: string; size: number; checksum?: string };
}

interface FileContentComparison {
  contentChanged: boolean;
  isTextFile: boolean;
  fileType: string | null;
  diff: Array<{ value: string; added: boolean; removed: boolean }> | null;
  error: string | null;
}

export class VersionCompareService {
  constructor(
    private fileStorage: FileStorageService,
    private officeService: OfficeDocumentService,
    private pdfService: PdfService
  ) {}

  async compare(
    version1: ITemplateVersion & Document,
    version2: ITemplateVersion & Document,
    template: { name: string }
  ): Promise<VersionComparisonResult> {
    const metadataChanges = this.buildMetadataChanges(version1, version2);
    const fileContentComparison = await this.buildFileContentComparison(version1, version2);
    const fileMetadataChanges = this.buildFileMetadataChanges(version1, version2);

    const metadataChangesCount = Object.keys(metadataChanges).length;
    const fileMetadataChangesCount = Object.keys(fileMetadataChanges).length;
    const hasChanges =
      metadataChangesCount > 0 ||
      fileContentComparison.contentChanged ||
      fileMetadataChangesCount > 0;

    return {
      templateId: version1.templateId.toString(),
      templateName: template.name,
      version1: this.toVersionSummary(version1),
      version2: this.toVersionSummary(version2),
      differences: {
        metadata: metadataChanges,
        fileMetadata: fileMetadataChanges,
        fileContent: fileContentComparison,
        summary: {
          hasChanges,
          metadataChangesCount,
          fileMetadataChangesCount,
          fileContentChanged: fileContentComparison.contentChanged,
          totalChangesCount:
            metadataChangesCount +
            fileMetadataChangesCount +
            (fileContentComparison.contentChanged ? 1 : 0),
        },
      },
      comparedAt: new Date(),
    };
  }

  private toVersionSummary(v: ITemplateVersion & Document): VersionSummary {
    return {
      id: String(v._id),
      version: v.version,
      changes: v.changes,
      author: v.metadata.author,
      status: v.metadata.status,
      createdAt: v.metadata.created,
      file: {
        originalName: v.file.originalName,
        mimeType: v.file.mimeType,
        size: v.file.size,
        checksum: v.file.checksum,
      },
    };
  }

  private buildMetadataChanges(
    v1: ITemplateVersion & Document,
    v2: ITemplateVersion & Document
  ): Record<string, { old: unknown; new: unknown }> {
    const metadataChanges: Record<string, { old: unknown; new: unknown }> = {};
    if (v1.version !== v2.version) {
      metadataChanges.version = { old: v1.version, new: v2.version };
    }
    if (v1.changes !== v2.changes) {
      metadataChanges.changes = { old: v1.changes, new: v2.changes };
    }
    if (v1.metadata.author !== v2.metadata.author) {
      metadataChanges.author = { old: v1.metadata.author, new: v2.metadata.author };
    }
    if (v1.metadata.status !== v2.metadata.status) {
      metadataChanges.status = { old: v1.metadata.status, new: v2.metadata.status };
    }
    if (v1.metadata.created.getTime() !== v2.metadata.created.getTime()) {
      metadataChanges.created = { old: v1.metadata.created, new: v2.metadata.created };
    }
    const v1Any = v1 as any;
    const v2Any = v2 as any;
    if (v1Any.name !== undefined && v2Any.name !== undefined && v1Any.name !== v2Any.name) {
      metadataChanges.name = { old: v1Any.name, new: v2Any.name };
    }
    if (v1Any.description !== undefined && v2Any.description !== undefined && v1Any.description !== v2Any.description) {
      metadataChanges.description = { old: v1Any.description, new: v2Any.description };
    }
    return metadataChanges;
  }

  private buildFileMetadataChanges(
    v1: ITemplateVersion & Document,
    v2: ITemplateVersion & Document
  ): Record<string, { old: unknown; new: unknown }> {
    const out: Record<string, { old: unknown; new: unknown }> = {};
    if (v1.file.originalName !== v2.file.originalName) {
      out.originalName = { old: v1.file.originalName, new: v2.file.originalName };
    }
    if (v1.file.mimeType !== v2.file.mimeType) {
      out.mimeType = { old: v1.file.mimeType, new: v2.file.mimeType };
    }
    if (v1.file.size !== v2.file.size) {
      out.size = { old: v1.file.size, new: v2.file.size };
    }
    return out;
  }

  private async buildFileContentComparison(
    v1: ITemplateVersion & Document,
    v2: ITemplateVersion & Document
  ): Promise<FileContentComparison> {
    const result: FileContentComparison = {
      contentChanged: false,
      isTextFile: false,
      fileType: null,
      diff: null,
      error: null,
    };

    try {
      const fileContentChanged = v1.file.checksum !== v2.file.checksum;
      result.contentChanged = fileContentChanged;

      if (!fileContentChanged) return result;

      const mimeType1 = v1.file.mimeType.toLowerCase();
      const mimeType2 = v2.file.mimeType.toLowerCase();
      const fileName1 = v1.file.originalName.toLowerCase();
      const fileName2 = v2.file.originalName.toLowerCase();

      const isOfficeDoc =
        mimeType1.includes('wordprocessingml') ||
        mimeType1.includes('spreadsheetml') ||
        mimeType1.includes('presentationml') ||
        mimeType2.includes('wordprocessingml') ||
        mimeType2.includes('spreadsheetml') ||
        mimeType2.includes('presentationml') ||
        fileName1.endsWith('.docx') ||
        fileName1.endsWith('.xlsx') ||
        fileName1.endsWith('.pptx') ||
        fileName2.endsWith('.docx') ||
        fileName2.endsWith('.xlsx') ||
        fileName2.endsWith('.pptx');

      const isPdf =
        mimeType1.includes('pdf') ||
        mimeType2.includes('pdf') ||
        fileName1.endsWith('.pdf') ||
        fileName2.endsWith('.pdf');

      const isTextFile =
        TEXT_MIME_TYPES.includes(v1.file.mimeType) ||
        TEXT_MIME_TYPES.includes(v2.file.mimeType) ||
        v1.file.mimeType.startsWith('text/') ||
        v2.file.mimeType.startsWith('text/') ||
        TEXT_EXTENSIONS.test(v1.file.originalName) ||
        TEXT_EXTENSIONS.test(v2.file.originalName);

      result.isTextFile = isTextFile || isOfficeDoc || isPdf;

      if (isOfficeDoc || isPdf || isTextFile) {
        try {
          const buffer1 = await this.fileStorage.readFile(v1.file.storedName);
          const buffer2 = await this.fileStorage.readFile(v2.file.storedName);

          let content1: string;
          let content2: string;

          if (isOfficeDoc) {
            content1 = await this.officeService.extractTextFromOfficeDocument(
              buffer1,
              v1.file.mimeType,
              v1.file.originalName
            );
            content2 = await this.officeService.extractTextFromOfficeDocument(
              buffer2,
              v2.file.mimeType,
              v2.file.originalName
            );
          } else if (isPdf) {
            content1 = await this.pdfService.extractTextFromPdf(buffer1);
            content2 = await this.pdfService.extractTextFromPdf(buffer2);
          } else {
            content1 = buffer1.toString('utf8');
            content2 = buffer2.toString('utf8');
          }

          const diff = diffLines(content1, content2);
          result.diff = diff.map((part: any) => ({
            value: part.value,
            added: part.added || false,
            removed: part.removed || false,
          }));

          if (isOfficeDoc) result.fileType = 'office';
          else if (isPdf) result.fileType = 'pdf';
          else result.fileType = 'text';
        } catch (readError: any) {
          result.isTextFile = false;
          result.error = `Could not extract text: ${readError.message}`;
        }
      }
    } catch (error: any) {
      result.error = error.message;
    }

    return result;
  }
}
