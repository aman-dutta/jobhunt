import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'u-1',
            email: 'aman@gmail.com',
            user_metadata: { full_name: 'Aman' },
          },
        },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }),
  }),
}))

describe('POST /api/email/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates an active demo preview when requested', async () => {
    const request = new Request('http://localhost:3000/api/email/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'active_demo' }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.isRestDay).toBe(false)
    expect(json.html).toContain('Stripe')
    expect(json.subject).toContain('moves')
  })

  it('generates a rest demo preview when requested', async () => {
    const request = new Request('http://localhost:3000/api/email/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'rest_demo' }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.isRestDay).toBe(true)
    expect(json.html).toContain('Looks like a rest day')
  })
})
