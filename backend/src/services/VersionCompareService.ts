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

export type ExtractableFileType = 'text' | 'office' | 'pdf';

interface FileContentComparison {
  contentChanged: boolean;
  isTextFile: boolean;
  fileType: string | null;
  /** When comparing different file types (e.g. DOCX vs PDF) */
  fileType1?: ExtractableFileType | null;
  fileType2?: ExtractableFileType | null;
  diff: Array<{ value: string; added: boolean; removed: boolean }> | null;
  /** Extracted text from each version for symbol-level diff in UI */
  text1: string | null;
  text2: string | null;
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

  /** Resolve extractable type for a single file (by mime and name). */
  private getExtractableType(mimeType: string, originalName: string): ExtractableFileType | null {
    const m = mimeType.toLowerCase();
    const n = originalName.toLowerCase();
    if (
      m.includes('wordprocessingml') ||
      m.includes('spreadsheetml') ||
      m.includes('presentationml') ||
      n.endsWith('.docx') ||
      n.endsWith('.xlsx') ||
      n.endsWith('.pptx')
    ) {
      return 'office';
    }
    if (m.includes('pdf') || n.endsWith('.pdf')) return 'pdf';
    if (
      TEXT_MIME_TYPES.includes(mimeType) ||
      mimeType.startsWith('text/') ||
      TEXT_EXTENSIONS.test(originalName)
    ) {
      return 'text';
    }
    return null;
  }

  /** Extract text from a single file buffer based on its type. */
  private async extractTextForVersion(
    buffer: Buffer,
    mimeType: string,
    originalName: string,
    type: ExtractableFileType
  ): Promise<string> {
    if (type === 'office') {
      return this.officeService.extractTextFromOfficeDocument(buffer, mimeType, originalName);
    }
    if (type === 'pdf') {
      return this.pdfService.extractTextFromPdf(buffer);
    }
    return buffer.toString('utf8');
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
      text1: null,
      text2: null,
      error: null,
    };

    try {
      const fileContentChanged = v1.file.checksum !== v2.file.checksum;
      result.contentChanged = fileContentChanged;

      if (!fileContentChanged) return result;

      const type1 = this.getExtractableType(v1.file.mimeType, v1.file.originalName);
      const type2 = this.getExtractableType(v2.file.mimeType, v2.file.originalName);
      const canExtractEither = type1 !== null || type2 !== null;

      result.fileType1 = type1 ?? undefined;
      result.fileType2 = type2 ?? undefined;
      result.isTextFile = canExtractEither;

      if (canExtractEither) {
        try {
          const [buffer1, buffer2] = await Promise.all([
            this.fileStorage.readFile(v1.file.storedName),
            this.fileStorage.readFile(v2.file.storedName),
          ]);

          const extract1 =
            type1 !== null
              ? this.extractTextForVersion(
                  buffer1,
                  v1.file.mimeType,
                  v1.file.originalName,
                  type1
                )
              : Promise.resolve('');
          const extract2 =
            type2 !== null
              ? this.extractTextForVersion(
                  buffer2,
                  v2.file.mimeType,
                  v2.file.originalName,
                  type2
                )
              : Promise.resolve('');

          const [content1, content2] = await Promise.all([extract1, extract2]);

          const diff = diffLines(content1, content2);
          result.diff = diff.map((part: any) => ({
            value: part.value,
            added: part.added || false,
            removed: part.removed || false,
          }));
          result.text1 = content1;
          result.text2 = content2;

          if (type1 === type2) {
            result.fileType = type1;
          } else {
            result.fileType = type1 ?? type2 ?? 'text';
          }
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
