// components/tester/daily-mission-card.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, Loader2, Image } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DailyMissionCardProps {
  dayNumber: number
  totalDays: number
  taskText: string
  isCompleted: boolean
  existingContent?: string | null
  jobName?: string
  onSubmit: (content: string, screenshotUrl?: string) => Promise<void>
}

export function DailyMissionCard({
  dayNumber,
  totalDays,
  taskText,
  isCompleted,
  existingContent,
  jobName,
  onSubmit,
}: DailyMissionCardProps) {
  const [content, setContent] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (content.trim().length < 10) return
    setError('')
    setLoading(true)
    try {
      await onSubmit(content.trim(), screenshotUrl.trim() || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (isCompleted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-3" />
          <p className="font-semibold text-green-800">Day {dayNumber} mission complete!</p>
          <p className="text-sm text-green-600 mt-1">Come back tomorrow for Day {Math.min(dayNumber + 1, totalDays)}.</p>
          {existingContent && (
            <div className="mt-4 text-left bg-white rounded-lg p-3 border border-green-200">
              <p className="text-xs text-gray-500 mb-1">Your feedback:</p>
              <p className="text-sm text-gray-700 leading-relaxed">{existingContent}</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200 shadow-sm">
      <CardHeader className="bg-blue-50/50 border-b border-blue-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            Mission {dayNumber} / {totalDays}
          </CardTitle>
          <div className="flex items-center gap-2">
            {jobName && (
              <span className="text-xs text-gray-500 hidden sm:block truncate max-w-[160px]">
                {jobName}
              </span>
            )}
            <Badge variant="secondary" className="bg-white text-xs">
              Today
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Task description */}
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Your task
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">{taskText}</p>
        </div>

        {/* Feedback textarea */}
        <div className="space-y-1.5">
          <Label htmlFor="mission-content" className="text-sm font-medium">
            Feedback / What you did
          </Label>
          <Textarea
            id="mission-content"
            placeholder="Describe what you tested, any bugs you found, confusing UI, or crashes. Be specific — the developer needs proof you used the app."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Be specific — the developer needs proof you used the app.
            </p>
            <p
              className={`text-xs font-medium ${
                content.trim().length < 10 ? 'text-red-500' : 'text-green-600'
              }`}
            >
              {content.trim().length} chars{content.trim().length < 10 && ' (min 10)'}
            </p>
          </div>
        </div>

        {/* Optional screenshot URL */}
        <div className="space-y-1.5">
          <Label htmlFor="screenshot-url" className="text-sm font-medium flex items-center gap-1.5">
            <Image className="h-3.5 w-3.5" />
            Screenshot URL
            <span className="font-normal text-gray-400">(optional)</span>
          </Label>
          <Input
            id="screenshot-url"
            type="url"
            placeholder="https://imgur.com/... or Google Drive link"
            value={screenshotUrl}
            onChange={(e) => setScreenshotUrl(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={content.trim().length < 10 || loading}
          className="w-full"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          {loading ? 'Submitting...' : 'Complete Mission'}
        </Button>
      </CardContent>
    </Card>
  )
}
