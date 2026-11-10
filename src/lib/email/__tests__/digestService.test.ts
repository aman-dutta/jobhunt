import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { compileTodayDigest } from '../digestService'

describe('digestService', () => {
  let mockSupabase: SupabaseClient
  const mockUserId = 'test-user-id'

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: mockUserId,
              email: 'aman@gmail.com',
              user_metadata: { full_name: 'Aman Dutta' },
            },
          },
          error: null,
        }),
      },
      from: vi.fn(),
    } as unknown as SupabaseClient
  })

  it('compiles digest with active moves and recipients', async () => {
    const fromMock = mockSupabase.from as unknown as ReturnType<typeof vi.fn>

    fromMock.mockImplementation((tableName: string) => {
      if (tableName === 'user_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  notification_emails: 'friend1@gmail.com, friend2@gmail.com',
                  daily_summary_enabled: true,
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (tableName === 'application_activities') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'act-1',
                        user_id: mockUserId,
                        application_id: 'app-1',
                        company_name: 'Netflix',
                        job_title: 'Backend Engineer',
                        activity_type: 'created',
                        from_status: null,
                        to_status: 'applied',
                        created_at: new Date().toISOString(),
                        metadata: {},
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      }
      if (tableName === 'applications') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { status: 'applied' },
                { status: 'applied' },
                { status: 'interviewing' },
                { status: 'wishlist' },
              ],
              error: null,
            }),
          }),
        }
      }
      return {
        select: vi
          .fn()
          .mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      }
    })

    const result = await compileTodayDigest(mockSupabase)

    expect(result.recipients).toContain('aman@gmail.com')
    expect(result.recipients).toContain('friend1@gmail.com')
    expect(result.recipients).toContain('friend2@gmail.com')
    expect(result.email.isRestDay).toBe(false)
    expect(result.email.subject).toContain('Netflix')
  })
})
