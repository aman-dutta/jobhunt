import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import * as digestService from '@/lib/email/digestService'

vi.mock('@/lib/email/digestService', () => ({
  compileTodayDigest: vi.fn(),
  sendTodaySummary: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'u-1', email: 'aman@gmail.com' } },
        error: null,
      }),
    },
  }),
}))

describe('POST /api/email/send-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('successfully sends email and returns success result', async () => {
    vi.mocked(digestService.sendTodaySummary).mockResolvedValue({
      success: true,
      messageId: 'msg_abc123',
      recipientCount: 3,
      provider: 'gmail_smtp',
    })

    const request = new Request('http://localhost:3000/api/email/send-summary', {
      method: 'POST',
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.recipientCount).toBe(3)
  })

  it('handles errors gracefully', async () => {
    vi.mocked(digestService.sendTodaySummary).mockRejectedValue(
      new Error('RESEND_API_KEY is not configured')
    )

    const request = new Request('http://localhost:3000/api/email/send-summary', {
      method: 'POST',
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toContain('RESEND_API_KEY is not configured')
  })
})
