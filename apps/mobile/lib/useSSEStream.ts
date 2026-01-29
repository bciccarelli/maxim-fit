import { useState, useCallback, useRef } from 'react';

export interface UseSSEStreamReturn<T> {
  /** Accumulated text from stream chunks */
  streamedText: string;
  /** Final parsed result when stream completes */
  result: T | null;
  /** Error message if stream fails */
  error: string | null;
  /** Whether stream is currently active */
  isStreaming: boolean;
  /** Start a new stream */
  startStream: (url: string, options?: RequestInit) => Promise<T | null>;
  /** Reset state and abort any active stream */
  reset: () => void;
}

/**
 * Hook for consuming Server-Sent Events (SSE) streams in React Native
 *
 * Handles the SSE protocol used by the protocol API:
 * - `data: {"chunk":"..."}` - Text chunk to accumulate
 * - `data: {"done":true,"result":{...}}` - Stream complete with final result
 * - `data: {"error":"..."}` - Stream error
 */
export function useSSEStream<T = unknown>(): UseSSEStreamReturn<T> {
  const [streamedText, setStreamedText] = useState('');
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    // Abort any active stream
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStreamedText('');
    setResult(null);
    setError(null);
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(async (url: string, options?: RequestInit): Promise<T | null> => {
    // Reset state
    setStreamedText('');
    setResult(null);
    setError(null);
    setIsStreaming(true);

    // Create abort controller
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      // Handle non-OK responses
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Request failed' }));

        // Handle upgrade required (Pro tier)
        if (response.status === 402) {
          throw new Error(data.message || 'This feature requires a Pro subscription');
        }

        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let finalResult: T | null = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

        for (const line of lines) {
          // Skip empty lines and non-data lines
          if (!line.startsWith('data: ')) {
            continue;
          }

          const jsonStr = line.slice(6); // Remove 'data: ' prefix
          if (!jsonStr) {
            continue;
          }

          try {
            const message = JSON.parse(jsonStr);

            if ('chunk' in message && typeof message.chunk === 'string') {
              // Text chunk - accumulate
              accumulated += message.chunk;
              setStreamedText(accumulated);
            } else if ('done' in message && message.done === true) {
              // Stream complete - extract result
              finalResult = message.result as T;
              setResult(finalResult);
            } else if ('error' in message) {
              // Stream error
              throw new Error(message.error);
            }
          } catch (parseError) {
            // Skip JSON parse errors (incomplete messages)
            if (parseError instanceof SyntaxError) {
              continue;
            }
            throw parseError;
          }
        }
      }

      setIsStreaming(false);
      return finalResult;
    } catch (e) {
      // Don't set error if aborted
      if (controller.signal.aborted) {
        return null;
      }

      const errorMessage = e instanceof Error ? e.message : 'Stream error';
      setError(errorMessage);
      setIsStreaming(false);
      return null;
    }
  }, []);

  return {
    streamedText,
    result,
    error,
    isStreaming,
    startStream,
    reset,
  };
}
