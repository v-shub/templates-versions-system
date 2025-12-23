export class PdfService {
  /**
   * Извлекает текст из PDF файла
   * Использует ленивый импорт, чтобы избежать проблем с DOMMatrix в Node.js 18
   */
  async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      // Ленивый импорт pdf-parse, чтобы избежать ошибки при старте приложения
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.pdf(buffer);
      return data.text || 'No text content found in PDF';
    } catch (error: any) {
      // Если pdf-parse не работает из-за DOMMatrix, возвращаем сообщение
      if (error.message && error.message.includes('DOMMatrix')) {
        throw new Error('PDF parsing requires Node.js 20+ or browser environment. PDF comparison is not available in Node.js 18.');
      }
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }
}

