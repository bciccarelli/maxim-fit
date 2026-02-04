'use client';

import { useState, useCallback, useRef } from 'react';

interface SSEChunkMessage {
  chunk: string;
}

interface SSEDoneMessage<T> {
  done: true;
  result: T;
}

interface SSEErrorMessage {
  error: string;
}

type SSEMessage<T> = SSEChunkMessage | SSEDoneMessage<T> | SSEErrorMessage;

interface UseSSEStreamReturn<T> {
  streamedText: string;
  result: T | null;
  error: string | null;
  isStreaming: boolean;
  stage: string | null;
  startStream: (url: string, options?: RequestInit) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for consuming SSE streams from API routes.
 * Returns streamed text progressively and the final parsed result.
 */
export function useSSEStream<T = unknown>(): UseSSEStreamReturn<T> {
  const [streamedText, setStreamedText] = useState('');
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStreamedText('');
    setResult(null);
    setError(null);
    setIsStreaming(false);
    setStage(null);
  }, []);

  const startStream = useCallback(async (url: string, options?: RequestInit): Promise<T | null> => {
    reset();
    setIsStreaming(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await fetch(url, {
        ...options,
        signal: abortController.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(data.error || `HTTP ${response.status}`);
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
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6);
          if (!jsonStr) continue;

          try {
            const message: SSEMessage<T> = JSON.parse(jsonStr);

            if ('chunk' in message) {
              accumulated += message.chunk;
              setStreamedText(accumulated);
            } else if ('stage' in message) {
              setStage((message as { stage: string }).stage);
            } else if ('done' in message && message.done) {
              finalResult = message.result;
              setResult(finalResult);
            } else if ('error' in message) {
              throw new Error(message.error);
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }

      setIsStreaming(false);
      return finalResult;
    } catch (err) {
      if (abortController.signal.aborted) return null;
      const message = err instanceof Error ? err.message : 'Stream error';
      setError(message);
      setIsStreaming(false);
      return null;
    }
  }, [reset]);

  return { streamedText, result, error, isStreaming, stage, startStream, reset };
}
