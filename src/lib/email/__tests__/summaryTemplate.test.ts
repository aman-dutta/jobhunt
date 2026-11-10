import { describe, it, expect } from 'vitest'
import { generateDailySummaryEmail } from '../summaryTemplate'
import type { SummaryData } from '../summaryTemplate'

describe('generateDailySummaryEmail', () => {
  const baseData: SummaryData = {
    userName: 'Aman',
    dateFormatted: 'Monday, Nov 9, 2026',
    activities: [],
    pipelineSummary: {
      wishlist: 4,
      applied: 6,
      interviewing: 2,
      offered: 1,
      rejected: 3,
    },
    recipientEmails: ['aman@gmail.com', 'friend1@gmail.com', 'friend2@gmail.com'],
  }

  describe('Active Day Mode (when activities exist)', () => {
    const activeData: SummaryData = {
      ...baseData,
      activities: [
        {
          id: '1',
          user_id: 'u1',
          application_id: 'app-1',
          company_name: 'Stripe',
          job_title: 'Full Stack Engineer',
          activity_type: 'created',
          from_status: null,
          to_status: 'applied',
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: 'u1',
          application_id: 'app-2',
          company_name: 'Google',
          job_title: 'Senior Frontend Engineer',
          activity_type: 'status_changed',
          from_status: 'wishlist',
          to_status: 'interviewing',
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ],
    }

    it('generates an active day subject mentioning activity count', () => {
      const email = generateDailySummaryEmail(activeData)
      expect(email.subject).toContain('Aman')
      expect(email.subject).toContain('2 moves')
      expect(email.isRestDay).toBe(false)
    })

    it('includes company names and status transitions in html', () => {
      const email = generateDailySummaryEmail(activeData)
      expect(email.html).toContain('Stripe')
      expect(email.html).toContain('Google')
      expect(email.html).toContain('Wishlist')
      expect(email.html).toContain('Interviewing')
    })

    it('includes pipeline snapshot', () => {
      const email = generateDailySummaryEmail(activeData)
      expect(email.html).toContain('Interviewing')
      expect(email.html).toContain('2')
    })
  })

  describe('Rest Day Mode (when no activities exist)', () => {
    it('generates a creative rest day subject line', () => {
      const email = generateDailySummaryEmail(baseData)
      expect(email.subject.toLowerCase()).toContain('rest day')
      expect(email.isRestDay).toBe(true)
    })

    it('includes witty, motivating rest day copy in the html', () => {
      const email = generateDailySummaryEmail(baseData)
      expect(email.html).toContain('Looks like a rest day')
      expect(email.html).toContain('Aman')
    })

    it('displays the current pipeline snapshot and accountability note', () => {
      const email = generateDailySummaryEmail(baseData)
      expect(email.html).toContain('Current Pipeline')
      expect(email.html).toContain('accountability')
    })
  })
})
