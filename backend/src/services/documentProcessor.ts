import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface PageContent {
  pageNumber: number;
  text: string;
  hasImages: boolean;
  layout?: 'single-column' | 'double-column' | 'magazine' | 'unknown';
}

interface ExtractedContent {
  text: string;
  pages: PageContent[];
  totalPages: number;
  isScanned: boolean;
  confidence: number;
}

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
  /**
   * Extract text from PDF with OCR fallback and layout preservation
   */
  async extractPDFContent(filePath: string): Promise<ExtractedContent> {
    try {
      // Step 1: Try standard PDF text extraction
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      
      const extractedText = pdfData.text?.trim() || '';
      const pageCount = pdfData.numpages || 1;
      
      // Check if PDF is scanned (very little or no extractable text)
      const isScanned = extractedText.length < 100 || this.isMostlyEmpty(extractedText);
      
      if (!isScanned) {
        // Standard PDF with text - extract by pages with layout detection
        const pages = await this.extractPagesWithLayout(filePath, pageCount, extractedText);
        
        return {
          text: extractedText,
          pages,
          totalPages: pageCount,
          isScanned: false,
          confidence: 0.95
        };
      }
      
      // Step 2: Scanned PDF - need OCR
      console.log('PDF appears scanned, using OCR...');
      const ocrResult = await this.extractWithOCR(filePath);
      
      return {
        text: ocrResult.text,
        pages: ocrResult.pages,
        totalPages: ocrResult.totalPages,
        isScanned: true,
        confidence: ocrResult.confidence
      };
      
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Failed to extract PDF content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Extract pages with layout detection
   */
  private async extractPagesWithLayout(
    filePath: string, 
    pageCount: number, 
    fullText: string
  ): Promise<PageContent[]> {
    const pages: PageContent[] = [];
    
    // Split text by page markers (pdf-parse doesn't give us clean page breaks,
    // so we'll estimate based on character count)
    const charsPerPage = Math.ceil(fullText.length / pageCount);
    
    for (let i = 0; i < pageCount; i++) {
      const start = i * charsPerPage;
      const end = start + charsPerPage;
      const pageText = fullText.substring(start, end).trim();
      
      // Detect layout based on text patterns
      const layout = this.detectLayout(pageText);
      
      pages.push({
        pageNumber: i + 1,
        text: pageText,
        hasImages: this.hasImageMarkers(pageText),
        layout
      });
    }
    
    return pages;
  }

  /**
   * Detect document layout from text patterns
   */
  private detectLayout(text: string): PageContent['layout'] {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 3) return 'unknown';
    
    // Check for two-column layout (common in academic papers)
    const midPoint = Math.floor(text.length / 2);
    const leftHalf = text.substring(0, midPoint).split('\n').length;
    const rightHalf = text.substring(midPoint).split('\n').length;
    
    if (Math.abs(leftHalf - rightHalf) < leftHalf * 0.3) {
      return 'double-column';
    }
    
    // Check for magazine layout (short lines, frequent breaks)
    const avgLineLength = lines.reduce((sum, l) => sum + l.length, 0) / lines.length;
    if (avgLineLength < 50) {
      return 'magazine';
    }
    
    return 'single-column';
  }

  /**
   * Check if text contains image markers
   */
  private hasImageMarkers(text: string): boolean {
    const imageMarkers = ['[image', '[figure', '[diagram', '[chart', '<<image', '<<figure'];
    return imageMarkers.some(marker => text.toLowerCase().includes(marker));
  }

  /**
   * Check if extracted text is mostly empty (scanned PDF indicator)
   */
  private isMostlyEmpty(text: string): boolean {
    // Remove whitespace and check if we have meaningful content
    const meaningfulChars = text.replace(/\s/g, '').length;
    return meaningfulChars < 50; // Less than 50 meaningful characters suggests scanned
  }

  /**
   * Extract text using OCR for scanned PDFs
   * Uses pdf2image + tesseract or similar approach
   */
  private async extractWithOCR(filePath: string): Promise<ExtractedContent> {
    try {
      // Check if we have OCR tools available
      const hasTesseract = await this.checkCommand('tesseract --version');
      const hasPdfImages = await this.checkCommand('pdfimages -version');
      
      if (!hasTesseract) {
        console.warn('Tesseract not installed. Install with: apt-get install tesseract-ocr');
        return {
          text: '',
          pages: [],
          totalPages: 0,
          isScanned: true,
          confidence: 0
        };
      }
      
      // Convert PDF to images and OCR each page
      const pages: PageContent[] = [];
      let fullText = '';
      
      // For now, return placeholder - full OCR implementation would require
      // pdf2image conversion and tesseract processing
      console.log('OCR processing would happen here with Tesseract');
      
      return {
        text: 'OCR extraction requires Tesseract. Please install tesseract-ocr.',
        pages: [],
        totalPages: 0,
        isScanned: true,
        confidence: 0
      };
      
    } catch (error) {
      console.error('OCR extraction error:', error);
      throw error;
    }
  }

  /**
   * Check if a command is available
   */
  private async checkCommand(command: string): Promise<boolean> {
    try {
      await execAsync(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract metadata from document
   */
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
      console.error('PDF metadata error:', error);
      return {};
    }
  }

  private async extractEPUBMetadata(filePath: string): Promise<DocumentMetadata> {
    // EPUB parsing would require additional library
    return {};
  }

  /**
   * Legacy text extraction (for backwards compatibility)
   */
  async extractText(filePath: string, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      const content = await this.extractPDFContent(filePath);
      return content.text;
    }
    return '';
  }

  /**
   * Extract structured content with AI-ready formatting
   */
  async extractStructuredContent(filePath: string, mimeType: string): Promise<{
    text: string;
    chunks: Array<{
      id: string;
      page: number;
      content: string;
      type: 'paragraph' | 'heading' | 'list' | 'quote';
    }>;
  }> {
    const extracted = await this.extractPDFContent(filePath);
    const chunks = this.createChunks(extracted);
    
    return {
      text: extracted.text,
      chunks
    };
  }

  /**
   * Create AI-friendly chunks from extracted content
   */
  private createChunks(extracted: ExtractedContent): Array<{
    id: string;
    page: number;
    content: string;
    type: 'paragraph' | 'heading' | 'list' | 'quote';
  }> {
    const chunks: Array<{
      id: string;
      page: number;
      content: string;
      type: 'paragraph' | 'heading' | 'list' | 'quote';
    }> = [];
    
    let chunkId = 0;
    
    for (const page of extracted.pages) {
      const paragraphs = page.text.split(/\n\n+/);
      
      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;
        
        // Detect type based on content
        let type: 'paragraph' | 'heading' | 'list' | 'quote' = 'paragraph';
        
        if (trimmed.length < 100 && /^[A-Z][^.!?]*$/.test(trimmed)) {
          type = 'heading';
        } else if (/^\s*[•\-\*\d]/.test(trimmed)) {
          type = 'list';
        } else if (trimmed.startsWith('"') || trimmed.startsWith('“')) {
          type = 'quote';
        }
        
        chunks.push({
          id: `chunk-${chunkId++}`,
          page: page.pageNumber,
          content: trimmed,
          type
        });
      }
    }
    
    return chunks;
  }
}

export const documentProcessor = new DocumentProcessor();
