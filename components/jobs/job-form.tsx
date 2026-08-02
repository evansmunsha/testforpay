//components/jobs/job-form.tsx

'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, DollarSign, Trash2, Users, Clock, Shield, MessageSquare, BarChart3, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { eurToUsd, formatEur, formatUsd } from '@/lib/currency'
import { TaskTemplateSelector } from '@/components/jobs/task-template-selector'
import { TASK_TEMPLATES } from '@/lib/constants'

type PlanType = 'STARTER' | 'GROWTH' | 'PRO'

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
  planType: PlanType
  taskTemplate: string | null
  customTasks: string[]
}

interface PlanConfig {
  testers: number
  payment: number
  total: number
  fee: number
  label: string
  description: string
  features: string[]
}

const PLANS: Record<PlanType, PlanConfig> = {
  STARTER: {
    testers: 12,
    payment: 2.30,
    total: 28,
    fee: 0.40,
    label: 'Starter',
    description: 'Perfect for first-time publishers',
    features: [
      '12 verified testers',
      '14-day testing period',
      'Google Play opt-in verification',
      'Basic feedback reports',
      'Email support',
      'Approval guarantee',
    ],
  },
  GROWTH: {
    testers: 15,
    payment: 2.75,
    total: 48,
    fee: 6.75,
    label: 'Growth',
    description: 'For developers shipping regularly',
    features: [
      '15 verified testers',
      '14-day testing period',
      'Google Play opt-in verification',
      'Detailed feedback reports',
      'Priority support',
      'Automatic dropout replacement',
      'Approval guarantee',
    ],
  },
  PRO: {
    testers: 25,
    payment: 2.75,
    total: 78,
    fee: 9.25,
    label: 'Pro',
    description: 'Maximum safety & insights',
    features: [
      '25 verified testers',
      '14-day testing period',
      'Google Play opt-in verification',
      'Advanced analytics',
      'Dedicated support',
      'Automatic dropout replacement',
      'Approval guarantee',
    ],
  },
}

const DEFAULT_JOB_FORM_DATA: JobFormData = {
  appName: '',
  appDescription: '',
  packageName: '',
  googlePlayLink: '',
  appCategory: '',
  testersNeeded: PLANS.STARTER.testers,
  testDuration: 14,
  minAndroidVersion: '',
  paymentPerTester: PLANS.STARTER.payment,
  planType: 'STARTER',
  taskTemplate: 'generic',
  customTasks: [...TASK_TEMPLATES.generic],
}

function normalizePlanType(plan: string): PlanType {
  if (plan === 'GROWTH') return 'GROWTH'
  if (plan === 'PRO' || plan === 'PROFESSIONAL') return 'PRO'
  return 'STARTER'
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
    const planType = normalizePlanType(parsedData.planType || 'STARTER')
    const plan = PLANS[planType]

    return {
      formData: {
        ...DEFAULT_JOB_FORM_DATA,
        ...parsedData,
        planType,
        testersNeeded: plan.testers,
        paymentPerTester: plan.payment,
        testDuration: 14,
        taskTemplate: parsedData.taskTemplate ?? DEFAULT_JOB_FORM_DATA.taskTemplate,
        customTasks: Array.isArray(parsedData.customTasks) && parsedData.customTasks.length > 0
          ? parsedData.customTasks
          : DEFAULT_JOB_FORM_DATA.customTasks,
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

  const currentPlan = PLANS[formData.planType]

  useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true
      return
    }

    try {
      localStorage.setItem('jobFormData', JSON.stringify(formData))
      // Show the "draft saved" banner once data starts being written
      setHasStoredData(true)
    } catch (error) {
      console.error('Failed to save form data:', error)
    }
  }, [formData])

  const handlePlanChange = (planType: PlanType) => {
    const plan = PLANS[planType]
    setFormData((prev) => ({
      ...prev,
      planType,
      testersNeeded: plan.testers,
      paymentPerTester: plan.payment,
    }))
  }

  const handleChange = (field: keyof JobFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.appDescription.trim().length < 100) {
      setError('Please write at least 100 characters in the description so testers know what to test.')
      return
    }

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

  const clearSavedData = () => {
    try {
      localStorage.removeItem('jobFormData')
      setHasStoredData(false)
      setFormData(DEFAULT_JOB_FORM_DATA)
    } catch (error) {
      console.error('Failed to clear form data:', error)
    }
  }

  const testerTotal = currentPlan.testers * currentPlan.payment
  const usdApprox = eurToUsd(currentPlan.total)

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
          {/* Plan Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose a Plan</CardTitle>
              <CardDescription>Select the best testing plan for your app</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {(Object.keys(PLANS) as PlanType[]).map((planType) => {
                  const plan = PLANS[planType]
                  const isSelected = formData.planType === planType
                  return (
                    <button
                      key={planType}
                      type="button"
                      onClick={() => handlePlanChange(planType)}
                      className={`rounded-xl border-2 p-4 text-left transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <p className="text-2xl font-bold">{formatEur(plan.total)}</p>
                      <p className="text-xs text-gray-400">≈{formatUsd(eurToUsd(plan.total))} USD</p>
                      <p className="font-semibold mt-2">{plan.label}</p>
                      <p className="mt-1 text-xs text-gray-500">{plan.testers} testers • €{plan.payment.toFixed(2)} each</p>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* App Information */}
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
                <Label htmlFor="appDescription">
                  App Description *
                  <span className="text-xs text-gray-400 font-normal ml-2">
                    ({formData.appDescription.length} / 100+ characters)
                  </span>
                </Label>
                <Textarea
                  id="appDescription"
                  placeholder="My app is a budget tracker for freelancers. Testers should focus on: 1) Does the signup flow work? 2) Can you add and delete expenses? 3) Does the export to PDF feature crash? 4) Any confusing UI on small screens?"
                  rows={5}
                  value={formData.appDescription}
                  onChange={(e) => handleChange('appDescription', e.target.value)}
                  required
                  minLength={100}
                  className={formData.appDescription.length > 0 && formData.appDescription.length < 100 ? 'border-red-300 focus:border-red-500' : ''}
                />
                <p className="text-xs text-gray-500">
                  Be specific — testers need to know what features to try. The more detail you give, the better feedback you get.
                </p>
                {formData.appDescription.length > 0 && formData.appDescription.length < 100 && (
                  <p className="text-xs text-red-600">
                    Please write at least 100 characters. Current: {formData.appDescription.length}
                  </p>
                )}
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

          {/* Testing Requirements — Locked to Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Testing Requirements</CardTitle>
              <CardDescription>Locked to your selected plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="testersNeeded">Number of Testers</Label>
                  <Input
                    id="testersNeeded"
                    type="number"
                    value={formData.testersNeeded}
                    disabled
                    className="bg-gray-50 text-gray-600"
                  />
                  <p className="text-xs text-gray-500">
                    {currentPlan.label} plan includes {currentPlan.testers} testers.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testDuration">Test Duration (days)</Label>
                  <Input
                    id="testDuration"
                    type="number"
                    value={formData.testDuration}
                    disabled
                    className="bg-gray-50 text-gray-600"
                  />
                  <p className="text-xs text-gray-500">All plans require 14 days minimum</p>
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

          {/* Tester Payment — Display Only */}
          <Card>
            <CardHeader>
              <CardTitle>Tester Payment</CardTitle>
              <CardDescription>What testers earn for completing this test</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-blue-600">€{currentPlan.payment.toFixed(2)}</span>
                <span className="text-gray-500">per tester</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Each of the {currentPlan.testers} testers receives €{currentPlan.payment.toFixed(2)} after completing the full 14-day period.
                Total tester payout: {formatEur(testerTotal)}.
              </p>
            </CardContent>
          </Card>

          {/* Daily Missions */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Missions</CardTitle>
              <CardDescription>
                Assign one task per day for your testers to complete. This proves structured engagement
                to Google Play and gives you actionable feedback every day.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskTemplateSelector
                selectedTemplate={formData.taskTemplate}
                customTasks={formData.customTasks}
                onTemplateSelect={(key) => handleChange('taskTemplate', key)}
                onCustomTasksChange={(tasks) =>
                  setFormData((prev) => ({ ...prev, customTasks: tasks }))
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* Cost Summary Sidebar */}
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
                  <span className="text-gray-600">Plan</span>
                  <span className="font-medium">{currentPlan.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Testers</span>
                  <span className="font-medium">{currentPlan.testers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment per tester</span>
                  <span className="font-medium">€{currentPlan.payment.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Test duration</span>
                  <span className="font-medium">14 days</span>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tester payments</span>
                    <span className="font-medium">{formatEur(testerTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Platform fee</span>
                    <span className="font-medium">{formatEur(currentPlan.fee)}</span>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-lg font-semibold">Total</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-blue-600">{formatEur(currentPlan.total)}</span>
                      <p className="text-xs text-gray-400">≈{formatUsd(usdApprox)} USD</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-lg bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900">What&apos;s Included:</p>
                <ul className="space-y-1 text-xs text-blue-700">
                  {currentPlan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <Button onClick={handleSubmit} className="w-full" size="lg" disabled={loading || formData.appDescription.length < 100}>
                {loading ? 'Creating Job...' : 'Create Testing Job'}
              </Button>

              <p className="text-center text-xs text-gray-500">
                Job will be saved as draft. Complete payment on the next screen, then publish it.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}