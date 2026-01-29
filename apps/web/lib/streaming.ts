/**
 * Creates an SSE-formatted ReadableStream from an async generator.
 *
 * SSE protocol:
 * - Chunks: data: {"chunk":"..."}\n\n
 * - Completion: data: {"done":true,"result":{...}}\n\n
 * - Errors: data: {"error":"..."}\n\n
 */
export function createSSEStream(
  generator: AsyncGenerator<string, unknown, unknown>,
  onComplete?: (result: unknown) => Promise<void>
): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        let result: IteratorResult<string, unknown>;
        do {
          result = await generator.next();
          if (!result.done && result.value) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ chunk: result.value })}\n\n`)
            );
          }
        } while (!result.done);

        // Send the final parsed result
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, result: result.value })}\n\n`)
        );

        // Post-stream persistence callback
        if (onComplete) {
          await onComplete(result.value);
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Stream error' })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * SSE response headers for Next.js API routes.
 */
export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
} as const;
