import { useState, useCallback, useRef } from 'react';
import { aiApi } from '../api';

export interface UseAIStreamResult {
  content: string;
  isStreaming: boolean;
  error: Error | null;
  startStream: () => void;
  cancelStream: () => void;
}

/**
 * Hook for streaming AI chat responses
 */
export function useChatStream(
  documentId: string,
  message: string,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
): UseAIStreamResult {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const startStream = useCallback(() => {
    setContent('');
    setError(null);
    setIsStreaming(true);

    abortRef.current = aiApi.chatStream(
      { documentId, message, history },
      {
        onChunk: (chunk) => {
          if (chunk.content) {
            setContent((prev) => prev + chunk.content);
          }
        },
        onComplete: () => {
          setIsStreaming(false);
        },
        onError: (err) => {
          setError(err);
          setIsStreaming(false);
        },
      }
    );
  }, [documentId, message, history]);

  const cancelStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return {
    content,
    isStreaming,
    error,
    startStream,
    cancelStream,
  };
}

/**
 * Hook for streaming AI summarization
 */
export function useSummarizeStream(
  documentId: string,
  text: string,
  type: 'full' | 'selection' | 'chapter',
  format: 'paragraph' | 'bullet' = 'paragraph'
): UseAIStreamResult {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const startStream = useCallback(() => {
    setContent('');
    setError(null);
    setIsStreaming(true);

    abortRef.current = aiApi.summarizeStream(
      { documentId, text, type, format },
      {
        onChunk: (chunk) => {
          if (chunk.content) {
            setContent((prev) => prev + chunk.content);
          }
        },
        onComplete: () => {
          setIsStreaming(false);
        },
        onError: (err) => {
          setError(err);
          setIsStreaming(false);
        },
      }
    );
  }, [documentId, text, type, format]);

  const cancelStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return {
    content,
    isStreaming,
    error,
    startStream,
    cancelStream,
  };
}
