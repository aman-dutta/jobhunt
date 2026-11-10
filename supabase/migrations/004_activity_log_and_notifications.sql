-- ============================================================================
-- 004: ACTIVITY LOGGING & DAILY NOTIFICATIONS SETTINGS
-- ============================================================================

-- 1. Create application_activities table for tracking status transitions and events
CREATE TABLE IF NOT EXISTS application_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'created', 'status_changed', 'contact_added', 'notes_updated', 'deleted'
  )),
  from_status TEXT,
  to_status TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for application_activities
ALTER TABLE application_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own activities"
  ON application_activities FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_activities_user_date ON application_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_application ON application_activities(application_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON application_activities TO authenticated;

-- 2. Add notification preferences to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notification_emails TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS daily_summary_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS daily_summary_time TEXT DEFAULT '21:00';
