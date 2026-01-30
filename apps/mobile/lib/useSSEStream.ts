import { useState, useCallback, useRef } from 'react';
import EventSource from 'react-native-sse';

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
 * Uses react-native-sse for proper SSE support on mobile.
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
  const eventSourceRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    // Close any active stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
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

    return new Promise((resolve) => {
      let accumulated = '';
      let finalResult: T | null = null;

      // Create EventSource with POST support
      const es = new EventSource(url, {
        headers: options?.headers as Record<string, string>,
        method: (options?.method as 'POST') || 'POST',
        body: options?.body as string,
        pollingInterval: 0, // Disable polling, use true SSE
      });

      eventSourceRef.current = es;

      // Handle messages
      es.addEventListener('message', (event) => {
        if (!event.data) return;

        try {
          const message = JSON.parse(event.data);

          if ('chunk' in message && typeof message.chunk === 'string') {
            // Text chunk - accumulate
            accumulated += message.chunk;
            setStreamedText(accumulated);
          } else if ('done' in message && message.done === true) {
            // Stream complete - extract result
            finalResult = message.result as T;
            setResult(finalResult);
            setIsStreaming(false);
            es.close();
            eventSourceRef.current = null;
            resolve(finalResult);
          } else if ('error' in message) {
            // Stream error
            setError(message.error);
            setIsStreaming(false);
            es.close();
            eventSourceRef.current = null;
            resolve(null);
          }
        } catch (parseError) {
          // Skip JSON parse errors
          console.warn('SSE parse error:', parseError);
        }
      });

      // Handle errors
      es.addEventListener('error', (event) => {
        console.error('SSE error:', event);

        // Check if it's an HTTP error
        const errorEvent = event as unknown as { message?: string; status?: number };

        if (errorEvent.status === 402) {
          setError('This feature requires a Pro subscription');
        } else if (errorEvent.message) {
          setError(errorEvent.message);
        } else {
          setError('Connection error. Please try again.');
        }

        setIsStreaming(false);
        es.close();
        eventSourceRef.current = null;
        resolve(null);
      });

      // Handle connection open
      es.addEventListener('open', () => {
        console.log('SSE connection opened');
      });
    });
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
