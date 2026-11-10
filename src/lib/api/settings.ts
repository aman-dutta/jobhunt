import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserSettings } from '@/lib/types/database.types'

export async function getUserSettings(supabase: SupabaseClient): Promise<UserSettings | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user settings:', error)
  }

  return data || null
}

export interface UserSettingsInput {
  master_resume?: string | null
  gemini_api_key?: string | null
  notification_emails?: string | null
  daily_summary_enabled?: boolean
  daily_summary_time?: string
}

export async function saveUserSettings(
  supabase: SupabaseClient,
  settings: UserSettingsInput
): Promise<UserSettings> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const payload: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }

  if (settings.master_resume !== undefined) {
    payload.master_resume = settings.master_resume ?? null
  }
  if (settings.gemini_api_key !== undefined) {
    payload.gemini_api_key = settings.gemini_api_key ?? null
  }
  if (settings.notification_emails !== undefined) {
    payload.notification_emails = settings.notification_emails ?? null
  }
  if (settings.daily_summary_enabled !== undefined) {
    payload.daily_summary_enabled = settings.daily_summary_enabled
  }
  if (settings.daily_summary_time !== undefined) {
    payload.daily_summary_time = settings.daily_summary_time
  }

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    console.error('Error saving user settings:', error)
    throw new Error(`Failed to save settings: ${error.message}`)
  }

  return data as UserSettings
}
