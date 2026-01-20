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
  onSubmit?: () => void
}

export function FeedbackForm({
  applicationId,
  appName,
  existingFeedback,
  existingRating,
  onSubmit,
}: FeedbackFormProps) {
  const [feedback, setFeedback] = useState(existingFeedback || '')
  const [rating, setRating] = useState(existingRating || 0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!feedback || feedback.trim().length < 10) {
      setError('Please write at least 10 characters of feedback')
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
        body: JSON.stringify({ feedback: feedback.trim(), rating }),
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
          {(existingFeedback || feedback) && (
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
              <p className="text-sm text-gray-700">{existingFeedback || feedback}</p>
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

        {/* Feedback Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Feedback
          </label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your experience with this app. What worked well? Any bugs or issues? Suggestions for improvement?"
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            {feedback.length}/500 characters (minimum 10)
          </p>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <p className="text-sm font-medium text-blue-800 mb-1">Good feedback includes:</p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• First impressions of the app</li>
            <li>• Any bugs or crashes you encountered</li>
            <li>• Features you liked or disliked</li>
            <li>• Suggestions for improvement</li>
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
