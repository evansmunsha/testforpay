'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Star } from 'lucide-react'

interface FeedbackFormProps {
  onSuccess?: () => void
}

export function FeedbackForm({ onSuccess }: FeedbackFormProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [userType, setUserType] = useState<'developer' | 'tester'>('tester')
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [companyName, setCompanyName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: userType,
          rating,
          title,
          message,
          displayName: displayName || undefined,
          companyName: companyName || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to submit feedback')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTitle('')
      setMessage('')
      setRating(5)
      setDisplayName('')
      setCompanyName('')
      
      onSuccess?.()

      // Reset success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share Your Feedback</CardTitle>
        <CardDescription>Help us improve TestForPay. Your feedback is valuable.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 p-4 rounded-lg flex items-start gap-3">
              <CheckCircle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-medium">Thank you!</p>
                <p className="text-sm">Your feedback has been submitted. We'll review it shortly.</p>
              </div>
            </div>
          )}

          {/* User Type */}
          <div className="space-y-2">
            <Label>I am a:</Label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setUserType('developer')}
                className={`px-6 py-3 rounded-lg border-2 font-semibold transition ${
                  userType === 'developer'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                Developer
              </button>
              <button
                type="button"
                onClick={() => setUserType('tester')}
                className={`px-6 py-3 rounded-lg border-2 font-semibold transition ${
                  userType === 'tester'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                Tester
              </button>
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Rating (1-5 stars)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-2 rounded-lg transition ${
                    star <= rating
                      ? 'text-yellow-400 bg-yellow-50'
                      : 'text-gray-300 hover:text-gray-400'
                  }`}
                >
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500">{rating} out of 5 stars</p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Feedback Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Great experience, Fast turnaround, Easy to use"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={5}
              maxLength={100}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Your Feedback *</Label>
            <Textarea
              id="message"
              placeholder="Tell us what you think about TestForPay..."
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              minLength={10}
              maxLength={1000}
            />
            <p className="text-xs text-gray-500">{message.length}/1000 characters</p>
          </div>

          {/* Display Name (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name (Optional)</Label>
            <Input
              id="displayName"
              placeholder="How should we credit you? (e.g., John D., Anonymous)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
            />
            <p className="text-xs text-gray-500">If empty, your account name will be used</p>
          </div>

          {/* Company Name (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="companyName">Company/App Name (Optional)</Label>
            <Input
              id="companyName"
              placeholder="e.g., Acme Corp, MyApp Inc"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              maxLength={50}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
