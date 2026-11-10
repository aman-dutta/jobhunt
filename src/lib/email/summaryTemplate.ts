import type { ApplicationActivity } from '@/lib/types/database.types'

export interface SummaryData {
  userName: string
  dateFormatted: string
  activities: ApplicationActivity[]
  pipelineSummary: {
    wishlist: number
    applied: number
    interviewing: number
    offered: number
    rejected: number
  }
  pendingFollowUps?: Array<{
    company_name: string
    contact_name: string
    follow_up_date: string
  }>
  recipientEmails?: string[]
}

export interface GeneratedEmail {
  subject: string
  html: string
  isRestDay: boolean
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return '—'
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getStatusBadgeStyle(status: string | null): string {
  switch (status) {
    case 'offered':
      return 'background-color: #10b981; color: #ffffff;'
    case 'interviewing':
    case 'phone_screen':
    case 'final_round':
      return 'background-color: #8b5cf6; color: #ffffff;'
    case 'applied':
      return 'background-color: #3b82f6; color: #ffffff;'
    case 'rejected':
      return 'background-color: #ef4444; color: #ffffff;'
    case 'wishlist':
    default:
      return 'background-color: #64748b; color: #ffffff;'
  }
}

export function generateDailySummaryEmail(data: SummaryData): GeneratedEmail {
  const isRestDay = data.activities.length === 0
  const userName = data.userName || 'Aman'

  const subject = isRestDay
    ? `☕ JobHunt Digest: Rest day for ${userName}! (Pipeline snapshot inside)`
    : data.activities.length === 1
      ? `🎯 JobHunt Daily: ${userName} made 1 move today! (${data.activities[0].company_name})`
      : `🎯 JobHunt Daily: ${userName} made ${data.activities.length} moves today!`

  const restDayMessages = [
    `Looks like a rest day for ${userName}! ☕`,
    `Every high-performance routine includes strategic pauses. No applications were submitted or moved today — whether you were prepping, recharging, or living life, balance is key!`,
  ]

  // Render activity rows if active
  const activitiesHtml = data.activities
    .map(act => {
      let actionDescription = ''
      if (act.activity_type === 'created') {
        actionDescription = `Added new application in <strong style="color: #60a5fa;">${formatStatus(
          act.to_status
        )}</strong>`
      } else if (act.activity_type === 'status_changed') {
        actionDescription = `Moved from <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; ${getStatusBadgeStyle(
          act.from_status
        )}">${formatStatus(
          act.from_status
        )}</span> ➔ <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; ${getStatusBadgeStyle(
          act.to_status
        )}">${formatStatus(act.to_status)}</span>`
      } else {
        actionDescription = `Updated (${act.activity_type.replace('_', ' ')})`
      }

      return `
        <tr style="border-bottom: 1px solid #27272a;">
          <td style="padding: 14px 16px;">
            <div style="font-weight: 600; font-size: 15px; color: #f4f4f5;">${act.company_name}</div>
            <div style="font-size: 13px; color: #a1a1aa; margin-top: 2px;">${act.job_title}</div>
          </td>
          <td style="padding: 14px 16px; font-size: 13px; color: #e4e4e7; text-align: right;">
            ${actionDescription}
          </td>
        </tr>
      `
    })
    .join('')

  const activeContent = `
    <!-- Active Highlights Header -->
    <div style="background: linear-gradient(135deg, #18181b, #27272a); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #3f3f46;">
      <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #f4f4f5; font-weight: 600;">
        🔥 Today's Momentum: ${data.activities.length} ${
          data.activities.length === 1 ? 'Update' : 'Updates'
        }
      </h2>
      <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
        ${userName} took action on the job hunt today. Keep the fire burning!
      </p>
    </div>

    <!-- Activities Table -->
    <table style="width: 100%; border-collapse: collapse; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <thead>
        <tr style="background-color: #27272a; border-bottom: 1px solid #3f3f46;">
          <th style="padding: 10px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #a1a1aa; text-align: left;">Role & Company</th>
          <th style="padding: 10px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #a1a1aa; text-align: right;">Activity</th>
        </tr>
      </thead>
      <tbody>
        ${activitiesHtml}
      </tbody>
    </table>
  `

  const restContent = `
    <!-- Rest Day Hero -->
    <div style="background: linear-gradient(135deg, #1e1e24 0%, #2b2521 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #44372e; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 12px;">☕</div>
      <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #fed7aa; font-weight: 700;">
        ${restDayMessages[0]}
      </h2>
      <p style="margin: 0 auto; max-width: 480px; font-size: 14px; color: #e2d9d2; line-height: 1.6;">
        ${restDayMessages[1]}
      </p>
      <div style="margin-top: 16px; padding: 10px 14px; background-color: rgba(254, 215, 170, 0.08); border-radius: 8px; display: inline-block;">
        <span style="font-size: 12px; color: #fdba74; font-weight: 500;">
          💡 Pro-tip: Rest days are ideal for refining your portfolio, reading up on tech trends, or simply unplugging.
        </span>
      </div>
    </div>
  `

  const recipientsCount = data.recipientEmails ? data.recipientEmails.length : 1
  const accountabilityNote =
    recipientsCount > 1
      ? `
      <div style="background-color: #18181b; border: 1px solid #3f3f46; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; font-size: 13px; color: #a1a1aa; line-height: 1.5;">
        🤝 <strong style="color: #e4e4e7;">Accountability Circle:</strong> This daily update is shared with ${userName}'s cheer squad to celebrate progress and keep each other accountable.
      </div>
    `
      : ''

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5; line-height: 1.5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
    
    <!-- Top Branding -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; background-color: #18181b; border: 1px solid #27272a; border-radius: 9999px;">
        <span style="color: #f97316; font-size: 16px;">🎯</span>
        <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;">JOBHUNT DIGEST</span>
        <span style="font-size: 12px; color: #71717a;">•</span>
        <span style="font-size: 12px; color: #a1a1aa;">${data.dateFormatted}</span>
      </div>
    </div>

    <!-- Accountability Note -->
    ${accountabilityNote}

    <!-- Main Content (Active or Rest) -->
    ${isRestDay ? restContent : activeContent}

    <!-- Current Pipeline Snapshot -->
    <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #27272a; padding-bottom: 12px;">
        <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #f4f4f5;">
          📊 Current Pipeline Overview
        </h3>
        <span style="font-size: 12px; color: #a1a1aa;">In-flight snapshot</span>
      </div>

      <table style="width: 100%; border-collapse: collapse; text-align: center;">
        <tr>
          <td style="padding: 10px; background-color: #121215; border-radius: 8px; margin: 4px;">
            <div style="font-size: 20px; font-weight: 700; color: #94a3b8;">${data.pipelineSummary.wishlist}</div>
            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; margin-top: 2px;">Wishlist</div>
          </td>
          <td style="width: 8px;"></td>
          <td style="padding: 10px; background-color: #121215; border-radius: 8px; margin: 4px;">
            <div style="font-size: 20px; font-weight: 700; color: #60a5fa;">${data.pipelineSummary.applied}</div>
            <div style="font-size: 11px; text-transform: uppercase; color: #3b82f6; margin-top: 2px;">Applied</div>
          </td>
          <td style="width: 8px;"></td>
          <td style="padding: 10px; background-color: #121215; border-radius: 8px; margin: 4px;">
            <div style="font-size: 20px; font-weight: 700; color: #c084fc;">${data.pipelineSummary.interviewing}</div>
            <div style="font-size: 11px; text-transform: uppercase; color: #a855f7; margin-top: 2px;">Interviewing</div>
          </td>
          <td style="width: 8px;"></td>
          <td style="padding: 10px; background-color: #121215; border-radius: 8px; margin: 4px;">
            <div style="font-size: 20px; font-weight: 700; color: #34d399;">${data.pipelineSummary.offered}</div>
            <div style="font-size: 11px; text-transform: uppercase; color: #10b981; margin-top: 2px;">Offers</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 16px 0; border-top: 1px solid #27272a; margin-top: 32px;">
      <p style="margin: 0 0 6px 0; font-size: 12px; color: #71717a;">
        Tracking applications with precision • JobHunt Personal Tracker
      </p>
      <p style="margin: 0; font-size: 11px; color: #52525b;">
        Delivered directly to ${userName} and your accountability circle.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim()

  return {
    subject,
    html,
    isRestDay,
  }
}
