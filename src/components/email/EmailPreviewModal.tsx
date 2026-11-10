'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Mail,
  Send,
  Sparkles,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
} from 'lucide-react'

export interface EmailPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  defaultRecipients?: string
  onRecipientsChange?: (recipients: string) => void
}

type PreviewMode = 'today' | 'active_demo' | 'rest_demo'

export function EmailPreviewModal({
  isOpen,
  onClose,
  defaultRecipients = '',
  onRecipientsChange,
}: EmailPreviewModalProps) {
  const [mode, setMode] = React.useState<PreviewMode>('active_demo')
  const [subject, setSubject] = React.useState<string>('')
  const [html, setHtml] = React.useState<string>('')
  const [editableRecipients, setEditableRecipients] = React.useState(defaultRecipients)
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  // Send state
  const [isSending, setIsSending] = React.useState<boolean>(false)
  const [sendSuccess, setSendSuccess] = React.useState<string | null>(null)
  const [sendError, setSendError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setEditableRecipients(defaultRecipients)
  }, [defaultRecipients])

  const loadPreview = React.useCallback(
    async (selectedMode: PreviewMode, recipientsString?: string) => {
      setIsLoading(true)
      try {
        const rawList = (recipientsString ?? editableRecipients)
          .split(',')
          .map(r => r.trim())
          .filter(Boolean)

        const res = await fetch('/api/email/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: selectedMode,
            customRecipients: rawList.length > 0 ? rawList : undefined,
          }),
        })

        if (!res.ok) {
          throw new Error('Failed to load preview')
        }

        const data = await res.json()
        setSubject(data.subject || '')
        setHtml(data.html || '')
      } catch (err) {
        console.error('Failed to load email preview:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [editableRecipients]
  )

  React.useEffect(() => {
    if (isOpen) {
      loadPreview(mode)
    }
  }, [isOpen, mode, loadPreview])

  const handleSendTest = async () => {
    setIsSending(true)
    setSendSuccess(null)
    setSendError(null)

    try {
      const res = await fetch('/api/email/send-summary', {
        method: 'POST',
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send test email')
      }

      setSendSuccess(`Email successfully sent to ${data.recipientCount} recipient(s)!`)
      setTimeout(() => setSendSuccess(null), 5000)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send test email')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        variant="glass"
        className="max-w-4xl w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden border border-zinc-800 bg-zinc-950/95"
      >
        <DialogHeader className="p-5 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-zinc-100">
                Daily Email Preview
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Check exactly what you and your friends will receive in Gmail.
              </DialogDescription>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-900 border border-zinc-800 self-start md:self-auto">
            <Button
              type="button"
              variant={mode === 'active_demo' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('active_demo')}
              className="text-xs h-7 px-3"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Active Day (Demo)
            </Button>
            <Button
              type="button"
              variant={mode === 'rest_demo' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('rest_demo')}
              className="text-xs h-7 px-3"
            >
              <Coffee className="h-3 w-3 mr-1" />
              Rest Day (Demo)
            </Button>
            <Button
              type="button"
              variant={mode === 'today' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('today')}
              className="text-xs h-7 px-3"
            >
              Today&apos;s Live Data
            </Button>
          </div>
        </DialogHeader>

        {/* Email Header Preview Strip */}
        <div className="px-5 py-3 bg-zinc-900/60 border-b border-zinc-800 text-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-400 shrink-0">Subject:</span>
            <span className="font-medium text-zinc-200 truncate">
              {subject || 'Loading subject...'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <label
              htmlFor="modal-recipients-input"
              className="font-semibold text-zinc-400 flex items-center gap-1 shrink-0"
            >
              <Users className="h-3.5 w-3.5 text-orange-400" /> Recipients:
            </label>
            <input
              id="modal-recipients-input"
              type="text"
              value={editableRecipients}
              onChange={e => {
                const val = e.target.value
                setEditableRecipients(val)
                onRecipientsChange?.(val)
              }}
              onBlur={() => loadPreview(mode, editableRecipients)}
              placeholder="aman@gmail.com, friend1@gmail.com, friend2@gmail.com"
              className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded px-2.5 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50"
            />
          </div>
        </div>

        {/* Rendered HTML Iframe Preview */}
        <div className="flex-1 min-h-[420px] bg-zinc-950 relative overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : (
            <iframe
              srcDoc={html}
              title="Email Digest Preview"
              className="w-full h-full border-0 min-h-[420px]"
              sandbox="allow-same-origin"
            />
          )}
        </div>

        {/* Footer with Send Action & Status */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs">
            {sendSuccess && (
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {sendSuccess}
              </div>
            )}
            {sendError && (
              <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                <AlertCircle className="h-4 w-4" />
                {sendError}
              </div>
            )}
            {!sendSuccess && !sendError && (
              <span className="text-zinc-500">
                Preview reflects live formatting across mobile and desktop Gmail.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-8"
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSendTest}
              disabled={isSending}
              className="text-xs h-8 bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-1.5"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Send Test Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
