'use client'

import * as React from 'react'
import {
  ArrowLeft,
  Mail,
  Calendar,
  FileText,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Key,
  Shield,
  User,
  Eye,
  Users,
  Clock,
} from 'lucide-react'
import { NavBar } from '@/components/layout/NavBar'
import { AnimatedBackground } from '@/components/layout/AnimatedBackground'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { EmailPreviewModal } from '@/components/email/EmailPreviewModal'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getUserInitials } from '@/components/auth/utils/profile-utils'
import { useAvatarColor, getAvatarColorStyle } from '@/hooks/useAvatarColor'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = React.useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const { avatarColor } = useAvatarColor(user)

  // Settings state
  const [masterResume, setMasterResume] = React.useState('')
  const [geminiApiKey, setGeminiApiKey] = React.useState('')
  const [notificationEmails, setNotificationEmails] = React.useState('')
  const [dailySummaryEnabled, setDailySummaryEnabled] = React.useState(true)
  const [dailySummaryTime, setDailySummaryTime] = React.useState('21:00')
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveSuccess, setSaveSuccess] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  // Load user session and settings on mount
  React.useEffect(() => {
    async function loadUserAndSettings() {
      try {
        const supabase = createClient()
        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) throw authError
        if (!currentUser) {
          router.push('/')
          return
        }

        setUser(currentUser)

        // Load settings from Supabase client or localStorage fallback
        try {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', currentUser.id)
            .single()

          if (settings) {
            if (settings.master_resume) setMasterResume(settings.master_resume)
            if (settings.gemini_api_key) setGeminiApiKey(settings.gemini_api_key)
            if (settings.notification_emails) {
              setNotificationEmails(settings.notification_emails)
            } else if (currentUser.email) {
              setNotificationEmails(currentUser.email)
            }
            if (settings.daily_summary_enabled !== undefined)
              setDailySummaryEnabled(settings.daily_summary_enabled)
            if (settings.daily_summary_time) setDailySummaryTime(settings.daily_summary_time)
          } else {
            const localResume = localStorage.getItem('jh_master_resume')
            const localKey = localStorage.getItem('jh_gemini_key')
            const localEmails = localStorage.getItem('jh_notification_emails')
            if (localResume) setMasterResume(localResume)
            if (localKey) setGeminiApiKey(localKey)
            if (localEmails) {
              setNotificationEmails(localEmails)
            } else if (currentUser.email) {
              setNotificationEmails(currentUser.email)
            }
          }
        } catch {
          const localResume = localStorage.getItem('jh_master_resume')
          const localKey = localStorage.getItem('jh_gemini_key')
          const localEmails = localStorage.getItem('jh_notification_emails')
          if (localResume) setMasterResume(localResume)
          if (localKey) setGeminiApiKey(localKey)
          if (localEmails) {
            setNotificationEmails(localEmails)
          } else if (currentUser.email) {
            setNotificationEmails(currentUser.email)
          }
        }
      } catch (err) {
        console.error('Error loading user:', err)
        setError('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    loadUserAndSettings()
  }, [router])

  const handleSaveSettings = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    try {
      localStorage.setItem('jh_master_resume', masterResume)
      if (geminiApiKey) localStorage.setItem('jh_gemini_key', geminiApiKey)
      localStorage.setItem('jh_notification_emails', notificationEmails)

      if (user) {
        const supabase = createClient()
        await supabase.from('user_settings').upsert({
          user_id: user.id,
          master_resume: masterResume,
          gemini_api_key: geminiApiKey,
          notification_emails: notificationEmails,
          daily_summary_enabled: dailySummaryEnabled,
          daily_summary_time: dailySummaryTime,
          updated_at: new Date().toISOString(),
        })
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <AnimatedBackground variant="minimal">
        <div className="min-h-screen">
          <NavBar variant="authenticated" user={user} />
          <main className="mx-auto w-full px-4 py-4">
            <div className="flex items-center justify-center p-8 glass-ultra rounded-glass shadow-glass-subtle">
              <p className="text-label-secondary">Loading profile...</p>
            </div>
          </main>
        </div>
      </AnimatedBackground>
    )
  }

  if (error || !user) {
    return (
      <AnimatedBackground variant="minimal">
        <div className="min-h-screen">
          <NavBar variant="authenticated" user={user} />
          <main className="mx-auto w-full px-4 py-4">
            <div className="flex items-center justify-center p-8 glass-light rounded-glass shadow-glass-soft">
              <div className="text-center">
                <h2 className="text-lg font-medium text-red-600 mb-2">Error</h2>
                <p className="text-label-secondary mb-4">{error || 'User not found'}</p>
                <Button onClick={() => router.push('/dashboard')} variant="outline">
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </main>
        </div>
      </AnimatedBackground>
    )
  }

  return (
    <AnimatedBackground variant="minimal">
      <div className="min-h-screen">
        <NavBar variant="authenticated" user={user} />

        <main className="mx-auto w-full px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="ghost"
                  size="sm"
                  className="glass-interactive"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
                <h1 className="text-2xl font-bold text-label-primary">My Profile</h1>
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="btn-glass flex items-center gap-2 font-medium"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            {saveSuccess && (
              <div className="flex items-center gap-2 p-4 rounded-glass glass-light bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span>Your Master Resume & AI preferences have been saved successfully!</span>
              </div>
            )}

            {saveError && (
              <div className="flex items-center gap-2 p-4 rounded-glass glass-light bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Profile Card */}
            <Card className="glass-heavy border border-[var(--glass-border-subtle)]">
              <div className="p-6">
                <div className="flex items-center gap-6 mb-6">
                  {/* Avatar */}
                  <div
                    className="avatar-glass w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold flex-shrink-0"
                    style={getAvatarColorStyle(avatarColor)}
                  >
                    <span className="avatar-text">{getUserInitials(user)}</span>
                  </div>

                  {/* Basic Info */}
                  <div>
                    <h2 className="text-xl font-semibold text-label-primary mb-1">
                      {user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'}
                    </h2>
                    <p className="text-label-secondary text-sm">{user.email}</p>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-3 p-3 glass-light rounded-glass">
                    <Mail className="h-4 w-4 text-[var(--tint-blue)]" />
                    <div>
                      <p className="text-xs text-label-secondary">Email</p>
                      <p className="font-medium text-label-primary">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 glass-light rounded-glass">
                    <Calendar className="h-4 w-4 text-[var(--tint-blue)]" />
                    <div>
                      <p className="text-xs text-label-secondary">Member Since</p>
                      <p className="font-medium text-label-primary">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 glass-light rounded-glass">
                    <Shield className="h-4 w-4 text-[var(--tint-blue)]" />
                    <div>
                      <p className="text-xs text-label-secondary">Authentication</p>
                      <p className="font-medium text-label-primary">
                        {user.email_confirmed_at ? 'Verified' : 'Unverified'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 glass-light rounded-glass">
                    <User className="h-4 w-4 text-[var(--tint-blue)]" />
                    <div>
                      <p className="text-xs text-label-secondary">User ID</p>
                      <p className="font-medium text-label-primary text-xs">
                        {user.id.slice(0, 8)}...{user.id.slice(-4)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Master Resume Card */}
            <Card className="glass-heavy border border-[var(--glass-border-subtle)]">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-glass-sm bg-copper/10 text-copper border border-copper/30">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-label-primary">
                        Master Resume / Career Highlights
                      </h2>
                      <p className="text-xs text-label-secondary">
                        Paste your standard resume or key career background here. The AI will use
                        this to write tailored cover letters for every job application!
                      </p>
                    </div>
                  </div>
                </div>

                <Textarea
                  value={masterResume}
                  onChange={e => setMasterResume(e.target.value)}
                  placeholder="Paste your standard resume or career summary here...
Example:
- Senior Software Engineer with 5+ years building full-stack web applications.
- Core skills: TypeScript, React, Next.js, Node.js, Python, PostgreSQL, Docker, AWS.
- Key Achievements: Designed scalable microservices handling 2M requests/day; reduced load time by 35%.
- Education: Bachelor of Technology in Computer Science."
                  className="min-h-[200px] font-mono text-xs glass-ultra border-[var(--glass-border-medium)] focus:ring-copper/40"
                />
              </div>
            </Card>

            {/* AI Settings Card */}
            <Card className="glass-heavy border border-[var(--glass-border-subtle)]">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-glass-sm bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-label-primary">
                      Google Gemini AI Configuration
                    </h2>
                    <p className="text-xs text-label-secondary">
                      Powers automatic cover letter drafting when creating applications or in
                      application details.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-label-secondary flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-copper" />
                    Gemini API Key
                  </label>
                  <Input
                    type="password"
                    value={geminiApiKey}
                    onChange={e => setGeminiApiKey(e.target.value)}
                    placeholder="AQ.Ab8... or AIzaSy..."
                    className="glass-ultra border-[var(--glass-border-medium)] focus:ring-copper/40"
                  />
                  <p className="text-xs text-label-tertiary">
                    Get or create your free key at{' '}
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-copper hover:underline font-medium"
                    >
                      Google AI Studio
                    </a>
                    .
                  </p>
                </div>
              </div>
            </Card>

            {/* Daily Email Summary & Accountability Circle Card */}
            <Card className="glass-heavy border border-[var(--glass-border-subtle)]">
              <div className="p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-glass-sm bg-orange-500/10 text-orange-400 border border-orange-500/30">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-label-primary">
                        Daily Email Summary & Accountability Circle
                      </h2>
                      <p className="text-xs text-label-secondary">
                        Sends a polished daily digest of your applications, status moves, and rest
                        days to your Gmail and friends.
                      </p>
                    </div>
                  </div>

                  {/* Preview Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPreviewOpen(true)}
                    className="btn-glass text-xs h-9 px-4 flex items-center gap-2 self-start sm:self-auto border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
                  >
                    <Eye className="h-4 w-4" />
                    Preview Email UI
                  </Button>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Enable Switch / Checkbox */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="daily-summary-toggle"
                      checked={dailySummaryEnabled}
                      onCheckedChange={checked => setDailySummaryEnabled(Boolean(checked))}
                    />
                    <label
                      htmlFor="daily-summary-toggle"
                      className="text-xs font-medium text-label-primary cursor-pointer select-none"
                    >
                      Enable End-of-Day Summary Email
                    </label>
                  </div>

                  {/* Recipient Emails */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-label-secondary flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-copper" />
                      Recipient Emails (Aman + Friends, comma-separated)
                    </label>
                    <Input
                      type="text"
                      value={notificationEmails}
                      onChange={e => setNotificationEmails(e.target.value)}
                      placeholder="aman@gmail.com, friend1@gmail.com, friend2@gmail.com"
                      className="glass-ultra border border-[var(--glass-border-medium)] focus:ring-copper/40 text-label-primary bg-zinc-900/60 font-sans text-xs py-2 px-3"
                    />
                    <p className="text-xs text-label-tertiary">
                      Add your friends&apos; emails separated by commas (e.g.{' '}
                      <code>aman@gmail.com, buddy@gmail.com</code>). All recipients listed here will
                      receive your daily job hunt summary!
                    </p>
                  </div>

                  {/* Delivery Time */}
                  <div className="space-y-1.5 max-w-[200px]">
                    <label className="text-xs font-medium text-label-secondary flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-copper" />
                      Scheduled Time
                    </label>
                    <Input
                      type="time"
                      value={dailySummaryTime}
                      onChange={e => setDailySummaryTime(e.target.value)}
                      className="glass-ultra border border-[var(--glass-border-medium)] focus:ring-copper/40 text-label-primary bg-zinc-900/60 font-sans text-xs py-2 px-3"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Email Preview Modal */}
            <EmailPreviewModal
              isOpen={isPreviewOpen}
              onClose={() => setIsPreviewOpen(false)}
              defaultRecipients={notificationEmails || user.email || ''}
              onRecipientsChange={setNotificationEmails}
            />

            {/* Bottom Actions */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="btn-glass px-6 py-2.5 flex items-center gap-2 font-medium"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </AnimatedBackground>
  )
}
