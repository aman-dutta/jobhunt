'use client'

import * as React from 'react'
import { FileText, Sparkles, Copy, Check, Edit2, Save, Loader2, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Application } from '@/lib/types/database.types'
import { updateApplicationAction } from '@/app/dashboard/actions'

interface DocumentsProps {
  application: Application
  className?: string
}

export function Documents({ application, className }: DocumentsProps) {
  const [coverLetter, setCoverLetter] = React.useState(application.cover_letter || '')
  const [isEditing, setIsEditing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const handleCopy = () => {
    if (coverLetter) {
      navigator.clipboard.writeText(coverLetter)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMsg(null)
    try {
      await updateApplicationAction(application.id, {
        company_name: application.company_name,
        job_title: application.job_title,
        job_url: application.job_url,
        location: application.location || '',
        salary_range: application.salary_range || '',
        status: application.status,
        date_applied: application.date_applied,
        notes: application.notes || '',
        job_description: application.job_description || '',
        cover_letter: coverLetter,
      })
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving cover letter:', err)
      setErrorMsg('Failed to save cover letter changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateCoverLetter = async () => {
    setIsGenerating(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: application.company_name,
          jobTitle: application.job_title,
          jobDescription: application.job_description || application.notes || '',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate cover letter.')
      }

      setCoverLetter(data.coverLetter)
      setIsEditing(true)
    } catch (err) {
      console.error('Generation error:', err)
      const msg = err instanceof Error ? err.message : 'Could not generate cover letter.'
      setErrorMsg(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Cover Letter Section */}
      <section className="glass-ultra rounded-glass-sm p-6 space-y-4 border border-[var(--glass-border-subtle)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-glass-sm bg-copper/10 text-copper border border-copper/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-label-primary flex items-center gap-2">
                Tailored Cover Letter
              </h3>
              <p className="text-xs text-label-secondary">
                Customized for {application.job_title} at {application.company_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {coverLetter && (
              <>
                <Button
                  onClick={handleCopy}
                  size="sm"
                  variant="outline"
                  className="text-xs border-copper/30 text-copper hover:bg-copper/10 gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </Button>

                {isEditing ? (
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    size="sm"
                    className="btn-glass text-xs font-semibold gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    size="sm"
                    variant="ghost"
                    className="text-xs text-label-secondary hover:text-label-primary gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                )}
              </>
            )}

            <Button
              onClick={handleGenerateCoverLetter}
              disabled={isGenerating}
              size="sm"
              variant="outline"
              className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-1.5 font-medium"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  {coverLetter ? (
                    <RotateCw className="w-3.5 h-3.5" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {coverLetter ? 'Regenerate with AI' : 'Generate with Gemini'}
                </>
              )}
            </Button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-glass-sm">
            {errorMsg}
          </div>
        )}

        {coverLetter ? (
          isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={coverLetter}
                onChange={e => setCoverLetter(e.target.value)}
                rows={12}
                className="w-full text-xs font-mono leading-relaxed glass-light border-[var(--glass-border-medium)] p-4"
              />
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    setCoverLetter(application.cover_letter || '')
                    setIsEditing(false)
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  size="sm"
                  className="btn-glass text-xs"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-glass-sm glass-light border border-[var(--glass-border-subtle)] text-xs text-label-primary whitespace-pre-wrap leading-relaxed font-sans">
              {coverLetter}
            </div>
          )
        ) : (
          <div className="p-8 text-center space-y-3 glass-light rounded-glass-sm border border-[var(--glass-border-subtle)]">
            <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
            <h4 className="text-sm font-semibold text-label-primary">
              No cover letter drafted yet
            </h4>
            <p className="text-xs text-label-secondary max-w-sm mx-auto">
              Click &quot;Generate with Gemini&quot; above to create a tailored cover letter using
              your Master Resume and this job posting.
            </p>
            <Button
              onClick={handleGenerateCoverLetter}
              disabled={isGenerating}
              size="sm"
              className="btn-glass text-xs font-medium gap-1.5"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Drafting with Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Now
                </>
              )}
            </Button>
          </div>
        )}
      </section>

      {/* Resume Tip / Reference */}
      <section className="glass-ultra rounded-glass-sm p-5 border border-[var(--glass-border-subtle)] flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-label-primary">Master Resume</h4>
          <p className="text-xs text-label-secondary mt-0.5">
            Your single verified resume history is managed in your Profile and used across all
            applications.
          </p>
        </div>
        <a
          href="/profile"
          className="text-xs font-medium text-copper hover:underline whitespace-nowrap"
        >
          View / Edit Master Resume →
        </a>
      </section>
    </div>
  )
}
