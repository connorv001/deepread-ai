"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Headphones,
  Sparkles,
  BookOpen,
  ChevronLeft,
  Loader2,
  FileText,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { DocumentViewer } from "@/components/viewers";
import { documentsApi, aiApi, audioApi } from "@/lib/api";
import { useReaderStore, useAIStore } from "@/lib/store";

export default function ReaderPage() {
  const { id } = useParams();
  const router = useRouter();
  const documentId = id as string;
  const { setCurrentDocument, setSelectedText, setCurrentPage } = useReaderStore();

  const { data: document, isLoading } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () =>
      documentsApi.get(documentId).then((r) => r.data.data.document),
  });

  useEffect(() => {
    if (document) {
      setCurrentDocument(document);
    }
  }, [document, setCurrentDocument]);

  const handleTextSelection = useCallback(
    (text: string) => {
      setSelectedText(text);
    },
    [setSelectedText]
  );

  const handlePageChange = useCallback(
    (page: number, totalPages: number) => {
      setCurrentPage(page);
    },
    [setCurrentPage]
  );

  const handleChapterChange = useCallback(
    (chapter: string, index: number) => {
      // Could store chapter info in reader store if needed
      console.log("Chapter changed:", chapter, index);
    },
    []
  );

  return (
    <div className="h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="h-14 border-b flex items-center px-4 justify-between bg-card">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/library")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold truncate max-w-md">
              {document?.title || "Loading..."}
            </h1>
            {document?.type && (
              <span className="text-xs text-muted-foreground">
                {document.type}
              </span>
            )}
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
            <DocumentViewer
              document={document}
              onTextSelection={handleTextSelection}
              onPageChange={handlePageChange}
              onChapterChange={handleChapterChange}
            />
          )}
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={40} minSize={30}>
          <AIAssistantPanel documentId={documentId} document={document} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function AIAssistantPanel({
  documentId,
  document,
}: {
  documentId: string;
  document: any;
}) {
  const [activeTab, setActiveTab] = useState<
    "summary" | "audio" | "deep-dive" | "chat"
  >("summary");
  const { selectedText } = useReaderStore();

  return (
    <div className="h-full flex flex-col bg-card border-l">
      <div className="p-4 border-b">
        <div className="flex gap-2 flex-wrap">
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
          <Button
            variant={activeTab === "chat" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("chat")}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Chat
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "summary" && <SummaryPanel documentId={documentId} />}
        {activeTab === "audio" && <AudioPanel documentId={documentId} />}
        {activeTab === "deep-dive" && <DeepDivePanel documentId={documentId} />}
        {activeTab === "chat" && (
          <ChatPanel documentId={documentId} document={document} />
        )}
      </div>
    </div>
  );
}

function SummaryPanel({ documentId }: { documentId: string }) {
  const { selectedText, currentPage } = useReaderStore();
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

  // Use selected text or provide helpful prompt
  const textToSummarize =
    selectedText ||
    (currentPage
      ? `Summarize page ${currentPage} of the document`
      : "");

  if (!textToSummarize) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
        <Sparkles className="w-12 h-12 opacity-50" />
        <p className="text-center">
          Select text in the document to summarize it
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setIsAILoading(true);
            summarizeMutation.mutate({
              text: "Summarize the full document",
              type: "full",
            });
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
        <strong>Summarizing:</strong> {textToSummarize.slice(0, 200)}
        {textToSummarize.length > 200 && "..."}
        {currentPage && (
          <div className="text-xs mt-1">Page: {currentPage}</div>
        )}
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
        onClick={() =>
          summarizeMutation.mutate({ text: textToSummarize, type: "selection" })
        }
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
  const { selectedText, currentPage } = useReaderStore();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Use selected text or provide helpful prompt
  const textToRead =
    selectedText ||
    (currentPage ? `Read page ${currentPage} of the document` : "");

  const handleGenerate = async () => {
    if (!textToRead) return;
    setIsGenerating(true);

    try {
      const response = await audioApi.generate({
        documentId,
        text: textToRead,
        pageStart: currentPage,
        pageEnd: currentPage,
      });
      const jobId = response.data.data.jobId;

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

  if (!textToRead) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Headphones className="w-12 h-12 opacity-50 mb-4" />
        <p className="text-center">Select text in the document for audio</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
        <strong>{textToRead.split(/\s+/).length} words</strong>
        {currentPage && (
          <div className="text-xs mt-1">Page: {currentPage}</div>
        )}
      </div>

      <Button
        onClick={handleGenerate}
        disabled={!textToRead || isGenerating}
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
  const { selectedText, currentPage } = useReaderStore();
  const [deepDiveData, setDeepDiveData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDeepDive = async () => {
    const text =
      selectedText ||
      (currentPage ? `Analyze concepts from page ${currentPage}` : "");
    if (!text) return;
    setIsLoading(true);

    try {
      const response = await aiApi.deepDive({
        documentId,
        text,
      });
      setDeepDiveData(response.data.data);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedText && !currentPage) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <BookOpen className="w-12 h-12 opacity-50 mb-4" />
        <p className="text-center">Select text to explore concepts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleDeepDive} disabled={isLoading} className="w-full">
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
          <p className="text-sm text-muted-foreground mt-1">
            {concept.definition}
          </p>
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

function ChatPanel({
  documentId,
  document,
}: {
  documentId: string;
  document: any;
}) {
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await aiApi.chat({
        documentId,
        message: userMessage,
        history: messages,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.data.data.response },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Ask questions about {document?.title || "this document"}</p>
            <p className="text-sm mt-2">
              Try: &quot;What are the main points?&quot; or &quot;Explain the
              key concepts&quot;
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground ml-8"
                : "bg-muted mr-8"
            }`}
          >
            <div className="text-xs font-semibold mb-1">
              {msg.role === "user" ? "You" : "AI Assistant"}
            </div>
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            AI is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask a question about the document..."
          disabled={isLoading}
        />
        <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
