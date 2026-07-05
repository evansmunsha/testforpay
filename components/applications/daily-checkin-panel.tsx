'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, AlertCircle, Send, MessageSquare } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface CheckIn {
  id: string
  dayNumber: number
  message: string
  usedApp: boolean
  issuesFound: boolean
  issueDetails: string | null
  devAcknowledged: boolean
  devAcknowledgedAt: string | null
  devNote: string | null
  createdAt: string
  tester: { id: string; name: string | null; email: string }
}

interface DailyCheckInPanelProps {
  applicationId: string
  applicationStatus: string
  testingStartDate: string | null
  /** if true, this panel is shown to the developer (read-only + acknowledge) */
  isDeveloperView?: boolean
}

export function DailyCheckInPanel({
  applicationId,
  applicationStatus,
  testingStartDate,
  isDeveloperView = false,
}: DailyCheckInPanelProps) {
  const { user } = useAuth()
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [acknowledging, setAcknowledging] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [issuesFound, setIssuesFound] = useState(false)
  const [issueDetails, setIssueDetails] = useState('')
  const [usedApp, setUsedApp] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [devNotes, setDevNotes] = useState<Record<string, string>>({})

  const canCheckIn = ['TESTING', 'COMPLETED'].includes(applicationStatus) && !isDeveloperView

  // Calculate today's day number
  const todayDayNumber = testingStartDate
    ? Math.max(1, Math.ceil((Date.now() - new Date(testingStartDate).getTime()) / (1000 * 60 * 60 * 24)))
    : null

  const alreadyCheckedInToday = todayDayNumber !== null &&
    checkIns.some(c => c.dayNumber === todayDayNumber)

  useEffect(() => {
    fetchCheckIns()
  }, [applicationId])

  const fetchCheckIns = async () => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/checkin`)
      const data = await res.json()
      if (res.ok) setCheckIns(data.checkIns || [])
    } catch (e) {
      console.error('Failed to fetch check-ins:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    if (message.trim().length < 10) {
      setError('Please write at least 10 characters describing what you did today.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          usedApp,
          issuesFound,
          issueDetails: issuesFound ? issueDetails.trim() : '',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to submit check-in')
        return
      }
      setSuccess(`Day ${data.checkIn.dayNumber} check-in submitted! The developer has been notified.`)
      setMessage('')
      setIssuesFound(false)
      setIssueDetails('')
      setUsedApp(true)
      fetchCheckIns()
    } catch (e) {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAcknowledge = async (checkInId: string) => {
    setAcknowledging(checkInId)
    try {
      const res = await fetch(`/api/applications/${applicationId}/checkin/${checkInId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devNote: devNotes[checkInId] || '' }),
      })
      if (res.ok) {
        fetchCheckIns()
        setDevNotes(prev => { const n = { ...prev }; delete n[checkInId]; return n })
      }
    } catch (e) {
      console.error('Failed to acknowledge:', e)
    } finally {
      setAcknowledging(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-gray-400">
          <Clock className="h-5 w-5 mx-auto mb-2 animate-pulse" />
          Loading check-ins...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Submit panel — tester only, during testing */}
      {canCheckIn && (
        <Card className={alreadyCheckedInToday ? 'border-green-200 bg-green-50' : 'border-blue-200'}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              {alreadyCheckedInToday
                ? `Day ${todayDayNumber} check-in submitted ✓`
                : `Submit Day ${todayDayNumber ?? '?'} Check-in`}
            </CardTitle>
            <CardDescription>
              {alreadyCheckedInToday
                ? "You've already checked in today. Come back tomorrow."
                : "Tell the developer what you did with the app today. This keeps your job active and builds trust."}
            </CardDescription>
          </CardHeader>
          {!alreadyCheckedInToday && (
            <CardContent className="space-y-3">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
              {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{success}</p>}

              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="e.g. Tested the login screen, payment flow, and settings. Everything worked smoothly. The checkout took a bit long to load."
                rows={3}
                className="resize-none"
              />

              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usedApp}
                    onChange={e => setUsedApp(e.target.checked)}
                    className="h-4 w-4"
                  />
                  I used the app today
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={issuesFound}
                    onChange={e => setIssuesFound(e.target.checked)}
                    className="h-4 w-4"
                  />
                  I found an issue or bug
                </label>
              </div>

              {issuesFound && (
                <Textarea
                  value={issueDetails}
                  onChange={e => setIssueDetails(e.target.value)}
                  placeholder="Describe the issue briefly..."
                  rows={2}
                  className="resize-none"
                />
              )}

              <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Submitting...' : 'Submit Check-in'}
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Check-in history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Check-in History
            <Badge variant="secondary" className="ml-1">{checkIns.length}</Badge>
          </CardTitle>
          <CardDescription>
            {isDeveloperView
              ? 'Daily updates from your tester during the testing period'
              : 'Your daily updates sent to the developer'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checkIns.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No check-ins yet.
              {!isDeveloperView && canCheckIn && ' Submit your first one above.'}
            </div>
          ) : (
            <div className="space-y-3">
              {[...checkIns].reverse().map(c => (
                <div
                  key={c.id}
                  className={`rounded-lg border p-3 space-y-2 text-sm ${
                    c.issuesFound ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Day {c.dayNumber}</Badge>
                      {c.usedApp && <Badge variant="secondary" className="text-xs">Used app ✓</Badge>}
                      {c.issuesFound && (
                        <Badge variant="destructive" className="text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />Bug found
                        </Badge>
                      )}
                      {c.devAcknowledged && (
                        <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                          Acknowledged ✓
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>

                  <p className="text-gray-700">{c.message}</p>

                  {c.issueDetails && (
                    <div className="rounded bg-orange-100 border border-orange-200 p-2 text-xs text-orange-800">
                      <span className="font-medium">Issue: </span>{c.issueDetails}
                    </div>
                  )}

                  {c.devNote && (
                    <div className="rounded bg-blue-50 border border-blue-200 p-2 text-xs text-blue-800">
                      <span className="font-medium">Developer note: </span>{c.devNote}
                    </div>
                  )}

                  {/* Developer acknowledge UI */}
                  {isDeveloperView && !c.devAcknowledged && (
                    <div className="space-y-2 pt-1 border-t border-gray-200">
                      <Textarea
                        value={devNotes[c.id] || ''}
                        onChange={e => setDevNotes(prev => ({ ...prev, [c.id]: e.target.value }))}
                        placeholder="Optional note back to tester (max 300 chars)..."
                        rows={2}
                        className="resize-none text-xs"
                        maxLength={300}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcknowledge(c.id)}
                        disabled={acknowledging === c.id}
                      >
                        {acknowledging === c.id ? 'Acknowledging...' : 'Acknowledge'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
