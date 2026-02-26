import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapPreviewHtml(body: string, title: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><style>
body{font-family:system-ui,sans-serif;margin:1rem;background:#fff;color:#222;}
</style></head><body>${body}</body></html>`;
}

export class OfficeDocumentService {
  /**
   * Конвертирует DOCX в HTML для предпросмотра
   */
  async convertDocxToHtml(buffer: Buffer): Promise<string> {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.convertToHtml({ buffer });
      return wrapPreviewHtml(result.value || '', 'Document');
    } catch (error: any) {
      throw new Error(`Failed to convert DOCX to HTML: ${error.message}`);
    }
  }

  /**
   * Конвертирует Office документ в HTML по типу (DOCX — mammoth; XLSX/PPTX — обёрнутый текст)
   */
  async convertOfficeToHtml(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
    const lower = fileName.toLowerCase();
    if (mimeType.includes('wordprocessingml') || lower.endsWith('.docx')) {
      return this.convertDocxToHtml(buffer);
    }
    const text = await this.extractTextFromOfficeDocument(buffer, mimeType, fileName);
    const body = `<pre style="white-space:pre-wrap;word-break:break-word;">${escapeHtml(text)}</pre>`;
    return wrapPreviewHtml(body, 'Document');
  }

  /**
   * Извлекает текст из DOCX файла (XML-парсинг + fallback по тегам w:t)
   */
  async extractTextFromDocx(buffer: Buffer): Promise<string> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const documentXml = await zip.file('word/document.xml')?.async('string');

      if (!documentXml) {
        throw new Error('Could not find document.xml in DOCX file');
      }

      const parser = new XMLParser({
        ignoreAttributes: false,
        textNodeName: '_text',
        attributeNamePrefix: '@_',
      });

      const parsed = parser.parse(documentXml);
      let text = this.extractTextFromXml(parsed);

      if (!text || !text.trim()) {
        text = this.extractTextFromDocxFallback(documentXml);
      }

      return text || '';
    } catch (error: any) {
      throw new Error(`Failed to extract text from DOCX: ${error.message}`);
    }
  }

  /** Fallback: извлечение текста по тегам <w:t> из document.xml */
  private extractTextFromDocxFallback(documentXml: string): string {
    const parts: string[] = [];
    const regex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(documentXml)) !== null) {
      if (m[1]) parts.push(m[1]);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Извлекает текст из XLSX файла (парсинг XML + fallback по тегам)
   */
  async extractTextFromXlsx(buffer: Buffer): Promise<string> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const sharedStrings = await zip.file('xl/sharedStrings.xml')?.async('string');

      if (!sharedStrings) {
        const cellText = await this.extractTextFromXlsxCells(zip);
        return cellText || (await this.extractTextFromXlsxFallback(zip));
      }

      const parser = new XMLParser({
        ignoreAttributes: false,
        textNodeName: '_text',
        attributeNamePrefix: '@_',
      });

      const parsed = parser.parse(sharedStrings);
      const strings: string[] = [];

      if (parsed.sst?.si) {
        const siArray = Array.isArray(parsed.sst.si) ? parsed.sst.si : [parsed.sst.si];
        for (const si of siArray) {
          if (si.t?._text) {
            strings.push(si.t._text);
          } else if (si.t) {
            strings.push(typeof si.t === 'string' ? si.t : (si.t._text ?? ''));
          } else if (si.r) {
            const runs = Array.isArray(si.r) ? si.r : [si.r];
            runs.forEach((r: any) => {
              if (r.t?._text) strings.push(r.t._text);
              else if (r.t) strings.push(String(r.t));
            });
          }
        }
      }

      const cellText = await this.extractTextFromXlsxCells(zip);
      let allText = [...strings, cellText].filter(Boolean).join('\n');

      if (!allText || allText === 'No text content found') {
        allText = await this.extractTextFromXlsxFallback(zip);
      }

      return allText || '';
    } catch (error: any) {
      throw new Error(`Failed to extract text from XLSX: ${error.message}`);
    }
  }

  /** Fallback: извлечение текста из sharedStrings и листов XLSX по тегам <t>, <v> */
  private async extractTextFromXlsxFallback(zip: JSZip): Promise<string> {
    const parts: string[] = [];
    const sharedStringsXml = await zip.file('xl/sharedStrings.xml')?.async('string');
    if (sharedStringsXml) {
      const tRegex = /<[^>]*:?t(?:\s[^>]*)?>([^<]*)<\/[^>]*:?t>/gi;
      let m: RegExpExecArray | null;
      while ((m = tRegex.exec(sharedStringsXml)) !== null) {
        if (m[1]) parts.push(m[1]);
      }
    }
    const sheetFiles = Object.keys(zip.files).filter((n) => n.startsWith('xl/worksheets/sheet') && n.endsWith('.xml'));
    for (const name of sheetFiles) {
      const xml = await zip.file(name)?.async('string');
      if (!xml) continue;
      const vRegex = /<[^>]*:?v(?:\s[^>]*)?>([^<]*)<\/[^>]*:?v>/gi;
      let vm: RegExpExecArray | null;
      while ((vm = vRegex.exec(xml)) !== null) {
        if (vm[1]) parts.push(vm[1]);
      }
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Извлекает текст из ячеек XLSX файла
   */
  private async extractTextFromXlsxCells(zip: JSZip): Promise<string> {
    const textParts: string[] = [];
    
    // Ищем все файлы листов
    const sheetFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('xl/worksheets/sheet') && name.endsWith('.xml')
    );

    for (const sheetName of sheetFiles) {
      const sheetXml = await zip.file(sheetName)?.async('string');
      if (!sheetXml) continue;

      const parser = new XMLParser({
        ignoreAttributes: false,
        textNodeName: '_text',
        attributeNamePrefix: '@_',
      });

      const parsed = parser.parse(sheetXml);
      const cells = this.extractCellsFromSheet(parsed);
      if (cells.length > 0) {
        textParts.push(cells.join(' | '));
      }
    }

    return textParts.join('\n');
  }

  /**
   * Извлекает ячейки из парсинга листа
   */
  private extractCellsFromSheet(parsed: any): string[] {
    const cells: string[] = [];
    
    const extractFromRow = (row: any) => {
      if (row.c) {
        const cArray = Array.isArray(row.c) ? row.c : [row.c];
        for (const cell of cArray) {
          if (cell.v?._text !== undefined) {
            cells.push(cell.v._text);
          } else if (cell.v) {
            cells.push(String(cell.v));
          }
        }
      }
    };

    if (parsed.worksheet?.sheetData?.row) {
      const rows = Array.isArray(parsed.worksheet.sheetData.row) 
        ? parsed.worksheet.sheetData.row 
        : [parsed.worksheet.sheetData.row];
      
      for (const row of rows) {
        extractFromRow(row);
      }
    }

    return cells;
  }

  /**
   * Извлекает текст из PPTX файла (XML-парсинг + fallback по тегам a:t)
   */
  async extractTextFromPptx(buffer: Buffer): Promise<string> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const textParts: string[] = [];
      const slideFiles = Object.keys(zip.files).filter(
        (name) => name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      );

      for (const slideName of slideFiles) {
        const slideXml = await zip.file(slideName)?.async('string');
        if (!slideXml) continue;

        const parser = new XMLParser({
          ignoreAttributes: false,
          textNodeName: '_text',
          attributeNamePrefix: '@_',
        });

        const parsed = parser.parse(slideXml);
        let slideText = this.extractTextFromXml(parsed);

        if (!slideText || !slideText.trim()) {
          slideText = this.extractTextFromPptxSlideFallback(slideXml);
        }

        if (slideText) {
          textParts.push(`[Slide ${slideName.match(/slide(\d+)/)?.[1] || '?'}]\n${slideText}`);
        }
      }

      let result = textParts.join('\n\n');
      if (!result || result === 'No text content found') {
        result = await this.extractTextFromPptxFallback(zip);
      }
      return result || '';
    } catch (error: any) {
      throw new Error(`Failed to extract text from PPTX: ${error.message}`);
    }
  }

  /** Fallback: извлечение текста из XML слайда по тегам a:t (DrawingML) */
  private extractTextFromPptxSlideFallback(slideXml: string): string {
    const parts: string[] = [];
    const regex = /<[^>]*:?t(?:\s[^>]*)?>([^<]*)<\/[^>]*:?t>/gi;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(slideXml)) !== null) {
      if (m[1]) parts.push(m[1]);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  /** Fallback: обход всех слайдов и извлечение по тегам */
  private async extractTextFromPptxFallback(zip: JSZip): Promise<string> {
    const parts: string[] = [];
    const slideFiles = Object.keys(zip.files).filter(
      (name) => name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
    );
    for (const name of slideFiles) {
      const xml = await zip.file(name)?.async('string');
      if (xml) parts.push(this.extractTextFromPptxSlideFallback(xml));
    }
    return parts.filter(Boolean).join('\n\n');
  }

  /**
   * Рекурсивно извлекает текст из XML структуры
   */
  private extractTextFromXml(obj: any): string {
    const textParts: string[] = [];

    if (typeof obj === 'string') {
      return obj;
    }

    if (typeof obj === 'object' && obj !== null) {
      // Проверяем наличие текстового узла
      if (obj._text) {
        textParts.push(obj._text);
      }

      // Рекурсивно обходим все свойства
      for (const key in obj) {
        if (key === '_text' || key.startsWith('@_')) {
          continue;
        }

        const value = obj[key];
        if (Array.isArray(value)) {
          for (const item of value) {
            const extracted = this.extractTextFromXml(item);
            if (extracted) {
              textParts.push(extracted);
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          const extracted = this.extractTextFromXml(value);
          if (extracted) {
            textParts.push(extracted);
          }
        }
      }
    }

    return textParts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Определяет тип Office документа и извлекает текст
   */
  async extractTextFromOfficeDocument(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
    const lowerFileName = fileName.toLowerCase();

    if (mimeType.includes('wordprocessingml') || lowerFileName.endsWith('.docx')) {
      return this.extractTextFromDocx(buffer);
    } else if (mimeType.includes('spreadsheetml') || lowerFileName.endsWith('.xlsx')) {
      return this.extractTextFromXlsx(buffer);
    } else if (mimeType.includes('presentationml') || lowerFileName.endsWith('.pptx')) {
      return this.extractTextFromPptx(buffer);
    } else {
      throw new Error(`Unsupported Office document type: ${mimeType}`);
    }
  }
}

