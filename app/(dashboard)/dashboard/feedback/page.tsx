'use client'

import { FeedbackForm } from '@/components/feedback/feedback-form'

export default function DashboardFeedbackPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Share Feedback</h2>
        <p className="text-gray-600 mt-1">
          Help us improve TestForPay. Approved feedback can appear on the landing page.
        </p>
      </div>
      <FeedbackForm />
    </div>
  )
}
