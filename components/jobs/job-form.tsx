'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, DollarSign, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { eurToUsd, formatUsd } from '@/lib/currency'

interface JobFormData {
  appName: string
  appDescription: string
  packageName: string
  googlePlayLink: string
  appCategory: string
  testersNeeded: number
  testDuration: number
  minAndroidVersion: string
  paymentPerTester: number
  planType: 'STARTER' | 'PROFESSIONAL' | 'CUSTOM'
}

const DEFAULT_JOB_FORM_DATA: JobFormData = {
  appName: '',
  appDescription: '',
  packageName: '',
  googlePlayLink: '',
  appCategory: '',
  testersNeeded: 20,
  testDuration: 14,
  minAndroidVersion: '',
  paymentPerTester: 7.5,
  planType: 'STARTER',
}

function getStoredJobFormState(): {
  formData: JobFormData
  hasStoredData: boolean
} {
  if (typeof window === 'undefined') {
    return { formData: DEFAULT_JOB_FORM_DATA, hasStoredData: false }
  }

  try {
    const savedData = window.localStorage.getItem('jobFormData')
    if (!savedData) {
      return { formData: DEFAULT_JOB_FORM_DATA, hasStoredData: false }
    }

    const parsedData = JSON.parse(savedData) as Partial<JobFormData>

    return {
      formData: {
        ...DEFAULT_JOB_FORM_DATA,
        ...parsedData,
      },
      hasStoredData: true,
    }
  } catch (error) {
    console.error('Failed to restore form data:', error)
    return { formData: DEFAULT_JOB_FORM_DATA, hasStoredData: false }
  }
}

export function JobForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [initialDraftState] = useState(getStoredJobFormState)
  const [hasStoredData, setHasStoredData] = useState(initialDraftState.hasStoredData)
  const [formData, setFormData] = useState<JobFormData>(initialDraftState.formData)
  const hasHydratedRef = useRef(false)

  useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true
      return
    }

    try {
      localStorage.setItem('jobFormData', JSON.stringify(formData))
    } catch (error) {
      console.error('Failed to save form data:', error)
    }
  }, [formData])

  const totalBudget = formData.paymentPerTester * formData.testersNeeded
  const platformFee = totalBudget * 0.15
  const totalCostEur = totalBudget + platformFee
  const totalCostUsd = eurToUsd(totalCostEur)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create job')
        setLoading(false)
        return
      }

      localStorage.removeItem('jobFormData')
      router.push(`/dashboard/jobs/${data.jobId}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const MIN_TESTERS = 12
  const RECOMMENDED_TESTERS = 20
  const MIN_DURATION = 14
  const MIN_PAYMENT = 5

  const handlePlanChange = (plan: 'STARTER' | 'PROFESSIONAL' | 'CUSTOM') => {
    if (plan === 'STARTER') {
      setFormData((prev) => ({
        ...prev,
        planType: 'STARTER',
        testersNeeded: 20,
        paymentPerTester: 7.5,
      }))
      return
    }

    if (plan === 'PROFESSIONAL') {
      setFormData((prev) => ({
        ...prev,
        planType: 'PROFESSIONAL',
        testersNeeded: 35,
        paymentPerTester: 7.14,
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      planType: 'CUSTOM',
    }))
  }

  const handleChange = (field: keyof JobFormData, value: string | number) => {
    if (
      field === 'testersNeeded' ||
      field === 'paymentPerTester' ||
      field === 'testDuration'
    ) {
      setFormData((prev) => ({ ...prev, [field]: value, planType: 'CUSTOM' }))
      return
    }

    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const clearSavedData = () => {
    try {
      localStorage.removeItem('jobFormData')
      setHasStoredData(false)
      setFormData(DEFAULT_JOB_FORM_DATA)
    } catch (error) {
      console.error('Failed to clear form data:', error)
    }
  }

  return (
    <div className="space-y-6">
      {hasStoredData && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-600">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-medium">Your draft has been restored</p>
              <p className="text-sm">
                We found your previously saved form data. Continue editing or start fresh.
              </p>
            </div>
          </div>
          <button
            onClick={clearSavedData}
            className="shrink-0 p-1 text-blue-600 hover:text-blue-700"
            title="Clear saved data"
            type="button"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
          <AlertCircle className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Choose a Plan</CardTitle>
              <CardDescription>Select the best testing plan for your app</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => handlePlanChange('STARTER')}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    formData.planType === 'STARTER'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <p className="text-lg font-bold">{formatUsd(eurToUsd(150))}</p>
                  <p className="font-semibold">Starter</p>
                  <p className="mt-1 text-xs text-gray-500">
                    20 verified testers, payouts set in EUR
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlanChange('PROFESSIONAL')}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    formData.planType === 'PROFESSIONAL'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <p className="text-lg font-bold">{formatUsd(eurToUsd(250))}</p>
                  <p className="font-semibold">Professional</p>
                  <p className="mt-1 text-xs text-gray-500">
                    35 verified testers, payouts set in EUR
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlanChange('CUSTOM')}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    formData.planType === 'CUSTOM'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <p className="text-lg font-bold">Custom</p>
                  <p className="font-semibold">Flexible</p>
                  <p className="mt-1 text-xs text-gray-500">Set your own rates</p>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>App Information</CardTitle>
              <CardDescription>Basic details about your app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appName">App Name *</Label>
                <Input
                  id="appName"
                  placeholder="My Awesome App"
                  value={formData.appName}
                  onChange={(e) => handleChange('appName', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="appDescription">App Description *</Label>
                <Textarea
                  id="appDescription"
                  placeholder="Describe your app and what testers should focus on..."
                  rows={5}
                  value={formData.appDescription}
                  onChange={(e) => handleChange('appDescription', e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">Minimum 20 characters</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="packageName">Package Name (Optional)</Label>
                  <Input
                    id="packageName"
                    placeholder="com.example.app"
                    value={formData.packageName}
                    onChange={(e) => handleChange('packageName', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appCategory">Category (Optional)</Label>
                  <Select
                    value={formData.appCategory}
                    onValueChange={(value) => handleChange('appCategory', value)}
                  >
                    <SelectTrigger id="appCategory">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="productivity">Productivity</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="games">Games</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="health">Health &amp; Fitness</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="shopping">Shopping</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="googlePlayLink">Google Play Closed Test Link *</Label>
                <Input
                  id="googlePlayLink"
                  type="url"
                  placeholder="https://play.google.com/apps/testing/..."
                  value={formData.googlePlayLink}
                  onChange={(e) => handleChange('googlePlayLink', e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  Testers will use this link to opt in to your closed test.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Testing Requirements</CardTitle>
              <CardDescription>Define your testing needs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="testersNeeded">Number of Testers *</Label>
                  <Input
                    id="testersNeeded"
                    type="number"
                    min={MIN_TESTERS}
                    max="500"
                    value={formData.testersNeeded}
                    onChange={(e) =>
                      handleChange(
                        'testersNeeded',
                        Math.max(MIN_TESTERS, parseInt(e.target.value, 10) || MIN_TESTERS)
                      )
                    }
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Minimum {MIN_TESTERS} testers. Recommended: {RECOMMENDED_TESTERS}+.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testDuration">Test Duration (days) *</Label>
                  <Input
                    id="testDuration"
                    type="number"
                    min={MIN_DURATION}
                    max="90"
                    step="1"
                    value={formData.testDuration}
                    onChange={(e) =>
                      handleChange(
                        'testDuration',
                        Math.max(MIN_DURATION, parseInt(e.target.value, 10) || MIN_DURATION)
                      )
                    }
                    required
                  />
                  <p className="text-xs text-gray-500">Minimum 14 days for testing</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minAndroidVersion">Minimum Android Version (Optional)</Label>
                <Select
                  value={formData.minAndroidVersion}
                  onValueChange={(value) => handleChange('minAndroidVersion', value)}
                >
                  <SelectTrigger id="minAndroidVersion">
                    <SelectValue placeholder="Select minimum version" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14">Android 14</SelectItem>
                    <SelectItem value="13">Android 13</SelectItem>
                    <SelectItem value="12">Android 12</SelectItem>
                    <SelectItem value="11">Android 11</SelectItem>
                    <SelectItem value="10">Android 10</SelectItem>
                    <SelectItem value="9">Android 9</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
              <CardDescription>Set your tester payout in EUR</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentPerTester">Payment Per Tester (EUR) *</Label>
                <Input
                  id="paymentPerTester"
                  type="number"
                  min={MIN_PAYMENT}
                  max="100"
                  step="0.50"
                  value={formData.paymentPerTester}
                  onChange={(e) =>
                    handleChange(
                      'paymentPerTester',
                      Math.max(MIN_PAYMENT, parseFloat(e.target.value) || MIN_PAYMENT)
                    )
                  }
                  required
                />
                <p className="text-xs text-gray-500">
                  Minimum EUR {MIN_PAYMENT}. Higher payouts attract testers faster.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Summary
              </CardTitle>
              <CardDescription>Your total investment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Testers</span>
                  <span className="font-medium">{formData.testersNeeded}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment per tester</span>
                  <span className="font-medium">EUR {formData.paymentPerTester.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Test duration</span>
                  <span className="font-medium">{formData.testDuration} days</span>
                </div>
                <div className="space-y-2 border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tester payments</span>
                    <span className="font-medium">EUR {totalBudget.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Platform fee (15%)</span>
                    <span className="font-medium">EUR {platformFee.toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Developer Charge</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatUsd(totalCostUsd)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-lg bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900">What&apos;s Included:</p>
                <ul className="space-y-1 text-xs text-blue-700">
                  <li>- {formData.testersNeeded} verified testers</li>
                  <li>- {formData.testDuration}-day testing period</li>
                  <li>- Google Play opt-in verification</li>
                  <li>- Basic feedback from testers</li>
                  <li>- Real-time progress tracking</li>
                </ul>
              </div>

              <Button onClick={handleSubmit} className="w-full" size="lg" disabled={loading}>
                {loading ? 'Creating Job...' : 'Create Testing Job'}
              </Button>

              <p className="text-center text-xs text-gray-500">
                Job will be saved as draft. Complete the USD payment on the next screen, then
                publish it.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
