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
  const { data: settingsList } = await supabase
    .from('user_settings')
    .select('*')
    .eq('daily_summary_enabled', true)

  interface TargetUser {
    userId: string
    userName: string
    recipients: string[]
  }

  const targetUsers: TargetUser[] = []

  if (settingsList && settingsList.length > 0) {
    for (const setting of settingsList) {
      let userName = 'Aman'
      let userEmail = ''
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(setting.user_id)
        if (authUser?.user) {
          userEmail = authUser.user.email || ''
          userName =
            (authUser.user.user_metadata?.full_name as string) ||
            (authUser.user.user_metadata?.name as string) ||
            userEmail.split('@')[0] ||
            'Aman'
        }
      } catch {
        // Fallback gracefully
      }

      const extraRecipients = parseRecipientEmails(setting.notification_emails || '')
      const recipients = Array.from(new Set([userEmail, ...extraRecipients].filter(Boolean)))

      if (recipients.length > 0) {
        targetUsers.push({ userId: setting.user_id, userName, recipients })
      }
    }
  }

  // Fallback: If no user_settings row saved yet, fetch registered users from Supabase Auth
  if (targetUsers.length === 0) {
    try {
      const { data: usersData } = await supabase.auth.admin.listUsers()
      if (usersData?.users && usersData.users.length > 0) {
        for (const u of usersData.users) {
          if (u.email) {
            const userName =
              (u.user_metadata?.full_name as string) ||
              (u.user_metadata?.name as string) ||
              u.email.split('@')[0] ||
              'Aman'
            targetUsers.push({ userId: u.id, userName, recipients: [u.email] })
          }
        }
      }
    } catch (authErr) {
      console.warn('Could not query fallback auth users:', authErr)
    }
  }

  if (targetUsers.length === 0) {
    console.log('No eligible users found for daily summary email.')
    return
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  for (const target of targetUsers) {
    try {
      const { userId, userName, recipients } = target

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
        userName,
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
      console.error(`Error processing user ${target.userId}:`, userErr)
    }
  }

  console.log(`[${new Date().toISOString()}] Finished daily summary run.`)
}

runDailySummary().catch(console.error)
