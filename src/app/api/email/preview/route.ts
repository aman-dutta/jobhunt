import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { compileTodayDigest } from '@/lib/email/digestService'
import { generateDailySummaryEmail } from '@/lib/email/summaryTemplate'
import type { SummaryData } from '@/lib/email/summaryTemplate'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userName =
      (user?.user_metadata?.full_name as string) ||
      (user?.user_metadata?.name as string) ||
      user?.email?.split('@')[0] ||
      'Aman'

    let body: { mode?: string; customRecipients?: string[] } = {}
    try {
      body = await request.json()
    } catch {
      // Empty or invalid body is allowed, defaults to 'today'
    }

    const mode = body.mode || 'today'
    const recipients =
      body.customRecipients && body.customRecipients.length > 0
        ? body.customRecipients
        : [user?.email || 'aman@gmail.com', 'friend1@gmail.com', 'friend2@gmail.com']

    const now = new Date()
    const dateFormatted = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    if (mode === 'active_demo') {
      const demoData: SummaryData = {
        userName,
        dateFormatted,
        activities: [
          {
            id: 'd1',
            user_id: user?.id || 'demo',
            application_id: 'app-1',
            company_name: 'Stripe',
            job_title: 'Staff Full Stack Engineer',
            activity_type: 'created',
            from_status: null,
            to_status: 'applied',
            metadata: {},
            created_at: new Date().toISOString(),
          },
          {
            id: 'd2',
            user_id: user?.id || 'demo',
            application_id: 'app-2',
            company_name: 'Google',
            job_title: 'Senior Frontend Engineer',
            activity_type: 'status_changed',
            from_status: 'applied',
            to_status: 'interviewing',
            metadata: {},
            created_at: new Date().toISOString(),
          },
          {
            id: 'd3',
            user_id: user?.id || 'demo',
            application_id: 'app-3',
            company_name: 'Linear',
            job_title: 'Product Engineer',
            activity_type: 'status_changed',
            from_status: 'wishlist',
            to_status: 'applied',
            metadata: {},
            created_at: new Date().toISOString(),
          },
        ],
        pipelineSummary: {
          wishlist: 4,
          applied: 8,
          interviewing: 3,
          offered: 1,
          rejected: 2,
        },
        recipientEmails: recipients,
      }

      const email = generateDailySummaryEmail(demoData)
      return NextResponse.json({
        ...email,
        recipients,
        userName,
      })
    }

    if (mode === 'rest_demo') {
      const restData: SummaryData = {
        userName,
        dateFormatted,
        activities: [],
        pipelineSummary: {
          wishlist: 5,
          applied: 8,
          interviewing: 3,
          offered: 1,
          rejected: 2,
        },
        recipientEmails: recipients,
      }

      const email = generateDailySummaryEmail(restData)
      return NextResponse.json({
        ...email,
        recipients,
        userName,
      })
    }

    // Default: 'today' live data
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const digest = await compileTodayDigest(supabase)
    return NextResponse.json({
      ...digest.email,
      recipients: digest.recipients,
      userName: digest.userName,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
