-- ============================================================================
-- 003: ADD CONTACTS, FOLLOW-UPS, JOB DESCRIPTION & COVER LETTER SUPPORT
-- ============================================================================

-- 1. Add job_description and cover_letter to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS job_description TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cover_letter TEXT;

-- 2. Create application_contacts table for tracking HR, recruiters, and referral outreach
CREATE TABLE IF NOT EXISTS application_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'Recruiter',
  linkedin_url TEXT,
  email TEXT,
  outreach_status TEXT NOT NULL DEFAULT 'contacted' CHECK (outreach_status IN (
    'to_contact', 'contacted', 'followed_up', 'replied', 'referred', 'no_response'
  )),
  last_contact_date DATE DEFAULT CURRENT_DATE,
  follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for application_contacts
ALTER TABLE application_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their application contacts"
  ON application_contacts FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_contacts_application_id ON application_contacts(application_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_follow_up ON application_contacts(user_id, follow_up_date);

-- Trigger for application_contacts updated_at
CREATE TRIGGER update_application_contacts_updated_at
  BEFORE UPDATE ON application_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Create user_settings table for Master Resume & AI preferences
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  master_resume TEXT,
  gemini_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their settings"
  ON user_settings FOR ALL USING (auth.uid() = user_id);

-- Update helper view
DROP VIEW IF EXISTS applications_with_company;
CREATE VIEW applications_with_company AS
SELECT
  a.id, a.user_id, a.company_id,
  c.name as company_name, c.website as company_website, c.logo_url as company_logo,
  a.job_title, a.job_url, a.location, a.salary_range,
  a.status, a.date_applied, a.notes, a.position,
  a.job_description, a.cover_letter,
  a.created_at, a.updated_at
FROM applications a
LEFT JOIN companies c ON a.company_id = c.id;

GRANT SELECT, INSERT, UPDATE, DELETE ON application_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO authenticated;
GRANT SELECT ON applications_with_company TO authenticated;
