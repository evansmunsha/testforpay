'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { AlertCircle, CheckCircle, Loader } from 'lucide-react'

interface ProductionQuestionnaireProps {
  jobId: string
}

interface FormData {
  recruiterEase: string
  engagementSummary: string
  feedbackSummary: string
  targetAudience: string
  valueProposition: string
  expectedInstalls: string
  changesApplied: string
  readinessCriteria: string
}

export function ProductionQuestionnaire({ jobId }: ProductionQuestionnaireProps) {
  const [formData, setFormData] = useState<Partial<FormData>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadQuestionnaire = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/questionnaire`)
        const data = await res.json()

        if (data.questionnaire) {
          setFormData({
            recruiterEase: data.questionnaire.recruiterEase || '',
            engagementSummary: data.questionnaire.engagementSummary || '',
            feedbackSummary: data.questionnaire.feedbackSummary || '',
            targetAudience: data.questionnaire.targetAudience || '',
            valueProposition: data.questionnaire.valueProposition || '',
            expectedInstalls: data.questionnaire.expectedInstalls || '',
            changesApplied: data.questionnaire.changesApplied || '',
            readinessCriteria: data.questionnaire.readinessCriteria || '',
          })
          setSubmitted(data.questionnaire.submitted)
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load questionnaire', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    loadQuestionnaire()
  }, [jobId, toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSaveDraft = async () => {
    try {
      setSubmitting(true)
      const res = await fetch(`/api/jobs/${jobId}/questionnaire`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('Failed to save')

      toast({ title: 'Success', description: 'Draft saved successfully', variant: 'success' })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save draft', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      setSubmitting(true)
      const res = await fetch(`/api/jobs/${jobId}/questionnaire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      setSubmitted(true)
      toast({ title: 'Success', description: 'Questionnaire submitted successfully!', variant: 'success' })
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to submit', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {submitted && (
        <Card className="border-green-200 bg-green-50 p-4 flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900">Questionnaire Submitted</h3>
            <p className="text-sm text-green-800">Your production readiness questionnaire has been submitted to Google Play.</p>
          </div>
        </Card>
      )}

      <Card className="border-blue-200 bg-blue-50 p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Google Play Production Access</p>
          <p>Complete this questionnaire to apply for production access on Google Play. Your answers help us understand your app's readiness and testing quality.</p>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Part 1: About your closed test */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Part 1: About Your Closed Test</h2>
            <p className="text-sm text-gray-600 mt-1">Tell us about your testing recruitment and tester engagement</p>
          </div>

          <div>
            <Label htmlFor="recruiterEase" className="text-base font-semibold">
              How easy was it to recruit testers for your app?
            </Label>
            <p className="text-sm text-gray-600 mb-3">This helps us understand your experience with Google Play's testing platform</p>
            <select
              name="recruiterEase"
              id="recruiterEase"
              value={formData.recruiterEase || ''}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select an option...</option>
              <option value="very_easy">Very Easy</option>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="difficult">Difficult</option>
              <option value="very_difficult">Very Difficult</option>
            </select>
          </div>

          <div>
            <Label htmlFor="engagementSummary" className="text-base font-semibold">
              Describe tester engagement during your closed test
            </Label>
            <p className="text-sm text-gray-600 mb-3">
              Include: Did testers use all features? Was usage consistent with expected behavior?
            </p>
            <Textarea
              name="engagementSummary"
              id="engagementSummary"
              value={formData.engagementSummary || ''}
              onChange={handleChange}
              placeholder="Describe tester engagement, feature coverage, and usage patterns..."
              minLength={50}
              maxLength={2000}
              required
              rows={6}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              {(formData.engagementSummary || '').length}/2000 characters
            </p>
          </div>

          <div>
            <Label htmlFor="feedbackSummary" className="text-base font-semibold">
              Summarize the feedback you received
            </Label>
            <p className="text-sm text-gray-600 mb-3">Include: How you collected feedback, main themes, issues found, and improvements made</p>
            <Textarea
              name="feedbackSummary"
              id="feedbackSummary"
              value={formData.feedbackSummary || ''}
              onChange={handleChange}
              placeholder="Summarize feedback themes, issues found, and how you collected it..."
              minLength={50}
              maxLength={2000}
              required
              rows={6}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              {(formData.feedbackSummary || '').length}/2000 characters
            </p>
          </div>
        </div>

        {/* Part 2: About your app */}
        <div className="space-y-6 pt-6 border-t">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Part 2: About Your App</h2>
            <p className="text-sm text-gray-600 mt-1">Tell us about your app's purpose and market potential</p>
          </div>

          <div>
            <Label htmlFor="targetAudience" className="text-base font-semibold">
              Who is the intended audience for your app?
            </Label>
            <p className="text-sm text-gray-600 mb-3">Be as specific as possible (e.g., ages, interests, use cases)</p>
            <Textarea
              name="targetAudience"
              id="targetAudience"
              value={formData.targetAudience || ''}
              onChange={handleChange}
              placeholder="Describe your target audience..."
              minLength={20}
              maxLength={1000}
              required
              rows={4}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              {(formData.targetAudience || '').length}/1000 characters
            </p>
          </div>

          <div>
            <Label htmlFor="valueProposition" className="text-base font-semibold">
              How does your app provide value to users?
            </Label>
            <p className="text-sm text-gray-600 mb-3">Explain the main benefits and why users should download your app</p>
            <Textarea
              name="valueProposition"
              id="valueProposition"
              value={formData.valueProposition || ''}
              onChange={handleChange}
              placeholder="Describe what makes your app valuable..."
              minLength={50}
              maxLength={1000}
              required
              rows={4}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              {(formData.valueProposition || '').length}/1000 characters
            </p>
          </div>

          <div>
            <Label htmlFor="expectedInstalls" className="text-base font-semibold">
              How many installs do you expect in the first year?
            </Label>
            <select
              name="expectedInstalls"
              id="expectedInstalls"
              value={formData.expectedInstalls || ''}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a range...</option>
              <option value="0_to_100">0 - 100</option>
              <option value="100_to_1k">100 - 1,000</option>
              <option value="1k_to_10k">1,000 - 10,000</option>
              <option value="10k_to_100k">10,000 - 100,000</option>
              <option value="100k_to_1m">100,000 - 1,000,000</option>
              <option value="1m_plus">1,000,000+</option>
            </select>
          </div>
        </div>

        {/* Part 3: Production readiness */}
        <div className="space-y-6 pt-6 border-t">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Part 3: Production Readiness</h2>
            <p className="text-sm text-gray-600 mt-1">Confirm your app is ready for production release</p>
          </div>

          <div>
            <Label htmlFor="changesApplied" className="text-base font-semibold">
              What changes did you make based on closed test feedback?
            </Label>
            <p className="text-sm text-gray-600 mb-3">List bugs fixed, features added, and improvements made</p>
            <Textarea
              name="changesApplied"
              id="changesApplied"
              value={formData.changesApplied || ''}
              onChange={handleChange}
              placeholder="Describe changes made based on feedback..."
              minLength={50}
              maxLength={2000}
              required
              rows={6}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              {(formData.changesApplied || '').length}/2000 characters
            </p>
          </div>

          <div>
            <Label htmlFor="readinessCriteria" className="text-base font-semibold">
              How did you decide your app was ready for production?
            </Label>
            <p className="text-sm text-gray-600 mb-3">
              Explain your quality standards, testing criteria, and confidence in the app's stability
            </p>
            <Textarea
              name="readinessCriteria"
              id="readinessCriteria"
              value={formData.readinessCriteria || ''}
              onChange={handleChange}
              placeholder="Describe your production readiness criteria..."
              minLength={50}
              maxLength={2000}
              required
              rows={6}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              {(formData.readinessCriteria || '').length}/2000 characters
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
            Save as Draft
          </Button>
          <Button
            type="submit"
            disabled={submitting || !formData.recruiterEase}
            className="flex-1"
          >
            {submitting ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit to Google Play
          </Button>
        </div>
      </form>
    </div>
  )
}
