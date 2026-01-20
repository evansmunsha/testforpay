'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, DollarSign } from 'lucide-react'

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

export function JobForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<JobFormData>({
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
  })

  const totalBudget = formData.paymentPerTester * formData.testersNeeded
  const platformFee = totalBudget * 0.15
  const totalCost = totalBudget + platformFee

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

      if (data.requiresPayment && data.paymentUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.paymentUrl
        return
      }

      // Redirect to job details page if no payment required (shouldn't happen with current logic)
      router.push(`/dashboard/jobs/${data.jobId}`)
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  // Minimum requirements (12 testers is Google Play minimum for some apps)
  const MIN_TESTERS = 12
  const RECOMMENDED_TESTERS = 20
  const MIN_DURATION = 14
  const MIN_PAYMENT = 5

  const handlePlanChange = (plan: 'STARTER' | 'PROFESSIONAL' | 'CUSTOM') => {
    if (plan === 'STARTER') {
      setFormData(prev => ({
        ...prev,
        planType: 'STARTER',
        testersNeeded: 20,
        paymentPerTester: 7.5, // 150 / 20
      }))
    } else if (plan === 'PROFESSIONAL') {
      setFormData(prev => ({
        ...prev,
        planType: 'PROFESSIONAL',
        testersNeeded: 35,
        paymentPerTester: 7.14, // 250 / 35 approx
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        planType: 'CUSTOM',
      }))
    }
  }

  const handleChange = (field: keyof JobFormData, value: string | number) => {
    // Auto-switch to CUSTOM plan when user manually changes values
    if (field === 'testersNeeded' || field === 'paymentPerTester' || field === 'testDuration') {
      setFormData(prev => ({ ...prev, [field]: value, planType: 'CUSTOM' }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Choose a Plan</CardTitle>
              <CardDescription>Select the best testing plan for your app</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => handlePlanChange('STARTER')}
                  className={`p-4 rounded-xl border-2 text-left transition ${
                    formData.planType === 'STARTER'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <p className="font-bold text-lg">$150</p>
                  <p className="font-semibold">Starter</p>
                  <p className="text-xs text-gray-500 mt-1">20 Verified Testers</p>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlanChange('PROFESSIONAL')}
                  className={`p-4 rounded-xl border-2 text-left transition ${
                    formData.planType === 'PROFESSIONAL'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <p className="font-bold text-lg">$250</p>
                  <p className="font-semibold">Professional</p>
                  <p className="text-xs text-gray-500 mt-1">35 Verified Testers</p>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlanChange('CUSTOM')}
                  className={`p-4 rounded-xl border-2 text-left transition ${
                    formData.planType === 'CUSTOM'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <p className="font-bold text-lg">Custom</p>
                  <p className="font-semibold">Flexible</p>
                  <p className="text-xs text-gray-500 mt-1">Set your own rates</p>
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

              <div className="grid md:grid-cols-2 gap-4">
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
                      <SelectItem value="health">Health & Fitness</SelectItem>
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
                  Testers will use this link to opt-in to your closed test
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
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="testersNeeded">Number of Testers *</Label>
                  <Input
                    id="testersNeeded"
                    type="number"
                    min={MIN_TESTERS}
                    max="500"
                    value={formData.testersNeeded}
                    onChange={(e) => handleChange('testersNeeded', Math.max(MIN_TESTERS, parseInt(e.target.value) || MIN_TESTERS))}
                    required
                  />
                  <p className="text-xs text-gray-500">Minimum {MIN_TESTERS} testers. Recommended: {RECOMMENDED_TESTERS}+</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testDuration">Test Duration (days) *</Label>
                  <Input
                    id="testDuration"
                    type="number"
                    min={MIN_DURATION}
                    max="90"
                    value={formData.testDuration}
                    onChange={(e) => handleChange('testDuration', Math.max(MIN_DURATION, parseInt(e.target.value) || MIN_DURATION))}
                    required
                  />
                  <p className="text-xs text-gray-500">Minimum {MIN_DURATION} days (Google Play requirement)</p>
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
              <CardDescription>Set your payment per tester</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentPerTester">Payment Per Tester (USD) *</Label>
                <Input
                  id="paymentPerTester"
                  type="number"
                  min={MIN_PAYMENT}
                  max="100"
                  step="0.50"
                  value={formData.paymentPerTester}
                  onChange={(e) => handleChange('paymentPerTester', Math.max(MIN_PAYMENT, parseFloat(e.target.value) || MIN_PAYMENT))}
                  required
                />
                <p className="text-xs text-gray-500">
                  Minimum ${MIN_PAYMENT}. Higher payments attract more testers faster.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Card */}
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
                  <span className="font-medium">${formData.paymentPerTester.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Test duration</span>
                  <span className="font-medium">{formData.testDuration} days</span>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tester payments</span>
                    <span className="font-medium">${totalBudget.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Platform fee (15%)</span>
                    <span className="font-medium">${platformFee.toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-lg">Total Cost</span>
                    <span className="font-bold text-2xl text-blue-600">
                      ${totalCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium text-blue-900">What's Included:</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>✓ {formData.testersNeeded} verified testers</li>
                  <li>✓ {formData.testDuration}-day testing period</li>
                  <li>✓ Google Play opt-in verification</li>
                  <li>✓ Basic feedback from testers</li>
                  <li>✓ Real-time progress tracking</li>
                </ul>
              </div>

              <Button 
                onClick={handleSubmit}
                className="w-full" 
                size="lg"
                disabled={loading}
              >
                {loading ? 'Creating Job...' : 'Create Testing Job'}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Job will be saved as draft. You can publish it later.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}