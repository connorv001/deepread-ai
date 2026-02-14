import pdfParse from 'pdf-parse';
import fs from 'fs';

interface DocumentMetadata {
  title?: string;
  author?: string;
  pageCount?: number;
  chapters?: Array<{
    title: string;
    href: string;
  }>;
}

export class DocumentProcessor {
  async extractMetadata(filePath: string, mimeType: string): Promise<DocumentMetadata> {
    if (mimeType === 'application/pdf') {
      return this.extractPDFMetadata(filePath);
    } else if (mimeType === 'application/epub+zip') {
      return this.extractEPUBMetadata(filePath);
    }
    return {};
  }

  private async extractPDFMetadata(filePath: string): Promise<DocumentMetadata> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);

      return {
        title: data.info?.Title || undefined,
        author: data.info?.Author || undefined,
        pageCount: data.numpages
      };
    } catch (error) {
      console.error('PDF parsing error:', error);
      return {};
    }
  }

  private async extractEPUBMetadata(filePath: string): Promise<DocumentMetadata> {
    // EPUB parsing would require additional library like nodepub or epubjs
    // For now, return basic metadata
    return {};
  }

  async extractText(filePath: string, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    }
    return '';
  }
}

export const documentProcessor = new DocumentProcessor();
