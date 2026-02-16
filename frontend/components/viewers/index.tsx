"use client";

import dynamic from "next/dynamic";
import { Loader2, FileText } from "lucide-react";

// Dynamically import viewers to avoid SSR issues with PDF.js and ePub.js
const PDFViewer = dynamic(() => import("./PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  ),
});

const EPUBViewer = dynamic(() => import("./EPUBViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  ),
});

export { PDFViewer, EPUBViewer };

interface DocumentViewerProps {
  document: {
    id: string;
    title: string;
    type: string;
    fileUrl?: string;
  } | null;
  onTextSelection?: (text: string) => void;
  onPageChange?: (page: number, totalPages: number) => void;
  onChapterChange?: (chapter: string, index: number) => void;
}

/**
 * Factory component that selects the appropriate viewer based on document type.
 * This allows for clean separation of PDF and EPUB rendering logic.
 */
export function DocumentViewer({
  document,
  onTextSelection,
  onPageChange,
  onChapterChange,
}: DocumentViewerProps) {
  if (!document?.id) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <FileText className="w-16 h-16 mb-4 opacity-50" />
        <p>Document not available</p>
      </div>
    );
  }

  // Use proxy URL for document content
  const proxyUrl = `/api/documents/${document.id}/content`;

  switch (document.type?.toUpperCase()) {
    case "PDF":
      return (
        <PDFViewer
          url={proxyUrl}
          onTextSelection={onTextSelection}
          onPageChange={onPageChange}
        />
      );

    case "EPUB":
      return (
        <EPUBViewer
          url={proxyUrl}
          onTextSelection={onTextSelection}
          onChapterChange={onChapterChange}
        />
      );

    default:
      // Fallback for unsupported types - use iframe
      return (
        <div className="h-full flex flex-col items-center justify-center bg-muted/30 p-8">
          <FileText className="w-16 h-16 mb-4 opacity-50 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            Unsupported document type: {document.type}
          </p>
          <a
            href={proxyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Download Document
          </a>
        </div>
      );
  }
}

export default DocumentViewer;
