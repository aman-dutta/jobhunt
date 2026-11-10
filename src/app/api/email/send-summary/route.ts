import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTodaySummary } from '@/lib/email/digestService'

export async function POST(_request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await sendTodaySummary(supabase)

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      recipientCount: result.recipientCount,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
