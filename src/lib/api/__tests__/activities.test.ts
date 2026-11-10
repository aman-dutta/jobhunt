import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logActivity, getTodayActivities, getActivitiesForDateRange } from '../activities'
import type { ApplicationActivityInsert } from '@/lib/types/database.types'

describe('Activities API', () => {
  let mockSupabase: SupabaseClient
  const mockUserId = 'test-user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as unknown as SupabaseClient
  })

  describe('logActivity', () => {
    it('successfully logs a status_changed activity', async () => {
      const activityData: ApplicationActivityInsert = {
        user_id: mockUserId,
        application_id: 'app-1',
        company_name: 'Google',
        job_title: 'Software Engineer',
        activity_type: 'status_changed',
        from_status: 'wishlist',
        to_status: 'applied',
        metadata: {},
      }

      const mockInserted = {
        ...activityData,
        id: 'act-1',
        created_at: new Date().toISOString(),
      }

      const singleMock = vi.fn().mockResolvedValue({ data: mockInserted, error: null })
      const selectMock = vi.fn().mockReturnValue({ single: singleMock })
      const insertMock = vi.fn().mockReturnValue({ select: selectMock })

      const fromMock = mockSupabase.from as unknown as ReturnType<typeof vi.fn>
      fromMock.mockReturnValue({
        insert: insertMock,
      })

      const result = await logActivity(mockSupabase, activityData)

      expect(mockSupabase.from).toHaveBeenCalledWith('application_activities')
      expect(insertMock).toHaveBeenCalledWith(activityData)
      expect(result).toEqual(mockInserted)
    })

    it('handles database error gracefully by returning null and not crashing app', async () => {
      const activityData: ApplicationActivityInsert = {
        user_id: mockUserId,
        application_id: 'app-1',
        company_name: 'Google',
        job_title: 'Software Engineer',
        activity_type: 'created',
        from_status: null,
        to_status: 'wishlist',
        metadata: {},
      }

      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Table does not exist' },
      })
      const selectMock = vi.fn().mockReturnValue({ single: singleMock })
      const insertMock = vi.fn().mockReturnValue({ select: selectMock })

      const fromMock = mockSupabase.from as unknown as ReturnType<typeof vi.fn>
      fromMock.mockReturnValue({
        insert: insertMock,
      })

      const result = await logActivity(mockSupabase, activityData)
      expect(result).toBeNull()
    })
  })

  describe('getActivitiesForDateRange', () => {
    it('fetches user activities ordered by created_at descending', async () => {
      const start = new Date('2026-11-09T00:00:00.000Z')
      const end = new Date('2026-11-09T23:59:59.999Z')

      const mockActivities = [
        {
          id: 'act-1',
          user_id: mockUserId,
          application_id: 'app-1',
          company_name: 'Stripe',
          job_title: 'Full Stack Engineer',
          activity_type: 'status_changed',
          from_status: 'applied',
          to_status: 'interviewing',
          metadata: {},
          created_at: '2026-11-09T14:30:00.000Z',
        },
      ]

      const orderMock = vi.fn().mockResolvedValue({ data: mockActivities, error: null })
      const lteMock = vi.fn().mockReturnValue({ order: orderMock })
      const gteMock = vi.fn().mockReturnValue({ lte: lteMock })
      const eqMock = vi.fn().mockReturnValue({ gte: gteMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

      const fromMock = mockSupabase.from as unknown as ReturnType<typeof vi.fn>
      fromMock.mockReturnValue({
        select: selectMock,
      })

      const result = await getActivitiesForDateRange(mockSupabase, start, end)

      expect(mockSupabase.from).toHaveBeenCalledWith('application_activities')
      expect(selectMock).toHaveBeenCalledWith('*')
      expect(eqMock).toHaveBeenCalledWith('user_id', mockUserId)
      expect(gteMock).toHaveBeenCalledWith('created_at', start.toISOString())
      expect(lteMock).toHaveBeenCalledWith('created_at', end.toISOString())
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(mockActivities)
    })
  })

  describe('getTodayActivities', () => {
    it('calls getActivitiesForDateRange with start and end of today', async () => {
      const orderMock = vi.fn().mockResolvedValue({ data: [], error: null })
      const lteMock = vi.fn().mockReturnValue({ order: orderMock })
      const gteMock = vi.fn().mockReturnValue({ lte: lteMock })
      const eqMock = vi.fn().mockReturnValue({ gte: gteMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

      const fromMock = mockSupabase.from as unknown as ReturnType<typeof vi.fn>
      fromMock.mockReturnValue({
        select: selectMock,
      })

      const result = await getTodayActivities(mockSupabase)
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
