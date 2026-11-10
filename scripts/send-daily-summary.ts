/**
 * Daily Summary Email Dispatcher CLI
 * Usage: bun run scripts/send-daily-summary.ts
 *
 * Can be scheduled via macOS cron:
 * 0 21 * * * cd /path/to/jobhunt && bun run scripts/send-daily-summary.ts >> /tmp/jobhunt-email.log 2>&1
 */

import { createClient } from '@supabase/supabase-js'
import { generateDailySummaryEmail } from '../src/lib/email/summaryTemplate'
import { parseRecipientEmails, sendDailyDigestEmail } from '../src/lib/email/sender'
import type { Application, ApplicationActivity } from '../src/lib/types/database.types'

async function runDailySummary() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log(`[${new Date().toISOString()}] 🚀 Starting daily summary email run...`)

  // Fetch users with user_settings
  const { data: settingsList, error: settingsError } = await supabase
    .from('user_settings')
    .select('*')
    .eq('daily_summary_enabled', true)

  if (settingsError) {
    console.error('Failed to query user_settings:', settingsError.message)
    process.exit(1)
  }

  if (!settingsList || settingsList.length === 0) {
    console.log('No users with daily_summary_enabled found.')
    return
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  for (const setting of settingsList) {
    try {
      const userId = setting.user_id

      // Fetch user's auth details if possible, or fallback to notification_emails
      const rawEmails = setting.notification_emails || ''
      const recipients = parseRecipientEmails(rawEmails)

      if (recipients.length === 0) {
        console.log(`⚠️ User ${userId} has no notification emails configured. Skipping.`)
        continue
      }

      // Fetch today's activities
      const { data: activities } = await supabase
        .from('application_activities')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString())
        .order('created_at', { ascending: false })

      // Fetch applications for pipeline summary
      const { data: applications } = await supabase
        .from('applications')
        .select('status')
        .eq('user_id', userId)

      const apps = (applications as Pick<Application, 'status'>[]) || []
      const pipelineSummary = {
        wishlist: apps.filter(a => a.status === 'wishlist').length,
        applied: apps.filter(a => a.status === 'applied').length,
        interviewing: apps.filter(a =>
          ['interviewing', 'phone_screen', 'assessment', 'take_home', 'final_round'].includes(
            a.status
          )
        ).length,
        offered: apps.filter(a => a.status === 'offered').length,
        rejected: apps.filter(a => a.status === 'rejected').length,
      }

      const emailData = generateDailySummaryEmail({
        userName: 'Aman',
        dateFormatted: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        activities: (activities as ApplicationActivity[]) || [],
        pipelineSummary,
        recipientEmails: recipients,
      })

      const sendResult = await sendDailyDigestEmail({
        recipients,
        subject: emailData.subject,
        html: emailData.html,
      })

      console.log(
        `✅ Successfully sent daily summary to ${recipients.join(', ')} via ${
          sendResult.provider
        } [ID: ${sendResult.messageId}]`
      )
    } catch (userErr) {
      console.error(`Error processing user ${setting.user_id}:`, userErr)
    }
  }

  console.log(`[${new Date().toISOString()}] Finished daily summary run.`)
}

runDailySummary().catch(console.error)
