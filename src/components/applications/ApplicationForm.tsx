'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type ApplicationFormData, type ApplicationStatus } from '@/lib/schemas/application.schema'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Sparkles, Copy, Check, Loader2, FileText } from 'lucide-react'

// Define a form-friendly version of the schema that works better with React Hook Form
const formSchema = z.object({
  company_name: z
    .string()
    .min(1, 'Company name is required')
    .max(255, 'Company name must be less than 255 characters'),
  job_title: z
    .string()
    .min(1, 'Job title is required')
    .max(255, 'Job title must be less than 255 characters'),
  job_url: z.string().url('Must be a valid URL').or(z.literal('')),
  location: z.string().max(255, 'Location must be less than 255 characters'),
  salary_range: z.string().max(100, 'Salary range must be less than 100 characters'),
  status: z.enum([
    'wishlist',
    'applied',
    'phone_screen',
    'assessment',
    'take_home',
    'interviewing',
    'final_round',
    'offered',
    'accepted',
    'rejected',
    'withdrawn',
    'ghosted',
  ]),
  date_applied: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  notes: z.string().max(5000, 'Notes must be less than 5000 characters'),
  job_description: z.string().optional(),
  cover_letter: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface ApplicationFormProps {
  onSubmit: (_data: ApplicationFormData) => void
  onCancel?: () => void
  initialData?: Partial<ApplicationFormData>
  isLoading?: boolean
  submitButtonText?: string
}

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'applied', label: 'Applied' },
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'take_home', label: 'Take Home' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'final_round', label: 'Final Round' },
  { value: 'offered', label: 'Offered' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'ghosted', label: 'Ghosted' },
]

export default function ApplicationForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  submitButtonText = 'Submit Application',
}: ApplicationFormProps) {
  const [isGeneratingCL, setIsGeneratingCL] = React.useState(false)
  const [clError, setClError] = React.useState<string | null>(null)
  const [copiedCL, setCopiedCL] = React.useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: initialData?.company_name ?? '',
      job_title: initialData?.job_title ?? '',
      job_url: initialData?.job_url ?? '',
      location: initialData?.location ?? '',
      salary_range: initialData?.salary_range ?? '',
      status: initialData?.status ?? 'wishlist',
      date_applied: initialData?.date_applied ?? new Date().toISOString().split('T')[0],
      notes: initialData?.notes ?? '',
      job_description: initialData?.job_description ?? '',
      cover_letter: initialData?.cover_letter ?? '',
    },
  })

  const handleGenerateCoverLetter = async () => {
    const company = form.getValues('company_name')?.trim()
    const title = form.getValues('job_title')?.trim()
    const jd = form.getValues('job_description')?.trim()

    if (!company || !title) {
      setClError('Please enter both Company Name and Job Title first.')
      return
    }

    setIsGeneratingCL(true)
    setClError(null)

    try {
      const res = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: company,
          jobTitle: title,
          jobDescription: jd,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate cover letter.')
      }

      form.setValue('cover_letter', data.coverLetter)
    } catch (err) {
      console.error('Error generating cover letter:', err)
      const msg = err instanceof Error ? err.message : 'Could not generate cover letter.'
      setClError(msg)
    } finally {
      setIsGeneratingCL(false)
    }
  }

  const handleCopyCoverLetter = () => {
    const text = form.getValues('cover_letter')
    if (text) {
      navigator.clipboard.writeText(text)
      setCopiedCL(true)
      setTimeout(() => setCopiedCL(false), 2000)
    }
  }

  const handleSubmit = (data: FormData) => {
    onSubmit(data as unknown as ApplicationFormData)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" noValidate>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Company Name */}
          <FormField
            control={form.control}
            name="company_name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-label-primary font-semibold">
                  Company Name <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Google, Stripe, Microsoft"
                    required
                    disabled={isLoading}
                    aria-required="true"
                    className="glass-ultra border-0 text-label-primary placeholder:text-label-tertiary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Job Title */}
          <FormField
            control={form.control}
            name="job_title"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-label-primary font-semibold">
                  Job Title <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Senior Full-Stack Engineer, Product Manager"
                    required
                    disabled={isLoading}
                    aria-required="true"
                    className="glass-ultra border-0 text-label-primary placeholder:text-label-tertiary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Job URL */}
          <FormField
            control={form.control}
            name="job_url"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-label-primary font-semibold">
                  Job URL (LinkedIn or Careers Page)
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="url"
                    placeholder="https://linkedin.com/jobs/view/... or careers.company.com/..."
                    disabled={isLoading}
                    value={field.value ?? ''}
                    className="glass-ultra border-0 text-label-primary placeholder:text-label-tertiary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Location */}
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-label-primary font-semibold">Location</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Remote / Bengaluru, India"
                    disabled={isLoading}
                    value={field.value ?? ''}
                    className="glass-ultra border-0 text-label-primary placeholder:text-label-tertiary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Salary Range */}
          <FormField
            control={form.control}
            name="salary_range"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-label-primary font-semibold">Salary Range</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., ₹25-35 LPA or $120k-$150k"
                    disabled={isLoading}
                    value={field.value ?? ''}
                    className="glass-ultra border-0 text-label-primary placeholder:text-label-tertiary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-label-primary font-semibold">
                  Status <span className="text-red-500">*</span>
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger aria-label="Status" variant="glass">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent variant="glass">
                    {STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value} variant="glass">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date Applied */}
          <FormField
            control={form.control}
            name="date_applied"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-label-primary font-semibold">
                  Date Applied <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="date"
                    disabled={isLoading}
                    className="glass-ultra border-0 text-label-primary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Job Description (JD) */}
          <FormField
            control={form.control}
            name="job_description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-label-primary font-semibold flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-copper" />
                      Job Description (JD)
                    </FormLabel>
                    <p className="text-xs text-label-tertiary mt-0.5">
                      Paste the requirements/description from LinkedIn or the company page.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCoverLetter}
                    disabled={isGeneratingCL || isLoading}
                    className="border-copper/40 text-copper hover:bg-copper/10 gap-1.5 text-xs font-medium"
                  >
                    {isGeneratingCL ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Drafting with Gemini...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        Generate Cover Letter
                      </>
                    )}
                  </Button>
                </div>

                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Paste the full job description here..."
                    className="min-h-[110px] resize-y glass-ultra border-0 text-label-primary placeholder:text-label-tertiary text-xs font-mono"
                    disabled={isLoading}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* AI Cover Letter Generator Preview & Edit */}
          <FormField
            control={form.control}
            name="cover_letter"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-label-primary font-semibold flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-copper" />
                      Tailored Cover Letter
                    </FormLabel>
                    <p className="text-xs text-label-tertiary mt-0.5">
                      Auto-generated based on your Master Resume and this job description.
                    </p>
                  </div>

                  {field.value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyCoverLetter}
                      className="text-xs text-copper hover:bg-copper/10 gap-1"
                    >
                      {copiedCL ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Text
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {clError && (
                  <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-glass-sm border border-red-500/20">
                    {clError}
                  </p>
                )}

                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Click 'Generate Cover Letter' above or write/paste your custom cover letter here..."
                    className="min-h-[140px] resize-y glass-ultra border-0 text-label-primary placeholder:text-label-tertiary text-xs leading-relaxed"
                    disabled={isLoading}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-label-primary font-semibold">Notes</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Add any additional notes, referral details, or thoughts..."
                    className="min-h-[80px] resize-y glass-ultra border-0 text-label-primary placeholder:text-label-tertiary text-xs"
                    disabled={isLoading}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-label-quaternary">
          {onCancel && (
            <Button type="button" variant="glass" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="glass" disabled={isLoading || isGeneratingCL}>
            {isLoading
              ? submitButtonText === 'Save Changes'
                ? 'Saving...'
                : 'Submitting...'
              : submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  )
}
