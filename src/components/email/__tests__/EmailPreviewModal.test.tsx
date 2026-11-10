import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EmailPreviewModal } from '../EmailPreviewModal'

describe('EmailPreviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/email/preview')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              subject: '🎯 JobHunt Daily: Aman made 2 moves today!',
              html: '<html><body>Mock Email Content</body></html>',
              isRestDay: false,
              recipients: ['aman@gmail.com', 'friend@gmail.com'],
              userName: 'Aman',
            }),
        })
      }
      if (url.includes('/api/email/send-summary')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              messageId: 'msg_123',
              recipientCount: 2,
            }),
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  it('renders modal when isOpen is true', async () => {
    render(
      <EmailPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        defaultRecipients="friend1@gmail.com, friend2@gmail.com"
      />
    )

    expect(screen.getByText(/Daily Email Preview/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Aman made 2 moves today!/i)).toBeInTheDocument()
    })
  })

  it('switches between modes when buttons are clicked', async () => {
    render(
      <EmailPreviewModal isOpen={true} onClose={vi.fn()} defaultRecipients="friend1@gmail.com" />
    )

    const restBtn = screen.getByRole('button', { name: /Rest Day/i })
    fireEvent.click(restBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/email/preview',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('rest_demo'),
        })
      )
    })
  })

  it('allows sending test email', async () => {
    render(
      <EmailPreviewModal isOpen={true} onClose={vi.fn()} defaultRecipients="friend1@gmail.com" />
    )

    const sendBtn = screen.getByRole('button', { name: /Send Test Email/i })
    fireEvent.click(sendBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/email/send-summary',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})
