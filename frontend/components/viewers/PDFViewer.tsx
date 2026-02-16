"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FixedSizeList as List } from "react-window";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  FileText,
  RotateCw,
  Maximize,
  Grid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
  onTextSelection?: (text: string) => void;
  onPageChange?: (page: number, totalPages: number) => void;
}

export function PDFViewer({ url, onTextSelection, onPageChange }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [pageInputValue, setPageInputValue] = useState<string>("1");
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch PDF with credentials
  useEffect(() => {
    const fetchPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.arrayBuffer();
        setPdfData(data);
      } catch (err) {
        console.error('Failed to fetch PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
        setIsLoading(false);
      }
    };
    fetchPdf();
  }, [url]);

  const handleDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setIsLoading(false);
      setError(null);
      onPageChange?.(1, numPages);
    },
    [onPageChange]
  );

  const handleDocumentLoadError = useCallback((error: Error) => {
    console.error("PDF load error:", error);
    setError("Failed to load PDF. Please try again.");
    setIsLoading(false);
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      const newPage = Math.max(1, Math.min(page, numPages));
      setCurrentPage(newPage);
      setPageInputValue(String(newPage));
      onPageChange?.(newPage, numPages);
    },
    [numPages, onPageChange]
  );

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const page = parseInt(pageInputValue, 10);
      if (!isNaN(page)) {
        goToPage(page);
      }
    }
  };

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      onTextSelection?.(selection.toString().trim());
    }
  }, [onTextSelection]);

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const resetZoom = () => setScale(1.0);

  useEffect(() => {
    setPageInputValue(String(currentPage));
  }, [currentPage]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <FileText className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-red-500 mb-2">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Toolbar */}
      <div className="h-12 border-b bg-card flex items-center justify-between px-4 gap-2">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1">
            <Input
              type="text"
              value={pageInputValue}
              onChange={handlePageInputChange}
              onKeyDown={handlePageInputSubmit}
              className="w-14 h-8 text-center text-sm"
            />
            <span className="text-sm text-muted-foreground">/ {numPages}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={zoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={zoomIn} disabled={scale >= 3}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={resetZoom}>
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Thumbnail Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={showThumbnails ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowThumbnails(!showThumbnails)}
          >
            <Grid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Virtualized Thumbnail Sidebar */}
        {showThumbnails && numPages > 0 && (
          <div className="w-40 border-r bg-card">
            <List
              height={window.innerHeight - 48} // Account for toolbar
              itemCount={numPages}
              itemSize={180} // Height of each thumbnail
              width={160}
            >
              {({ index, style }) => {
                const pageNum = index + 1;
                return (
                  <div style={style} className="p-2">
                    <div
                      className={cn(
                        "cursor-pointer rounded border-2 overflow-hidden transition-colors",
                        pageNum === currentPage
                          ? "border-primary"
                          : "border-transparent hover:border-muted-foreground/30"
                      )}
                      onClick={() => goToPage(pageNum)}
                    >
                      <Document file={pdfData ? { data: pdfData } : null} loading="">
                        <Page
                          pageNumber={pageNum}
                          width={120}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </Document>
                      <div className="text-center text-xs py-1 bg-muted">{pageNum}</div>
                    </div>
                  </div>
                );
              }}
            </List>
          </div>
        )}

        {/* PDF Page Display */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto flex justify-center p-4"
          onMouseUp={handleTextSelection}
        >
          {!pdfData && isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center h-full text-destructive">
              <FileText className="w-16 h-16 mb-4 opacity-50" />
              <p>{error}</p>
            </div>
          )}
          {pdfData && (
          <Document
            file={{ data: pdfData }}
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={handleDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            }
            className="shadow-xl"
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="bg-white"
              loading={
                <div className="flex items-center justify-center h-96 w-[600px]">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              }
            />
          </Document>
          )}
        </div>
      </div>
    </div>
  );
}

export default PDFViewer;
