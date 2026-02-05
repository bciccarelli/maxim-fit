import { v4 as uuidv4 } from 'uuid';
import type { Citation, CitationOperation } from '@protocol/shared/schemas';

/**
 * Grounding metadata structure from Gemini API.
 * These types match the @google/genai SDK response structure.
 */
interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
    domain?: string;
  };
}

interface GroundingSupport {
  segment?: {
    startIndex?: number;
    endIndex?: number;
    text?: string;
  };
  groundingChunkIndices?: number[];
  confidenceScores?: number[];
}

interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
  webSearchQueries?: string[];
}

/**
 * Extract citations from Gemini grounding metadata.
 * Maps grounding chunks to Citation objects, linking relevant text segments.
 */
export function extractCitations(
  groundingMetadata: GroundingMetadata | undefined | null,
  operation: CitationOperation
): Citation[] {
  if (!groundingMetadata?.groundingChunks) {
    console.log('[extractCitations] No grounding chunks found');
    return [];
  }

  const chunks = groundingMetadata.groundingChunks;
  const supports = groundingMetadata.groundingSupports || [];
  const timestamp = new Date().toISOString();

  console.log('[extractCitations] Raw chunks count:', chunks.length);
  console.log('[extractCitations] Sample chunks:', JSON.stringify(chunks.slice(0, 2)));

  // Build a map of chunk index -> text segments it supports
  const chunkToTexts = new Map<number, string[]>();
  for (const support of supports) {
    if (support.segment?.text && support.groundingChunkIndices) {
      for (const idx of support.groundingChunkIndices) {
        const existing = chunkToTexts.get(idx) || [];
        existing.push(support.segment.text);
        chunkToTexts.set(idx, existing);
      }
    }
  }

  // Filter to chunks with at least a URI (title is optional)
  const validChunks = chunks.filter(
    (chunk): chunk is GroundingChunk & { web: { uri: string; title?: string; domain?: string } } =>
      !!chunk.web?.uri
  );

  console.log('[extractCitations] Valid chunks after filter:', validChunks.length);

  return validChunks.map((chunk, idx): Citation => {
    // Extract domain from URL if not provided
    let domain = chunk.web.domain || '';
    if (!domain && chunk.web.uri) {
      try {
        domain = new URL(chunk.web.uri).hostname;
      } catch {
        domain = '';
      }
    }

    // Use domain as fallback title if no title provided
    const title = chunk.web.title || domain || 'Source';

    return {
      id: uuidv4(),
      url: chunk.web.uri,
      title,
      domain,
      relevantText: chunkToTexts.get(idx)?.[0] || null,
      operation,
      operationTimestamp: timestamp,
    };
  });
}

/**
 * Merge new citations with existing ones, deduplicating by URL.
 * Newer citations with the same URL replace older ones.
 */
export function mergeCitations(
  existing: Citation[],
  newCitations: Citation[]
): Citation[] {
  // Build a map of URL -> citation, newer citations overwrite older ones
  const urlMap = new Map<string, Citation>();

  // Add existing citations first
  for (const citation of existing) {
    urlMap.set(citation.url, citation);
  }

  // Add new citations, which may overwrite existing ones with same URL
  for (const citation of newCitations) {
    // If URL already exists, keep the existing one (first occurrence wins)
    if (!urlMap.has(citation.url)) {
      urlMap.set(citation.url, citation);
    }
  }

  return Array.from(urlMap.values());
}

/**
 * Extract grounding metadata from a Gemini API response.
 * Handles both streaming and non-streaming response structures.
 */
export function getGroundingMetadata(response: {
  candidates?: Array<{
    groundingMetadata?: GroundingMetadata;
  }>;
}): GroundingMetadata | undefined {
  return response.candidates?.[0]?.groundingMetadata;
}
