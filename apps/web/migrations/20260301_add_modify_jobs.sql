-- Migration: Add modify_jobs table for background-resilient modify operations
-- Run this via Supabase MCP or dashboard SQL editor

CREATE TABLE IF NOT EXISTS modify_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,

  -- Job state machine: pending → researching → research_complete → awaiting_answers → applying → completed/failed
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'researching',
    'research_complete',
    'awaiting_answers',
    'applying',
    'completed',
    'failed'
  )),

  -- Phase 1 outputs (persisted after research completes)
  research_text TEXT,
  research_citations JSONB DEFAULT '[]',
  research_summary TEXT,

  -- Phase 2 outputs (questions if any)
  questions JSONB,
  user_answers JSONB,

  -- Phase 3 outputs (the final result)
  modification_id UUID REFERENCES protocol_modifications(id),

  -- Error tracking
  error_message TEXT,

  -- Progress tracking for UI
  current_stage TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_modify_jobs_user_status ON modify_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_modify_jobs_protocol ON modify_jobs(protocol_id);
CREATE INDEX IF NOT EXISTS idx_modify_jobs_expires ON modify_jobs(expires_at) WHERE status NOT IN ('completed', 'failed');

-- RLS policies
ALTER TABLE modify_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own modify jobs"
  ON modify_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own modify jobs"
  ON modify_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own modify jobs"
  ON modify_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own modify jobs"
  ON modify_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modify_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER modify_jobs_updated_at
  BEFORE UPDATE ON modify_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_modify_jobs_updated_at();
