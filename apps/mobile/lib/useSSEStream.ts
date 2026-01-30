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
  // Use a ref for accumulated text to avoid closure issues
  const accumulatedRef = useRef('');
  // Use a counter to force re-renders since React Native may batch rapid state updates
  const [, forceUpdate] = useState(0);
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
    accumulatedRef.current = '';
    setStreamedText('');
    setResult(null);
    setError(null);
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(async (url: string, options?: RequestInit): Promise<T | null> => {
    // Reset state
    accumulatedRef.current = '';
    setStreamedText('');
    setResult(null);
    setError(null);
    setIsStreaming(true);

    return new Promise((resolve) => {
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
        console.log('[SSE] Message received:', typeof event.data, event.data?.substring?.(0, 100));
        if (!event.data) {
          console.log('[SSE] No event.data');
          return;
        }

        try {
          const message = JSON.parse(event.data);
          console.log('[SSE] Parsed message keys:', Object.keys(message));

          if ('chunk' in message && typeof message.chunk === 'string') {
            // Text chunk - accumulate using ref to avoid closure issues
            accumulatedRef.current += message.chunk;
            console.log('[SSE] Chunk received, total length:', accumulatedRef.current.length);
            // Update state and force re-render
            setStreamedText(accumulatedRef.current);
            forceUpdate(c => c + 1);
          } else if ('done' in message && message.done === true) {
            // Stream complete - extract result
            console.log('[SSE] Done received');
            finalResult = message.result as T;
            setResult(finalResult);
            setIsStreaming(false);
            es.close();
            eventSourceRef.current = null;
            resolve(finalResult);
          } else if ('error' in message) {
            // Stream error
            console.log('[SSE] Error received:', message.error);
            setError(message.error);
            setIsStreaming(false);
            es.close();
            eventSourceRef.current = null;
            resolve(null);
          } else if ('stage' in message) {
            // Stage update (e.g., 'verifying') - ignore for now
            console.log('[SSE] Stage:', message.stage);
          }
        } catch (parseError) {
          // Skip JSON parse errors
          console.warn('[SSE] Parse error:', parseError, 'Data:', event.data?.substring?.(0, 50));
        }
      });

      // Handle errors
      es.addEventListener('error', (event) => {
        console.error('[SSE] Error event:', event);

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
        console.log('[SSE] Connection opened to:', url);
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
