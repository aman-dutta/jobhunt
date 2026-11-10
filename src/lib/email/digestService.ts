import type { SupabaseClient } from '@supabase/supabase-js'
import { getTodayActivities } from '@/lib/api/activities'
import { generateDailySummaryEmail, type GeneratedEmail, type SummaryData } from './summaryTemplate'
import { parseRecipientEmails, sendDailyDigestEmail, type SendDigestResult } from './sender'
import type { Application } from '@/lib/types/database.types'

export interface CompiledDigest {
  email: GeneratedEmail
  recipients: string[]
  userName: string
  isEnabled: boolean
}

/**
 * Compiles today's summary digest data for the current user
 */
export async function compileTodayDigest(supabase: SupabaseClient): Promise<CompiledDigest> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User is not authenticated')
  }

  const userName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split('@')[0] ||
    'Aman'

  // Fetch user settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const isEnabled = settings?.daily_summary_enabled !== false

  // Parse recipient list: User's own email + any friend emails listed in settings
  const rawRecipientString = settings?.notification_emails || ''
  const additionalRecipients = parseRecipientEmails(rawRecipientString)
  const allRecipients = Array.from(
    new Set([user.email || '', ...additionalRecipients].filter(Boolean))
  )

  // Fetch today's activities
  const activities = await getTodayActivities(supabase)

  // Fetch all applications for pipeline summary
  const { data: applications } = await supabase
    .from('applications')
    .select('status')
    .eq('user_id', user.id)

  const apps = (applications as Pick<Application, 'status'>[]) || []
  const pipelineSummary = {
    wishlist: apps.filter(a => a.status === 'wishlist').length,
    applied: apps.filter(a => a.status === 'applied').length,
    interviewing: apps.filter(a =>
      ['interviewing', 'phone_screen', 'assessment', 'take_home', 'final_round'].includes(a.status)
    ).length,
    offered: apps.filter(a => a.status === 'offered').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  }

  const now = new Date()
  const dateFormatted = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const summaryData: SummaryData = {
    userName,
    dateFormatted,
    activities,
    pipelineSummary,
    recipientEmails: allRecipients,
  }

  const email = generateDailySummaryEmail(summaryData)

  return {
    email,
    recipients: allRecipients,
    userName,
    isEnabled,
  }
}

/**
 * Sends today's summary digest email for the current user
 */
export async function sendTodaySummary(supabase: SupabaseClient): Promise<SendDigestResult> {
  const digest = await compileTodayDigest(supabase)

  return sendDailyDigestEmail({
    recipients: digest.recipients,
    subject: digest.email.subject,
    html: digest.email.html,
  })
}
