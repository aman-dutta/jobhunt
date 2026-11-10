'use client'

import * as React from 'react'
import {
  Users,
  Plus,
  Linkedin,
  Mail,
  Calendar,
  Trash2,
  Edit2,
  RefreshCw,
  BellRing,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Application, ApplicationContact, OutreachStatus } from '@/lib/types/database.types'
import {
  getContactsAction,
  createContactAction,
  updateContactAction,
  deleteContactAction,
} from '@/app/dashboard/actions'

interface ContactsTabProps {
  application: Application
  className?: string
}

const STATUS_LABELS: Record<OutreachStatus, { label: string; color: string; bg: string }> = {
  to_contact: {
    label: 'To Contact',
    color: 'text-zinc-400',
    bg: 'bg-zinc-500/10 border-zinc-500/30',
  },
  contacted: {
    label: 'Reached Out',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
  },
  followed_up: {
    label: 'Followed Up',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  replied: {
    label: 'In Discussion',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
  referred: {
    label: 'Referral Submitted',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  no_response: {
    label: 'No Response',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/30',
  },
}

export function ContactsTab({ application, className }: ContactsTabProps) {
  const [contacts, setContacts] = React.useState<ApplicationContact[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingContact, setEditingContact] = React.useState<ApplicationContact | null>(null)

  // Form fields
  const [name, setName] = React.useState('')
  const [role, setRole] = React.useState('Technical Recruiter')
  const [linkedinUrl, setLinkedinUrl] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [status, setStatus] = React.useState<OutreachStatus>('contacted')
  const [lastContactDate, setLastContactDate] = React.useState(
    new Date().toISOString().split('T')[0]
  )
  const [followUpDate, setFollowUpDate] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const loadContacts = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getContactsAction(application.id)
      setContacts(data)
    } catch (err) {
      console.error('Failed to load contacts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [application.id])

  React.useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const openNewContactModal = () => {
    setEditingContact(null)
    setName('')
    setRole('Technical Recruiter')
    setLinkedinUrl('')
    setEmail('')
    setStatus('contacted')
    setLastContactDate(new Date().toISOString().split('T')[0])
    // Default circle back: +4 days
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 4)
    setFollowUpDate(nextDate.toISOString().split('T')[0])
    setNotes('')
    setIsModalOpen(true)
  }

  const openEditContactModal = (contact: ApplicationContact) => {
    setEditingContact(contact)
    setName(contact.name)
    setRole(contact.role || 'Technical Recruiter')
    setLinkedinUrl(contact.linkedin_url || '')
    setEmail(contact.email || '')
    setStatus(contact.outreach_status)
    setLastContactDate(contact.last_contact_date || new Date().toISOString().split('T')[0])
    setFollowUpDate(contact.follow_up_date || '')
    setNotes(contact.notes || '')
    setIsModalOpen(true)
  }

  const handleSetQuickReminder = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setFollowUpDate(d.toISOString().split('T')[0])
  }

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      if (editingContact) {
        const updated = await updateContactAction(editingContact.id, {
          name: name.trim(),
          role: role.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          email: email.trim() || null,
          outreach_status: status,
          last_contact_date: lastContactDate || null,
          follow_up_date: followUpDate || null,
          notes: notes.trim() || null,
        })
        setContacts(prev => prev.map(c => (c.id === updated.id ? updated : c)))
      } else {
        const newContact = await createContactAction({
          application_id: application.id,
          name: name.trim(),
          role: role.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          email: email.trim() || null,
          outreach_status: status,
          last_contact_date: lastContactDate || null,
          follow_up_date: followUpDate || null,
          notes: notes.trim() || null,
        })
        setContacts(prev => [newContact, ...prev])
      }
      setIsModalOpen(false)
    } catch (err) {
      console.error('Failed to save contact:', err)
      alert('Failed to save contact. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to remove this contact?')) return
    try {
      await deleteContactAction(id)
      setContacts(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('Failed to delete contact:', err)
    }
  }

  const handleQuickCircleBack = async (contact: ApplicationContact) => {
    const today = new Date().toISOString().split('T')[0]
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 4)
    const nextDateStr = nextDate.toISOString().split('T')[0]

    const newNote = contact.notes
      ? `${contact.notes}\n• Circled back on ${today}`
      : `• Circled back on ${today}`

    try {
      const updated = await updateContactAction(contact.id, {
        outreach_status: 'followed_up',
        last_contact_date: today,
        follow_up_date: nextDateStr,
        notes: newNote,
      })
      setContacts(prev => prev.map(c => (c.id === updated.id ? updated : c)))
    } catch (err) {
      console.error('Failed to update follow-up:', err)
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 glass-ultra rounded-glass-sm border border-[var(--glass-border-subtle)]">
        <div>
          <h3 className="text-lg font-semibold text-label-primary flex items-center gap-2">
            <Users className="w-5 h-5 text-copper" />
            Outreach & Referrals at {application.company_name}
          </h3>
          <p className="text-xs text-label-secondary mt-0.5">
            Track HRs, recruiters, and employees you reached out to for referrals, plus circle-back
            reminders.
          </p>
        </div>

        <Button
          onClick={openNewContactModal}
          size="sm"
          className="btn-glass text-xs font-semibold gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </Button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="p-8 text-center text-label-secondary text-sm glass-ultra rounded-glass-sm">
          Loading contacts...
        </div>
      ) : contacts.length === 0 ? (
        /* Empty State */
        <div className="p-10 glass-ultra rounded-glass-sm text-center space-y-3">
          <div className="w-12 h-12 rounded-full glass-light border border-copper/30 flex items-center justify-center mx-auto text-copper">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold text-label-primary">No contacts added yet</h4>
          <p className="text-xs text-label-secondary max-w-md mx-auto">
            Reached out to a recruiter on LinkedIn or asked someone for a referral? Add them here so
            you remember to circle back after a few days!
          </p>
          <Button
            onClick={openNewContactModal}
            size="sm"
            variant="outline"
            className="border-copper/40 text-copper gap-1.5 mt-2"
          >
            <Plus className="w-4 h-4" />
            Add First Contact
          </Button>
        </div>
      ) : (
        /* Contacts List */
        <div className="space-y-4">
          {contacts.map(contact => {
            const isDue = contact.follow_up_date && contact.follow_up_date <= todayStr
            const statusConfig = STATUS_LABELS[contact.outreach_status] || STATUS_LABELS.contacted

            return (
              <div
                key={contact.id}
                className={cn(
                  'p-5 rounded-glass-sm glass-light border transition-all duration-200 space-y-3',
                  isDue
                    ? 'border-amber-500/50 bg-amber-500/[0.04] shadow-sm'
                    : 'border-[var(--glass-border-subtle)]'
                )}
              >
                {/* Top Row: Name, Role, Badges, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-semibold text-label-primary text-base">
                        {contact.name}
                      </span>
                      {contact.role && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full glass-ultra text-label-secondary border border-[var(--glass-border-subtle)]">
                          {contact.role}
                        </span>
                      )}
                      <span
                        className={cn(
                          'text-xs px-2.5 py-0.5 rounded-full border font-medium',
                          statusConfig.bg,
                          statusConfig.color
                        )}
                      >
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Links row */}
                    <div className="flex items-center gap-3 text-xs text-label-tertiary">
                      {contact.linkedin_url && (
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:underline"
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                          LinkedIn Profile
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1 text-label-secondary hover:text-label-primary"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {contact.email}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <Button
                      onClick={() => handleQuickCircleBack(contact)}
                      size="sm"
                      variant="outline"
                      title="Mark as followed up today and set next reminder to +4 days"
                      className="text-xs border-copper/30 text-copper hover:bg-copper/10 gap-1.5 h-8 px-2.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Circle Back Again
                    </Button>
                    <Button
                      onClick={() => openEditContactModal(contact)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-label-tertiary hover:text-label-primary"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteContact(contact.id)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-label-tertiary hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Follow-up reminder alert */}
                <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2">
                  <div className="flex items-center gap-4 text-label-tertiary">
                    {contact.last_contact_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Last Contact:{' '}
                        <strong className="text-label-secondary font-medium">
                          {contact.last_contact_date}
                        </strong>
                      </span>
                    )}
                    {contact.follow_up_date && (
                      <span
                        className={cn(
                          'flex items-center gap-1 font-medium',
                          isDue ? 'text-amber-400 font-semibold' : 'text-label-secondary'
                        )}
                      >
                        <BellRing
                          className={cn('w-3.5 h-3.5', isDue && 'animate-pulse text-amber-400')}
                        />
                        {isDue
                          ? '⚠️ Due to follow up today!'
                          : `Next Reminder: ${contact.follow_up_date}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {contact.notes && (
                  <div className="p-3 rounded-glass-sm glass-ultra text-xs text-label-primary whitespace-pre-wrap border border-[var(--glass-border-subtle)] font-mono leading-relaxed">
                    {contact.notes}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent variant="glass" className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Edit Contact & Follow-up' : 'Add Outreach Contact'}
            </DialogTitle>
            <DialogDescription>
              Record recruiter or referral outreach at {application.company_name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveContact} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-label-primary block mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Sarah Jenkins or Rahul Sharma"
                required
                className="glass-ultra text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-label-primary block mb-1">
                  Role / Relationship
                </label>
                <Input
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="e.g. HR / Referral / Tech Lead"
                  className="glass-ultra text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-label-primary block mb-1">
                  Status
                </label>
                <Select value={status} onValueChange={(val: OutreachStatus) => setStatus(val)}>
                  <SelectTrigger variant="glass" className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent variant="glass">
                    <SelectItem value="to_contact">To Contact</SelectItem>
                    <SelectItem value="contacted">Reached Out</SelectItem>
                    <SelectItem value="followed_up">Followed Up</SelectItem>
                    <SelectItem value="replied">In Discussion</SelectItem>
                    <SelectItem value="referred">Referral Submitted</SelectItem>
                    <SelectItem value="no_response">No Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-label-primary block mb-1">
                  LinkedIn URL
                </label>
                <Input
                  value={linkedinUrl}
                  onChange={e => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="glass-ultra text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-label-primary block mb-1">
                  Email (Optional)
                </label>
                <Input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  placeholder="name@company.com"
                  className="glass-ultra text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-label-primary block mb-1">
                  Last Contact Date
                </label>
                <Input
                  type="date"
                  value={lastContactDate}
                  onChange={e => setLastContactDate(e.target.value)}
                  className="glass-ultra text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-label-primary block mb-1 flex items-center justify-between">
                  <span>Circle Back Date</span>
                </label>
                <Input
                  type="date"
                  value={followUpDate}
                  onChange={e => setFollowUpDate(e.target.value)}
                  className="glass-ultra text-xs"
                />
              </div>
            </div>

            {/* Quick reminder presets */}
            <div className="flex items-center gap-1.5 text-xs text-label-tertiary">
              <span>Remind in:</span>
              <button
                type="button"
                onClick={() => handleSetQuickReminder(3)}
                className="px-2 py-0.5 rounded-glass-sm glass-ultra hover:glass-light text-copper border border-copper/30"
              >
                +3 Days
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickReminder(5)}
                className="px-2 py-0.5 rounded-glass-sm glass-ultra hover:glass-light text-copper border border-copper/30"
              >
                +5 Days
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickReminder(7)}
                className="px-2 py-0.5 rounded-glass-sm glass-ultra hover:glass-light text-copper border border-copper/30"
              >
                +7 Days
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-label-primary block mb-1">
                Outreach Notes / Message Sent
              </label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Sent connection note on LinkedIn asking for referral; replied saying they will check..."
                className="min-h-[80px] glass-ultra text-xs leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="btn-glass" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingContact ? 'Save Changes' : 'Add Contact'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
