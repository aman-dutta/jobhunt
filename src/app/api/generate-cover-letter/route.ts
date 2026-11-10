import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserSettings } from '@/lib/api/settings'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
    }

    const body = await request.json()
    const { jobTitle, companyName, jobDescription, customResume } = body

    if (!jobTitle || !companyName) {
      return NextResponse.json(
        { error: 'Job title and company name are required.' },
        { status: 400 }
      )
    }

    // Get user's saved settings for master resume and API key
    const settings = await getUserSettings(supabase)
    const masterResume = customResume?.trim() || settings?.master_resume?.trim() || ''

    const apiKey =
      settings?.gemini_api_key?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.DOSSIER_AI_KEY?.trim() ||
      ''

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Gemini API key not found. Please add your Gemini API key in your Profile page or .env.local file.',
        },
        { status: 400 }
      )
    }

    const systemPrompt = `You are a world-class professional career coach and executive resume writer.
Your task is to write an engaging, concise, authentic, and highly tailored cover letter for a job applicant.

Guidelines:
1. Ground the letter strictly in the applicant's real background and resume provided. Do NOT invent companies, degrees, or achievements.
2. Directly align 2-3 specific skills or projects from the resume with the requirements mentioned in the job description.
3. Keep the tone confident, warm, professional, and succinct (around 250-350 words, 3-4 paragraphs).
4. Structure:
   - Salutation (e.g. "Dear Hiring Team at [Company]," or "Dear Hiring Manager,")
   - Opening paragraph: Express enthusiastic interest in the [Job Title] role at [Company] and why this mission/team resonates.
   - Body paragraph(s): Highlight 2-3 concrete accomplishments and relevant technologies/skills that match what they are looking for.
   - Closing paragraph: Summary of enthusiasm, call-to-action for an interview, and appreciation for their time.
   - Sign-off (e.g. "Sincerely,\n[Applicant Name]").

Target Role: ${jobTitle}
Company Name: ${companyName}

Applicant Resume / Profile:
${masterResume || 'Experienced professional with relevant domain skills.'}

Job Description:
${jobDescription || 'Standard requirements for ' + jobTitle}
`

    let generatedText = ''
    let lastError = ''

    // Method 1: Try OpenAI-compatible endpoint with Gemini (handles AQ. and bearer tokens)
    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert career advisor. Return only the clean, complete cover letter text without chat commentary.',
              },
              {
                role: 'user',
                content: systemPrompt,
              },
            ],
            temperature: 0.7,
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        generatedText = data.choices?.[0]?.message?.content?.trim() || ''
      } else {
        const errData = await response.json().catch(() => ({}))
        lastError = errData?.error?.message || response.statusText
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'OpenAI-compatible request failed'
    }

    // Method 2: Fallback to Gemini native REST API if Method 1 didn't produce text
    if (!generatedText) {
      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
      for (const model of modelsToTry) {
        try {
          const nativeUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
          const nativeRes = await fetch(nativeUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: systemPrompt,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.7,
              },
            }),
          })

          if (nativeRes.ok) {
            const nativeData = await nativeRes.json()
            const candidate = nativeData.candidates?.[0]?.content?.parts?.[0]?.text
            if (candidate) {
              generatedText = candidate.trim()
              break
            }
          } else {
            const errBody = await nativeRes.json().catch(() => ({}))
            lastError = errBody?.error?.message || nativeRes.statusText
          }
        } catch (err) {
          lastError = err instanceof Error ? err.message : 'Native API call failed'
        }
      }
    }

    if (!generatedText) {
      return NextResponse.json(
        {
          error: `Failed to generate cover letter: ${lastError || 'Please check your Gemini API key.'}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ coverLetter: generatedText })
  } catch (err) {
    console.error('Error in generate-cover-letter route:', err)
    const errorMsg =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while generating cover letter.'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
