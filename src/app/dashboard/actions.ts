'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { applicationFormSchema } from '@/lib/schemas/application.schema'
import type { ApplicationFormData, ApplicationStatus } from '@/lib/schemas/application.schema'
import type { Application, ApplicationInsert, ApplicationUpdate } from '@/lib/types/database.types'
import {
  createApplication,
  updateApplication,
  deleteApplication,
  getApplications,
  reorderApplicationsInColumn,
  updateApplicationPosition,
} from '@/lib/api/applications'
import {
  getContactsByApplication,
  createContact,
  updateContact,
  deleteContact,
  getDueFollowUps,
} from '@/lib/api/contacts'
import { getUserSettings, saveUserSettings } from '@/lib/api/settings'
import type {
  ApplicationContact,
  ApplicationContactInsert,
  ApplicationContactUpdate,
  UserSettings,
} from '@/lib/types/database.types'

/**
 * Get all applications for the authenticated user
 */
export async function getApplicationsAction(): Promise<Application[]> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Authentication error in getApplicationsAction:', authError)
      }
      throw new Error(`Authentication failed: ${authError.message}`)
    }

    if (!user) {
      throw new Error('Unauthorized: No user session found. Please log in again.')
    }

    const applications = await getApplications(supabase)
    return applications
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to fetch applications in action:', error)
    }

    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Failed to fetch applications: ${error.message}`)
    }

    throw new Error('Failed to fetch applications: Unknown error occurred')
  }
}

/**
 * Create a new application
 */
export async function createApplicationAction(formData: ApplicationFormData): Promise<Application> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Validate form data
  const validatedData = applicationFormSchema.parse(formData)

  // Get the max position for the target status to place new card at the end
  const { data: existingApps } = await supabase
    .from('applications')
    .select('position')
    .eq('status', validatedData.status)
    .eq('user_id', user.id)
    .order('position', { ascending: false })
    .limit(1)

  const maxPosition = existingApps?.[0]?.position || 0
  const newPosition = maxPosition + 1

  const applicationData: ApplicationInsert = {
    company_name: validatedData.company_name,
    job_title: validatedData.job_title,
    job_url: validatedData.job_url || null,
    location: validatedData.location || null,
    salary_range: validatedData.salary_range || null,
    status: validatedData.status,
    date_applied: validatedData.date_applied,
    notes: validatedData.notes || null,
    job_description: validatedData.job_description || null,
    cover_letter: validatedData.cover_letter || null,
    position: newPosition,
  }

  try {
    const newApplication = await createApplication(supabase, applicationData)
    revalidatePath('/dashboard')
    return newApplication
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to create application:', error)
    }
    throw new Error('Failed to create application')
  }
}

/**
 * Update an existing application
 */
export async function updateApplicationAction(
  id: string,
  formData: ApplicationFormData
): Promise<Application> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Validate form data
  const validatedData = applicationFormSchema.parse(formData)

  const updates: ApplicationUpdate = {
    company_name: validatedData.company_name,
    job_title: validatedData.job_title,
    job_url: validatedData.job_url || null,
    location: validatedData.location || null,
    salary_range: validatedData.salary_range || null,
    status: validatedData.status,
    date_applied: validatedData.date_applied,
    notes: validatedData.notes || null,
    job_description: validatedData.job_description || null,
    cover_letter: validatedData.cover_letter || null,
    updated_at: new Date().toISOString(),
  }

  try {
    const updatedApplication = await updateApplication(supabase, id, updates)
    revalidatePath('/dashboard')
    return updatedApplication
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to update application:', error)
    }
    throw new Error('Failed to update application')
  }
}

/**
 * Delete an application
 */
export async function deleteApplicationAction(id: string): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  try {
    await deleteApplication(supabase, id)
    revalidatePath('/dashboard')
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to delete application:', error)
    }
    throw new Error('Failed to delete application')
  }
}

/**
 * Update application status (for drag-and-drop)
 */
export async function updateApplicationStatusAction(
  id: string,
  status: ApplicationStatus
): Promise<Application> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const updates: ApplicationUpdate = {
    status,
    updated_at: new Date().toISOString(),
  }

  try {
    const updatedApplication = await updateApplication(supabase, id, updates)
    revalidatePath('/dashboard')
    return updatedApplication
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to update application status:', error)
    }
    throw new Error('Failed to update application status')
  }
}

/**
 * Reorder applications within a column
 * Updates positions for multiple applications in bulk
 */
export async function reorderApplicationsAction(
  updates: Array<{ id: string; position: number }>
): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  try {
    await reorderApplicationsInColumn(supabase, updates)
    revalidatePath('/dashboard')
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to reorder applications:', error)
    }
    throw new Error('Failed to reorder applications')
  }
}

/**
 * Update application position and optionally status (for drag-and-drop)
 * Used for both same-column reordering and cross-column moves
 */
export async function updateApplicationPositionAction(
  id: string,
  position: number,
  status?: ApplicationStatus
): Promise<Application> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  try {
    const updatedApplication = await updateApplicationPosition(supabase, id, position, status)
    revalidatePath('/dashboard')
    return updatedApplication
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to update application position:', error)
    }
    throw new Error('Failed to update application position')
  }
}

/**
 * Get contacts for an application
 */
export async function getContactsAction(applicationId: string): Promise<ApplicationContact[]> {
  const supabase = await createClient()
  return getContactsByApplication(supabase, applicationId)
}

/**
 * Create a new contact outreach entry
 */
export async function createContactAction(
  contactData: ApplicationContactInsert
): Promise<ApplicationContact> {
  const supabase = await createClient()
  const contact = await createContact(supabase, contactData)
  revalidatePath('/dashboard')
  return contact
}

/**
 * Update a contact outreach entry
 */
export async function updateContactAction(
  id: string,
  updates: ApplicationContactUpdate
): Promise<ApplicationContact> {
  const supabase = await createClient()
  const contact = await updateContact(supabase, id, updates)
  revalidatePath('/dashboard')
  return contact
}

/**
 * Delete a contact
 */
export async function deleteContactAction(id: string): Promise<void> {
  const supabase = await createClient()
  await deleteContact(supabase, id)
  revalidatePath('/dashboard')
}

/**
 * Get due follow-up reminders
 */
export async function getDueFollowUpsAction() {
  const supabase = await createClient()
  return getDueFollowUps(supabase)
}

/**
 * Get user settings (master resume and AI key)
 */
export async function getUserSettingsAction(): Promise<UserSettings | null> {
  const supabase = await createClient()
  return getUserSettings(supabase)
}

/**
 * Save user settings
 */
export async function saveUserSettingsAction(settings: {
  master_resume?: string | null
  gemini_api_key?: string | null
}): Promise<UserSettings> {
  const supabase = await createClient()
  const saved = await saveUserSettings(supabase, settings)
  revalidatePath('/dashboard')
  revalidatePath('/profile')
  return saved
}
