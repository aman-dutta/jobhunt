import nodemailer from 'nodemailer'
import { Resend } from 'resend'

export interface SendDigestOptions {
  recipients: string[]
  subject: string
  html: string
}

export interface SendDigestResult {
  success: boolean
  messageId: string
  recipientCount: number
  provider: 'gmail_smtp' | 'resend'
}

/**
 * Parses and cleans a comma-separated or array list of emails
 */
export function parseRecipientEmails(input: string | string[] | null | undefined): string[] {
  if (!input) return []
  const list = Array.isArray(input) ? input : input.split(',')
  return list.map(email => email.trim()).filter(email => email.length > 0 && email.includes('@'))
}

/**
 * Sends the daily digest email via Gmail SMTP or Resend
 */
export async function sendDailyDigestEmail(options: SendDigestOptions): Promise<SendDigestResult> {
  const recipients = parseRecipientEmails(options.recipients)

  if (recipients.length === 0) {
    throw new Error('No valid recipient emails provided')
  }

  // Check for Gmail SMTP configuration first
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD

  if (gmailUser && gmailPass) {
    // Remove any spaces if user copied "abcd efgh ijkl mnop"
    const cleanPass = gmailPass.replace(/\s+/g, '')

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: cleanPass,
      },
    })

    const senderName = process.env.EMAIL_SENDER_NAME || 'JobHunt'
    const fromAddress = `"${senderName}" <${gmailUser}>`

    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipients.join(', '),
      subject: options.subject,
      html: options.html,
    })

    return {
      success: true,
      messageId: info.messageId,
      recipientCount: recipients.length,
      provider: 'gmail_smtp',
    }
  }

  // Fallback to Resend if configured
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    const resend = new Resend(apiKey)
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'JobHunt <onboarding@resend.dev>'

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: recipients,
      subject: options.subject,
      html: options.html,
    })

    if (error) {
      console.error('Resend email error:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    return {
      success: true,
      messageId: data?.id || '',
      recipientCount: recipients.length,
      provider: 'resend',
    }
  }

  throw new Error(
    'No email provider is configured. Please add GMAIL_USER and GMAIL_APP_PASSWORD to your .env.local file, or configure RESEND_API_KEY.'
  )
}
