import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ApplicationContact,
  ApplicationContactInsert,
  ApplicationContactUpdate,
} from '@/lib/types/database.types'

async function verifyAuth(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Unauthorized')
  }
  return user.id
}

export async function getContactsByApplication(
  supabase: SupabaseClient,
  applicationId: string
): Promise<ApplicationContact[]> {
  const userId = await verifyAuth(supabase)
  const { data, error } = await supabase
    .from('application_contacts')
    .select('*')
    .eq('application_id', applicationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching contacts:', error)
    return []
  }
  return data || []
}

export async function createContact(
  supabase: SupabaseClient,
  contact: ApplicationContactInsert
): Promise<ApplicationContact> {
  const userId = await verifyAuth(supabase)
  const { data, error } = await supabase
    .from('application_contacts')
    .insert({ ...contact, user_id: userId })
    .select()
    .single()

  if (error) {
    console.error('Error creating contact:', error)
    throw new Error(`Failed to create contact: ${error.message}`)
  }
  return data
}

export async function updateContact(
  supabase: SupabaseClient,
  id: string,
  updates: ApplicationContactUpdate
): Promise<ApplicationContact> {
  const userId = await verifyAuth(supabase)
  const { data, error } = await supabase
    .from('application_contacts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating contact:', error)
    throw new Error(`Failed to update contact: ${error.message}`)
  }
  return data
}

export async function deleteContact(supabase: SupabaseClient, id: string): Promise<void> {
  const userId = await verifyAuth(supabase)
  const { error } = await supabase
    .from('application_contacts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting contact:', error)
    throw new Error(`Failed to delete contact: ${error.message}`)
  }
}

export async function getDueFollowUps(
  supabase: SupabaseClient
): Promise<
  Array<ApplicationContact & { applications: { company_name: string; job_title: string } }>
> {
  const userId = await verifyAuth(supabase)
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('application_contacts')
    .select(
      `
      *,
      applications (
        company_name,
        job_title
      )
    `
    )
    .eq('user_id', userId)
    .not('follow_up_date', 'is', null)
    .lte('follow_up_date', today)
    .order('follow_up_date', { ascending: true })

  if (error) {
    console.error('Error fetching due follow ups:', error)
    return []
  }
  return (
    (data as unknown as Array<
      ApplicationContact & { applications: { company_name: string; job_title: string } }
    >) || []
  )
}
