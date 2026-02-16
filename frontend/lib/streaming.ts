/**
 * SSE (Server-Sent Events) streaming utilities
 */

export interface StreamChunk {
  content: string;
  done: boolean;
  error?: string;
}

export interface StreamOptions {
  onChunk: (chunk: StreamChunk) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Connect to an SSE endpoint and handle streaming responses
 */
export function connectSSE(url: string, options: StreamOptions): () => void {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let aborted = false;

  const abort = () => {
    aborted = true;
    if (reader) {
      reader.cancel();
    }
  };

  (async () => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Send cookies
        headers: {
          Accept: 'text/event-stream',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!aborted) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode chunk
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed: StreamChunk = JSON.parse(data);
              options.onChunk(parsed);

              if (parsed.done) {
                if (parsed.error) {
                  options.onError?.(new Error(parsed.error));
                } else {
                  options.onComplete?.();
                }
                return;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      options.onComplete?.();
    } catch (error) {
      if (!aborted) {
        options.onError?.(error as Error);
      }
    }
  })();

  return abort;
}

/**
 * POST request with SSE streaming response
 */
export function streamPOST(
  url: string,
  body: any,
  options: StreamOptions
): () => void {
  let aborted = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  const abort = () => {
    aborted = true;
    if (reader) {
      reader.cancel();
    }
  };

  (async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!aborted) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed: StreamChunk = JSON.parse(data);
              options.onChunk(parsed);

              if (parsed.done) {
                if (parsed.error) {
                  options.onError?.(new Error(parsed.error));
                } else {
                  options.onComplete?.();
                }
                return;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      options.onComplete?.();
    } catch (error) {
      if (!aborted) {
        options.onError?.(error as Error);
      }
    }
  })();

  return abort;
}
