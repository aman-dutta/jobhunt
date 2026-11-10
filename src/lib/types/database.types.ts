export type ApplicationStatus =
  | 'wishlist'
  | 'applied'
  | 'phone_screen'
  | 'assessment'
  | 'take_home'
  | 'interviewing'
  | 'final_round'
  | 'offered'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'ghosted'

export interface Application {
  id: string
  user_id: string
  company_name: string
  job_title: string
  job_url: string | null
  location: string | null
  salary_range: string | null
  job_description?: string | null
  cover_letter?: string | null
  company_logo_url?: string | null
  source?: string | null
  status: ApplicationStatus
  date_applied: string
  notes: string | null
  position: number
  created_at: string
  updated_at: string
}

export type ApplicationInsert = Omit<Application, 'id' | 'created_at' | 'updated_at' | 'user_id'>
export type ApplicationUpdate = Partial<Omit<Application, 'id' | 'user_id'>>

export type OutreachStatus =
  | 'to_contact'
  | 'contacted'
  | 'followed_up'
  | 'replied'
  | 'referred'
  | 'no_response'

export interface ApplicationContact {
  id: string
  application_id: string
  user_id: string
  name: string
  role: string | null
  linkedin_url: string | null
  email: string | null
  outreach_status: OutreachStatus
  last_contact_date: string | null
  follow_up_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ApplicationContactInsert = Omit<
  ApplicationContact,
  'id' | 'created_at' | 'updated_at' | 'user_id'
>

export type ApplicationContactUpdate = Partial<
  Omit<ApplicationContact, 'id' | 'user_id' | 'application_id'>
>

export interface UserSettings {
  user_id: string
  master_resume: string | null
  gemini_api_key: string | null
  notification_emails: string | null
  daily_summary_enabled: boolean
  daily_summary_time: string
  created_at: string
  updated_at: string
}

export type ActivityType =
  | 'created'
  | 'status_changed'
  | 'contact_added'
  | 'notes_updated'
  | 'deleted'

export interface ApplicationActivity {
  id: string
  user_id: string
  application_id: string | null
  company_name: string
  job_title: string
  activity_type: ActivityType
  from_status: string | null
  to_status: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type ApplicationActivityInsert = Omit<ApplicationActivity, 'id' | 'created_at'>
