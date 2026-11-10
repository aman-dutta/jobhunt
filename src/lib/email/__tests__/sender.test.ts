import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendDailyDigestEmail } from '../sender'

// Mock Resend
vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn().mockResolvedValue({
          data: { id: 'msg_resend_123' },
          error: null,
        }),
      },
    })),
  }
})

// Mock Nodemailer
const sendMailMock = vi.fn().mockResolvedValue({
  messageId: 'msg_gmail_456',
})

vi.mock('nodemailer', () => {
  return {
    default: {
      createTransport: vi.fn().mockImplementation(() => ({
        sendMail: sendMailMock,
      })),
    },
    createTransport: vi.fn().mockImplementation(() => ({
      sendMail: sendMailMock,
    })),
  }
})

describe('sendDailyDigestEmail', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.GMAIL_USER
    delete process.env.GMAIL_APP_PASSWORD
    process.env.RESEND_API_KEY = 're_test_key'
  })

  it('throws error when no recipients are provided', async () => {
    await expect(
      sendDailyDigestEmail({
        recipients: [],
        subject: 'Test Subject',
        html: '<p>Test</p>',
      })
    ).rejects.toThrow('No valid recipient emails provided')
  })

  it('throws error when neither Gmail nor Resend is configured', async () => {
    delete process.env.RESEND_API_KEY
    delete process.env.GMAIL_USER
    delete process.env.GMAIL_APP_PASSWORD

    await expect(
      sendDailyDigestEmail({
        recipients: ['test@gmail.com'],
        subject: 'Test Subject',
        html: '<p>Test</p>',
      })
    ).rejects.toThrow('No email provider is configured')
  })

  it('prefers Gmail SMTP when GMAIL_USER and GMAIL_APP_PASSWORD are provided', async () => {
    process.env.GMAIL_USER = 'amandutta004@gmail.com'
    process.env.GMAIL_APP_PASSWORD = 'abcd efgh ijkl mnop'

    const result = await sendDailyDigestEmail({
      recipients: ['amandutta004@gmail.com', 'friend1@gmail.com'],
      subject: 'JobHunt Daily Summary',
      html: '<h1>Summary</h1>',
    })

    expect(result.success).toBe(true)
    expect(result.provider).toBe('gmail_smtp')
    expect(result.recipientCount).toBe(2)
    expect(result.messageId).toBe('msg_gmail_456')
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"JobHunt" <amandutta004@gmail.com>',
        to: 'amandutta004@gmail.com, friend1@gmail.com',
        subject: 'JobHunt Daily Summary',
      })
    )
  })

  it('falls back to Resend when only RESEND_API_KEY is provided', async () => {
    delete process.env.GMAIL_USER
    delete process.env.GMAIL_APP_PASSWORD
    process.env.RESEND_API_KEY = 're_test_key'

    const result = await sendDailyDigestEmail({
      recipients: ['amandutta004@gmail.com'],
      subject: 'JobHunt Daily Digest',
      html: '<h1>Summary</h1>',
    })

    expect(result.success).toBe(true)
    expect(result.provider).toBe('resend')
    expect(result.recipientCount).toBe(1)
    expect(result.messageId).toBe('msg_resend_123')
  })
})
