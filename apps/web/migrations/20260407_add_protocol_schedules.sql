-- Migration: Add protocol_schedules table for calendar scheduling
-- Run this via Supabase dashboard SQL editor

-- Table for mapping date ranges to protocol chains
CREATE TABLE IF NOT EXISTS protocol_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_chain_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,          -- NULL = indefinite (runs until replaced)
  label TEXT,             -- optional display name (defaults to protocol name)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_schedules_user ON protocol_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_protocol_schedules_lookup ON protocol_schedules(user_id, start_date, end_date);

ALTER TABLE protocol_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own schedules"
  ON protocol_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedules"
  ON protocol_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedules"
  ON protocol_schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedules"
  ON protocol_schedules FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_protocol_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protocol_schedules_updated_at
  BEFORE UPDATE ON protocol_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_protocol_schedules_updated_at();
