'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Bug,
  Lightbulb,
  MessageSquare,
  Copy,
  Mail,
} from 'lucide-react'

interface TesterOnboardingProps {
  jobId: string
  appName: string
  testDuration: number
  applicationId: string
  testerEmail?: string
}

export function TesterOnboarding({
  jobId,
  appName,
  testDuration,
  applicationId,
  testerEmail,
}: TesterOnboardingProps) {
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const onboardingGuidelines = `
TESTING GUIDELINES FOR ${appName.toUpperCase()}

👋 Thank you for becoming a beta tester!

📋 YOUR TESTING PERIOD
• Duration: ${testDuration} days
• Status: ACTIVE
• Please use the app during your regular daily activities

🎯 WHAT TO TEST
1. Core Features - Use all main features of the app
2. User Experience - Is the app easy to use?
3. Performance - Does it run smoothly?
4. Stability - Any crashes or errors?
5. Design - Is the UI/UX clear and appealing?

🐛 REPORTING BUGS
When you find a bug:
• Note what you were doing
• Describe what happened unexpectedly
• Include error messages if shown
• Rate the severity (critical/high/medium/low)
• Provide steps to reproduce

💡 SHARING FEEDBACK
We're looking for:
• First impressions - What's your initial reaction?
• Feature suggestions - What would improve the app?
• Crashes/errors - Any technical issues?
• Performance - Lag, battery drain, memory issues?
• Positive feedback - What do you love?

⏰ SUBMISSION REQUIREMENTS
• Keep the app installed for the full ${testDuration}-day period
• Use the app at least 2-3 times during the testing period
• Submit your feedback through the app feedback form
• Check back after 14 days for final feedback

📝 FEEDBACK FORM
• Submit detailed feedback after testing
• Use the star rating (1-5 stars)
• Include specific examples and details
• Your feedback directly impacts the app's success!

✅ COMPLIANCE REMINDER
• Must remain opted-in for at least 14 days continuously
• Uninstalling or opting out early may disqualify you
• Your honest feedback helps us improve!

Thank you for testing with us! 🙏
  `.trim()

  const handleCopyGuidelines = () => {
    navigator.clipboard.writeText(onboardingGuidelines)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendEmail = async () => {
    try {
      setSending(true)
      const res = await fetch(`/api/applications/${applicationId}/send-onboarding`, {
        method: 'POST',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to send email')
      }

      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch (error) {
      console.error('Failed to send email:', error)
    } finally {
      setSending(false)
    }
  }

  const testingTips = [
    {
      icon: CheckCircle,
      title: 'Install & Launch',
      description: 'Download the app and open it. We track when you first launch.',
      color: 'blue',
    },
    {
      icon: Bug,
      title: 'Look for Issues',
      description: 'Use all features. Report any crashes, bugs, or unusual behavior.',
      color: 'red',
    },
    {
      icon: Lightbulb,
      title: 'Suggest Improvements',
      description: 'Think about how the app could be better. Your ideas matter!',
      color: 'yellow',
    },
    {
      icon: MessageSquare,
      title: 'Submit Feedback',
      description: 'Share your thoughts via the feedback form in the app.',
      color: 'green',
    },
    {
      icon: Clock,
      title: 'Stay Active',
      description: `Use the app regularly throughout the ${testDuration}-day testing period.`,
      color: 'purple',
    },
    {
      icon: AlertCircle,
      title: 'Stay Opted In',
      description: `Don't uninstall or opt out for the full ${testDuration} days.`,
      color: 'orange',
    },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
  }

  const iconColorMap: Record<string, string> = {
    blue: 'text-blue-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Tester Onboarding Instructions
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Share these guidelines with your testers to help them provide quality feedback
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleCopyGuidelines}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Copied!' : 'Copy Guidelines'}
        </Button>
        <Button
          onClick={handleSendEmail}
          className="flex items-center gap-2"
          disabled={sending || !testerEmail}
        >
          <Mail className="w-4 h-4" />
          {sent ? 'Email Sent!' : sending ? 'Sending...' : 'Send via Email'}
        </Button>
      </div>

      {/* Testing Tips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testingTips.map((tip, index) => {
          const Icon = tip.icon
          return (
            <Card
              key={index}
              className={`p-4 border-2 ${colorMap[tip.color]}`}
            >
              <div className="flex gap-3">
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColorMap[tip.color]}`} />
                <div>
                  <h4 className="font-semibold text-sm">{tip.title}</h4>
                  <p className="text-xs mt-1 opacity-85">{tip.description}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Guidelines Box */}
      <Card className="p-6 border-gray-300 bg-gray-50">
        <h4 className="font-semibold text-gray-900 mb-3">Complete Testing Guidelines</h4>
        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto bg-white p-3 rounded border border-gray-200">
          {onboardingGuidelines}
        </pre>
      </Card>

      {/* Key Reminders */}
      <Card className="p-4 border-2 border-amber-200 bg-amber-50">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900 text-sm mb-2">Important Reminders</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>✓ Testers must remain opted-in for at least 14 days continuously</li>
              <li>✓ Uninstalling or opting out early may disqualify them</li>
              <li>✓ We track engagement: app launches, features used, sessions</li>
              <li>✓ Honest, detailed feedback is more valuable than quantity</li>
              <li>✓ Feedback directly impacts your app's improvement</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Engagement Tracking Info */}
      <Card className="p-4 border-2 border-blue-200 bg-blue-50">
        <div className="flex gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 text-sm mb-2">Automatic Engagement Tracking</h4>
            <p className="text-sm text-blue-800 mb-2">
              We automatically track:
            </p>
            <ul className="text-sm text-blue-800 space-y-1 ml-4">
              <li>🚀 App launches</li>
              <li>⚙️ Features used</li>
              <li>⏱️ Session duration</li>
              <li>📊 Testing activity over time</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Share Status */}
      <p className="text-xs text-gray-500 text-center">
        These guidelines help ensure quality feedback and Google Play compliance
      </p>
    </div>
  )
}
