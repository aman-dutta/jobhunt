import type { SupabaseClient } from '@supabase/supabase-js'
import type { ApplicationActivity, ApplicationActivityInsert } from '@/lib/types/database.types'

/**
 * Helper to get the authenticated user's ID
 */
async function getUserId(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * Log an activity event in the database.
 * Fails gracefully without throwing to prevent blocking the main user flow.
 */
export async function logActivity(
  supabase: SupabaseClient,
  activity: ApplicationActivityInsert
): Promise<ApplicationActivity | null> {
  try {
    const userId = activity.user_id || (await getUserId(supabase))
    if (!userId) {
      console.warn('Cannot log activity: User not authenticated')
      return null
    }

    const payload: ApplicationActivityInsert = {
      ...activity,
      user_id: userId,
    }

    const { data, error } = await supabase
      .from('application_activities')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Failed to log application activity:', error.message)
      return null
    }

    return data as ApplicationActivity
  } catch (err) {
    console.error('Unexpected error logging application activity:', err)
    return null
  }
}

/**
 * Fetch activities for a given date range for the authenticated user
 */
export async function getActivitiesForDateRange(
  supabase: SupabaseClient,
  startDate: Date,
  endDate: Date
): Promise<ApplicationActivity[]> {
  const userId = await getUserId(supabase)
  if (!userId) return []

  const { data, error } = await supabase
    .from('application_activities')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch activities:', error.message)
    return []
  }

  return (data as ApplicationActivity[]) || []
}

/**
 * Fetch all activities that occurred today (start of day to now) in user's local timezone
 */
export async function getTodayActivities(
  supabase: SupabaseClient,
  referenceDate: Date = new Date()
): Promise<ApplicationActivity[]> {
  const startOfDay = new Date(referenceDate)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(referenceDate)
  endOfDay.setHours(23, 59, 59, 999)

  return getActivitiesForDateRange(supabase, startOfDay, endOfDay)
}
