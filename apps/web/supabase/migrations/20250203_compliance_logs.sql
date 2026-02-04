-- Compliance Logs Table
-- Tracks user completion of protocol activities (schedule blocks, meals, supplements, workouts, hydration)

create table compliance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  protocol_id uuid not null references protocols(id) on delete cascade,

  -- What was completed
  activity_type text not null check (activity_type in ('schedule_block', 'meal', 'supplement', 'workout', 'hydration')),
  activity_index integer not null,
  activity_name text not null,

  -- When
  scheduled_date date not null,
  scheduled_time time,
  completed_at timestamptz not null default now(),

  -- Context
  skipped boolean not null default false,
  notes text,

  created_at timestamptz not null default now(),

  -- Prevent duplicate logging for same activity on same day
  unique(user_id, protocol_id, activity_type, activity_index, scheduled_date)
);

-- Indexes for common queries
create index idx_compliance_logs_user_date on compliance_logs(user_id, scheduled_date);
create index idx_compliance_logs_protocol_date on compliance_logs(protocol_id, scheduled_date);

-- Row Level Security
alter table compliance_logs enable row level security;

-- Users can only see their own compliance logs
create policy "Users can view their own compliance logs"
  on compliance_logs for select
  using (auth.uid() = user_id);

-- Users can only insert their own compliance logs
create policy "Users can insert their own compliance logs"
  on compliance_logs for insert
  with check (auth.uid() = user_id);

-- Users can only update their own compliance logs
create policy "Users can update their own compliance logs"
  on compliance_logs for update
  using (auth.uid() = user_id);

-- Users can only delete their own compliance logs
create policy "Users can delete their own compliance logs"
  on compliance_logs for delete
  using (auth.uid() = user_id);
