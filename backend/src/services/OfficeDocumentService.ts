import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

export class OfficeDocumentService {
  /**
   * Извлекает текст из DOCX файла
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
      const text = this.extractTextFromXml(parsed);
      
      return text;
    } catch (error: any) {
      throw new Error(`Failed to extract text from DOCX: ${error.message}`);
    }
  }

  /**
   * Извлекает текст из XLSX файла
   */
  async extractTextFromXlsx(buffer: Buffer): Promise<string> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const sharedStrings = await zip.file('xl/sharedStrings.xml')?.async('string');
      
      if (!sharedStrings) {
        // Если нет sharedStrings, пробуем извлечь из ячеек напрямую
        return this.extractTextFromXlsxCells(zip);
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
            strings.push(si.t);
          }
        }
      }

      // Также извлекаем из ячеек
      const cellText = await this.extractTextFromXlsxCells(zip);
      const allText = [...strings, cellText].filter(Boolean).join('\n');
      
      return allText || 'No text content found';
    } catch (error: any) {
      throw new Error(`Failed to extract text from XLSX: ${error.message}`);
    }
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
   * Извлекает текст из PPTX файла
   */
  async extractTextFromPptx(buffer: Buffer): Promise<string> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const textParts: string[] = [];

      // Ищем все файлы слайдов
      const slideFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
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
        const slideText = this.extractTextFromXml(parsed);
        if (slideText) {
          textParts.push(`[Slide ${slideName.match(/slide(\d+)/)?.[1] || '?'}]\n${slideText}`);
        }
      }

      return textParts.join('\n\n') || 'No text content found';
    } catch (error: any) {
      throw new Error(`Failed to extract text from PPTX: ${error.message}`);
    }
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

