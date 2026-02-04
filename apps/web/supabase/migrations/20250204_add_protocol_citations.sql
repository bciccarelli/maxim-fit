-- Add citations column to protocols table
-- Citations are accumulated from verify, modify, and ask operations that use Google Search grounding

ALTER TABLE protocols
ADD COLUMN citations JSONB DEFAULT '[]'::jsonb;

-- Add GIN index for efficient JSONB queries on citations
CREATE INDEX idx_protocols_citations ON protocols USING gin(citations);

-- Add comment for documentation
COMMENT ON COLUMN protocols.citations IS 'Array of citation objects from Google Search grounding: [{id, url, title, domain, relevantText, operation, operationTimestamp}]';
