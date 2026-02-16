"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import ePub, { Book, Rendition, Contents, NavItem } from "epubjs";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  List,
  Sun,
  Moon,
  Type,
  Minus,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EPUBViewerProps {
  url: string;
  onTextSelection?: (text: string) => void;
  onChapterChange?: (chapter: string, index: number) => void;
}

interface Theme {
  name: string;
  body: {
    background: string;
    color: string;
  };
}

const THEMES: Theme[] = [
  { name: "light", body: { background: "#ffffff", color: "#1a1a1a" } },
  { name: "sepia", body: { background: "#f4ecd8", color: "#5b4636" } },
  { name: "dark", body: { background: "#1a1a1a", color: "#e0e0e0" } },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 22, 24];

export function EPUBViewer({ url, onTextSelection, onChapterChange }: EPUBViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [epubData, setEpubData] = useState<ArrayBuffer | null>(null);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [currentChapter, setCurrentChapter] = useState<string>("");
  const [showToc, setShowToc] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [fontSize, setFontSize] = useState<number>(16);
  const [atStart, setAtStart] = useState<boolean>(true);
  const [atEnd, setAtEnd] = useState<boolean>(false);

  // Fetch EPUB with credentials
  useEffect(() => {
    let cancelled = false;
    const fetchEpub = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setEpubData(null);
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        if (cancelled) return;
        setEpubData(buffer);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to fetch EPUB:', err);
        setError(err instanceof Error ? err.message : 'Failed to load EPUB');
        setIsLoading(false);
      }
    };
    fetchEpub();
    return () => { cancelled = true; };
  }, [url]);

  // Initialize book when EPUB data is loaded
  useEffect(() => {
    if (!viewerRef.current || !epubData) return;

    const initBook = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Clean up previous instances
        if (renditionRef.current) {
          renditionRef.current.destroy();
        }
        if (bookRef.current) {
          bookRef.current.destroy();
        }

        // Create new book instance from ArrayBuffer
        // @ts-ignore - epub.js accepts ArrayBuffer but types are incomplete
        const book = ePub(epubData);
        bookRef.current = book;

        // Wait for book to be ready
        await book.ready;

        // Get navigation/TOC
        const navigation = await book.loaded.navigation;
        setToc(navigation.toc);

        // Create rendition
        const rendition = book.renderTo(viewerRef.current!, {
          width: "100%",
          height: "100%",
          spread: "none",
          flow: "paginated",
        });
        renditionRef.current = rendition;

        // Register themes
        THEMES.forEach((theme) => {
          rendition.themes.register(theme.name, {
            body: theme.body,
            "p, span, div, h1, h2, h3, h4, h5, h6": {
              "font-size": `${fontSize}px !important`,
            },
          });
        });

        // Apply initial theme
        rendition.themes.select(currentTheme.name);

        // Handle text selection
        rendition.on("selected", (cfiRange: string, contents: Contents) => {
          const selection = contents.window.getSelection();
          if (selection && selection.toString().trim()) {
            onTextSelection?.(selection.toString().trim());
          }
        });

        // Handle location changes
        rendition.on("relocated", (location: any) => {
          setAtStart(location.atStart);
          setAtEnd(location.atEnd);

          // Find current chapter
          const currentHref = location.start.href;
          const chapter = toc.find((item) => item.href.includes(currentHref));
          if (chapter) {
            setCurrentChapter(chapter.label);
            onChapterChange?.(chapter.label, toc.indexOf(chapter));
          }
        });

        // Display first page
        await rendition.display();
        setIsLoading(false);
      } catch (err) {
        console.error("EPUB load error:", err);
        setError("Failed to load EPUB. Please try again.");
        setIsLoading(false);
      }
    };

    initBook();

    return () => {
      if (renditionRef.current) {
        renditionRef.current.destroy();
      }
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  }, [epubData]);

  // Update font size
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${fontSize}px`);
    }
  }, [fontSize]);

  // Update theme
  useEffect(() => {
    if (renditionRef.current) {
      // Re-register theme with current font size
      renditionRef.current.themes.register(currentTheme.name, {
        body: currentTheme.body,
        "p, span, div, h1, h2, h3, h4, h5, h6": {
          "font-size": `${fontSize}px !important`,
        },
      });
      renditionRef.current.themes.select(currentTheme.name);
    }
  }, [currentTheme, fontSize]);

  const goNext = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.next();
    }
  }, []);

  const goPrev = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.prev();
    }
  }, []);

  const goToChapter = useCallback((href: string) => {
    if (renditionRef.current) {
      renditionRef.current.display(href);
      setShowToc(false);
    }
  }, []);

  const increaseFontSize = () => {
    const currentIndex = FONT_SIZES.indexOf(fontSize);
    if (currentIndex < FONT_SIZES.length - 1) {
      setFontSize(FONT_SIZES[currentIndex + 1]);
    }
  };

  const decreaseFontSize = () => {
    const currentIndex = FONT_SIZES.indexOf(fontSize);
    if (currentIndex > 0) {
      setFontSize(FONT_SIZES[currentIndex - 1]);
    }
  };

  const cycleTheme = () => {
    const currentIndex = THEMES.findIndex((t) => t.name === currentTheme.name);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    setCurrentTheme(THEMES[nextIndex]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        goNext();
      } else if (e.key === "ArrowLeft") {
        goPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

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
        {/* TOC Toggle & Chapter Info */}
        <div className="flex items-center gap-2">
          <Button
            variant={showToc ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowToc(!showToc)}
          >
            <List className="w-4 h-4" />
          </Button>
          <span className="text-sm truncate max-w-[200px]">{currentChapter || "Contents"}</span>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={goPrev} disabled={atStart}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goNext} disabled={atEnd}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Theme & Font Controls */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={decreaseFontSize} disabled={fontSize <= FONT_SIZES[0]}>
            <Minus className="w-4 h-4" />
          </Button>
          <Type className="w-4 h-4" />
          <Button variant="ghost" size="icon" onClick={increaseFontSize} disabled={fontSize >= FONT_SIZES[FONT_SIZES.length - 1]}>
            <Plus className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={cycleTheme}>
            {currentTheme.name === "dark" ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table of Contents Sidebar */}
        {showToc && (
          <div className="w-64 border-r bg-card overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold mb-4">Table of Contents</h3>
              <nav className="space-y-1">
                {toc.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => goToChapter(item.href)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded text-sm hover:bg-muted transition-colors",
                      currentChapter === item.label && "bg-primary/10 text-primary"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* EPUB Rendition Container */}
        <div
          className="flex-1 relative"
          style={{
            background: currentTheme.body.background,
          }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          <div ref={viewerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}

export default EPUBViewer;
