'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Star, Send, CheckCircle } from 'lucide-react'

interface FeedbackFormProps {
  applicationId: string
  appName: string
  existingFeedback?: string
  existingRating?: number
  existingDeveloperReply?: string
  existingDeveloperReplyAt?: string
  existingTesterFollowup?: string
  existingTesterFollowupAt?: string
  onSubmit?: () => void
}

export function FeedbackForm({
  applicationId,
  appName,
  existingFeedback,
  existingRating,
  existingDeveloperReply,
  existingDeveloperReplyAt,
  existingTesterFollowup,
  existingTesterFollowupAt,
  onSubmit,
}: FeedbackFormProps) {
  const [positiveNotes, setPositiveNotes] = useState('')
  const [issuesFound, setIssuesFound] = useState('')
  const [improvementIdeas, setImprovementIdeas] = useState('')
  const [rating, setRating] = useState(existingRating || 0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('harassment')
  const [reportDetails, setReportDetails] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportMessage, setReportMessage] = useState('')
  const [followupText, setFollowupText] = useState('')
  const [followupLoading, setFollowupLoading] = useState(false)
  const [followupMessage, setFollowupMessage] = useState('')

  const combinedFeedback = [
    `What I liked:\n${positiveNotes.trim()}`,
    `Problems or bugs:\n${issuesFound.trim()}`,
    `Suggestions:\n${improvementIdeas.trim()}`,
  ].join('\n\n')
  const displayFeedback = existingFeedback || (success ? combinedFeedback : '')

  const handleSubmit = async () => {
    if (positiveNotes.trim().length < 5 || issuesFound.trim().length < 5 || improvementIdeas.trim().length < 5) {
      setError('Please fill all three sections (at least 5 characters each)')
      return
    }

    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/applications/${applicationId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: combinedFeedback.trim(), rating }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        onSubmit?.()
      } else {
        setError(data.error || 'Failed to submit feedback')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReport = async () => {
    setReportMessage('')
    try {
      setReportLoading(true)
      const res = await fetch(`/api/applications/${applicationId}/feedback-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reportReason,
          details: reportDetails.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setReportMessage(data.error || 'Failed to submit report')
        return
      }
      setReportMessage('Report submitted. Thank you.')
      setShowReport(false)
      setReportDetails('')
    } catch (error) {
      setReportMessage('Something went wrong. Please try again.')
    } finally {
      setReportLoading(false)
    }
  }

  const handleFollowup = async () => {
    setFollowupMessage('')
    const trimmed = followupText.trim()
    if (trimmed.length < 5) {
      setFollowupMessage('Please write at least 5 characters.')
      return
    }
    if (trimmed.length > 500) {
      setFollowupMessage('Follow-up must be 500 characters or less.')
      return
    }
    try {
      setFollowupLoading(true)
      const res = await fetch(`/api/applications/${applicationId}/feedback-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFollowupMessage(data.error || 'Failed to send follow-up')
        return
      }
      setFollowupMessage('Follow-up sent.')
      setFollowupText('')
      onSubmit?.()
    } catch (error) {
      setFollowupMessage('Something went wrong. Please try again.')
    } finally {
      setFollowupLoading(false)
    }
  }

  if (success || existingFeedback) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Feedback submitted!</p>
              <p className="text-sm text-green-600">Thank you for your feedback.</p>
            </div>
          </div>
          {displayFeedback && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= (existingRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{displayFeedback}</p>
            </div>
          )}
          {existingDeveloperReply && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-1">Developer reply</p>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">{existingDeveloperReply}</p>
              {existingDeveloperReplyAt && (
                <p className="text-xs text-blue-700 mt-2">
                  Sent {new Date(existingDeveloperReplyAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
          {existingDeveloperReply && (
            <div className="mt-3">
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() => setShowReport(!showReport)}
              >
                {showReport ? 'Cancel report' : 'Report this reply'}
              </button>
              {reportMessage && (
                <p className="text-xs text-gray-600 mt-1">{reportMessage}</p>
              )}
              {showReport && (
                <div className="mt-2 p-3 border border-red-200 rounded-lg bg-red-50 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-red-900 mb-1">
                      Reason
                    </label>
                    <select
                      className="w-full rounded border border-red-200 bg-white p-2 text-xs"
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                    >
                      <option value="harassment">Harassment or abuse</option>
                      <option value="spam">Spam</option>
                      <option value="unsafe">Unsafe content</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-red-900 mb-1">
                      Details (optional)
                    </label>
                    <Textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      rows={2}
                      className="resize-none"
                      placeholder="Add any context..."
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleReport}
                    disabled={reportLoading}
                  >
                    {reportLoading ? 'Sending...' : 'Submit report'}
                  </Button>
                </div>
              )}
            </div>
          )}
          {existingDeveloperReply && (
            <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
              <p className="text-sm font-semibold text-amber-900 mb-1">Your follow-up</p>
              {existingTesterFollowup ? (
                <>
                  <p className="text-sm text-amber-800 whitespace-pre-wrap">{existingTesterFollowup}</p>
                  {existingTesterFollowupAt && (
                    <p className="text-xs text-amber-700 mt-2">
                      Sent {new Date(existingTesterFollowupAt).toLocaleDateString()}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs text-amber-700 mb-2">
                    You can send one follow-up message to clarify or add details.
                  </p>
                  {followupMessage && (
                    <p className="text-xs text-gray-600 mb-2">{followupMessage}</p>
                  )}
                  <Textarea
                    value={followupText}
                    onChange={(e) => setFollowupText(e.target.value)}
                    rows={3}
                    className="resize-none"
                    placeholder="Add clarification or extra details..."
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">{followupText.length}/500</span>
                    <Button
                      size="sm"
                      onClick={handleFollowup}
                      disabled={followupLoading}
                    >
                      {followupLoading ? 'Sending...' : 'Send follow-up'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Leave Feedback</CardTitle>
        <CardDescription>
          Share your experience testing "{appName}" with the developer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition"
              >
                <Star
                  className={`h-8 w-8 transition ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300 hover:text-yellow-200'
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-500">
              {rating > 0 && (
                <>
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Structured Feedback */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What did you like?
          </label>
          <Textarea
            value={positiveNotes}
            onChange={(e) => setPositiveNotes(e.target.value)}
            placeholder="Example: Clean design, easy signup, fast loading..."
            rows={3}
            className="resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What was confusing or broken?
          </label>
          <Textarea
            value={issuesFound}
            onChange={(e) => setIssuesFound(e.target.value)}
            placeholder="Example: Button did nothing on step 2, crash on profile screen..."
            rows={3}
            className="resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            One suggestion to improve
          </label>
          <Textarea
            value={improvementIdeas}
            onChange={(e) => setImprovementIdeas(e.target.value)}
            placeholder="Example: Add search, clearer error messages, smaller onboarding..."
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Total {combinedFeedback.length} characters
          </p>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <p className="text-sm font-medium text-blue-800 mb-1">Why this structure helps:</p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Developers can scan feedback faster</li>
            <li>• Clear bugs are easier to fix</li>
            <li>• Suggestions guide product decisions</li>
          </ul>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            'Submitting...'
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Feedback
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
