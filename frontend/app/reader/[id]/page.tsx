"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Headphones, Sparkles, BookOpen, ChevronLeft, Loader2, FileText, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { documentsApi, aiApi, audioApi } from "@/lib/api";
import { useReaderStore, useAIStore } from "@/lib/store";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function ReaderPage() {
  const { id } = useParams();
  const router = useRouter();
  const documentId = id as string;
  const { setCurrentDocument, setSelectedText } = useReaderStore();

  const { data: document, isLoading } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => documentsApi.get(documentId).then((r) => r.data.data.document),
    onSuccess: (doc) => setCurrentDocument(doc),
  });

  return (
    <div className="h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="h-14 border-b flex items-center px-4 justify-between bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/library")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold truncate max-w-md">{document?.title || "Loading..."}</h1>
          </div>
        </div>
      </header>

      {/* Split Pane Layout */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={60} minSize={40}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <DocumentViewer document={document} />
          )}
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={40} minSize={30}>
          <AIAssistantPanel documentId={documentId} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function DocumentViewer({ document }: { document: any }) {
  const { setSelectedText } = useReaderStore();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [epubContent, setEpubContent] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  }, [setSelectedText]);

  useEffect(() => {
    if (document?.type === "EPUB" && document?.url) {
      // Fetch EPUB content
      fetch(document.url)
        .then((res) => res.text())
        .then((text) => setEpubContent(text))
        .catch((err) => console.error("Failed to load EPUB:", err));
    }
  }, [document]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  if (!document?.url) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <FileText className="w-16 h-16 mb-4 opacity-50" />
        <p>Document not available</p>
      </div>
    );
  }

  // PDF Viewer
  if (document.type === "PDF") {
    return (
      <div className="h-full flex flex-col bg-muted/30">
        {/* PDF Toolbar */}
        <div className="h-12 border-b bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {pageNumber} of {numPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
            >
              Next
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={() => setScale((s) => Math.min(2, s + 0.1))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto p-8" onMouseUp={handleTextSelection}>
          <div className="flex justify-center">
            <Document
              file={document.url}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              }
              error={
                <div className="text-center text-muted-foreground">
                  <p>Failed to load PDF</p>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
              />
            </Document>
          </div>
        </div>
      </div>
    );
  }

  // EPUB Viewer (HTML-based rendering)
  if (document.type === "EPUB") {
    return (
      <div className="h-full flex flex-col bg-muted/30">
        <div className="flex-1 overflow-auto p-8" onMouseUp={handleTextSelection}>
          <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8 min-h-full">
            {epubContent ? (
              <div
                ref={contentRef}
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: epubContent }}
              />
            ) : (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback for other types
  return (
    <div className="h-full overflow-auto bg-muted/30 p-8" onMouseUp={handleTextSelection}>
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8 min-h-full">
        <iframe
          src={document.url}
          className="w-full h-full min-h-[800px] border-0"
          title="Document Viewer"
        />
      </div>
    </div>
  );
}

function AIAssistantPanel({ documentId }: { documentId: string }) {
  const [activeTab, setActiveTab] = useState<"summary" | "audio" | "deep-dive">("summary");
  const { selectedText } = useReaderStore();

  return (
    <div className="h-full flex flex-col bg-card border-l">
      <div className="p-4 border-b">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "summary" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("summary")}
          >
            <Sparkles className="w-4 h-4 mr-1" />
            Summary
          </Button>
          <Button
            variant={activeTab === "audio" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("audio")}
          >
            <Headphones className="w-4 h-4 mr-1" />
            Audio
          </Button>
          <Button
            variant={activeTab === "deep-dive" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("deep-dive")}
          >
            <BookOpen className="w-4 h-4 mr-1" />
            Deep Dive
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "summary" && <SummaryPanel documentId={documentId} />}
        {activeTab === "audio" && <AudioPanel documentId={documentId} />}
        {activeTab === "deep-dive" && <DeepDivePanel documentId={documentId} />}
      </div>
    </div>
  );
}

function SummaryPanel({ documentId }: { documentId: string }) {
  const { selectedText } = useReaderStore();
  const { setIsAILoading } = useAIStore();
  const [format, setFormat] = useState<"paragraph" | "bullet">("paragraph");
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);

  const summarizeMutation = useMutation({
    mutationFn: ({ text, type }: { text: string; type: string }) =>
      aiApi.summarize({
        documentId,
        text,
        type: type as any,
        format,
      }),
    onSuccess: (response) => {
      setGeneratedSummary(response.data.data.content);
      setIsAILoading(false);
    },
  });

  if (!selectedText) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
        <Sparkles className="w-12 h-12 opacity-50" />
        <p>Select text from the document to summarize</p>
        <Button
          variant="outline"
          onClick={() => {
            setIsAILoading(true);
            summarizeMutation.mutate({ text: "", type: "full" });
          }}
        >
          Summarize Entire Document
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
        <strong>Selected:</strong> {selectedText.slice(0, 200)}
        {selectedText.length > 200 && "..."}
      </div>

      <div className="flex gap-2">
        <Button
          variant={format === "paragraph" ? "default" : "outline"}
          size="sm"
          onClick={() => setFormat("paragraph")}
        >
          Paragraph
        </Button>
        <Button
          variant={format === "bullet" ? "default" : "outline"}
          size="sm"
          onClick={() => setFormat("bullet")}
        >
          Bullets
        </Button>
      </div>

      <Button
        onClick={() => summarizeMutation.mutate({ text: selectedText, type: "selection" })}
        disabled={summarizeMutation.isPending}
        className="w-full"
      >
        {summarizeMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Summarizing...
          </>
        ) : (
          "Generate Summary"
        )}
      </Button>

      {generatedSummary && (
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="whitespace-pre-wrap">{generatedSummary}</div>
        </div>
      )}
    </div>
  );
}

function AudioPanel({ documentId }: { documentId: string }) {
  const { selectedText } = useReaderStore();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedText) return;
    setIsGenerating(true);

    try {
      const response = await audioApi.generate({
        documentId,
        text: selectedText,
      });
      const jobId = response.data.data.jobId;

      // Poll for completion
      const pollInterval = setInterval(async () => {
        const status = await audioApi.status(jobId);
        if (status.data.data.status === "COMPLETED") {
          clearInterval(pollInterval);
          setAudioUrl(status.data.data.url);
          setIsGenerating(false);
        }
      }, 3000);
    } catch (error) {
      setIsGenerating(false);
    }
  };

  if (!selectedText) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Headphones className="w-12 h-12 opacity-50 mb-4" />
        <p>Select text to generate audio</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
        <strong>{selectedText.split(/\s+/).length} words selected</strong>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={!selectedText || isGenerating}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating audio...
          </>
        ) : (
          <>
            <Headphones className="w-4 h-4 mr-2" />
            Generate Audio
          </>
        )}
      </Button>

      {audioUrl && (
        <div className="mt-4">
          <audio src={audioUrl} className="w-full" controls />
        </div>
      )}
    </div>
  );
}

function DeepDivePanel({ documentId }: { documentId: string }) {
  const { selectedText } = useReaderStore();
  const [deepDiveData, setDeepDiveData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDeepDive = async () => {
    if (!selectedText) return;
    setIsLoading(true);

    try {
      const response = await aiApi.deepDive({
        documentId,
        text: selectedText,
      });
      setDeepDiveData(response.data.data);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedText) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <BookOpen className="w-12 h-12 opacity-50 mb-4" />
        <p>Select text to explore concepts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleDeepDive}
        disabled={!selectedText || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Exploring...
          </>
        ) : (
          "Deep Dive into Selection"
        )}
      </Button>

      {deepDiveData?.concepts?.map((concept: any, i: number) => (
        <div key={i} className="border rounded-lg p-4">
          <h4 className="font-semibold text-lg">{concept.name}</h4>
          <p className="text-sm text-muted-foreground mt-1">{concept.definition}</p>
        </div>
      ))}

      {deepDiveData?.references?.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">References</h4>
          {deepDiveData.references.map((ref: any, i: number) => (
            <a
              key={i}
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 border rounded-lg hover:bg-muted"
            >
              <div className="font-medium">{ref.title}</div>
              <div className="text-sm text-muted-foreground">{ref.source}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
