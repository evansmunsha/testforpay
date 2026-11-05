'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Calendar,
  Smartphone,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  TrendingUp,
} from 'lucide-react'
import { getEngagementBadgeColor, getEngagementLevel } from '@/lib/engagement-scoring'

interface ApplicationCardProps {
  application: {
    id: string
    status: string
    createdAt: string
    testingStartDate: string | null
    testingEndDate: string | null
    testingPausedAt?: string | null
    verificationImage: string | null
    verificationImage2?: string | null
    feedback: string | null
    rating: number | null
    engagementScore?: number | null
    feedbackSubmittedAt?: string | null
    developerReply?: string | null
    developerReplyAt?: string | null
    testerFollowupReply?: string | null
    testerFollowupAt?: string | null
    tester: {
      id: string
      name: string | null
      email?: string
      muteDeveloperReplies?: boolean
      createdAt: string
      deviceInfo: {
        deviceModel: string
        androidVersion: string
        screenSize: string | null
      } | null
    }
  }
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onVerify?: (id: string) => void
  loading?: boolean
  testerColorIndex?: number
}

export function ApplicationCard({
  application,
  onApprove,
  onReject,
  onVerify,
  loading = false,
  testerColorIndex = 0,
}: ApplicationCardProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [engagementScore, setEngagementScore] = useState<number | null>(application.engagementScore || null)
  const [loadingScore, setLoadingScore] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyError, setReplyError] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [developerReply, setDeveloperReply] = useState<string | null>(application.developerReply || null)
  const [developerReplyAt, setDeveloperReplyAt] = useState<string | null>(application.developerReplyAt || null)

  useEffect(() => {
    if (application.feedback && engagementScore === null && application.status === 'COMPLETED') {
      calculateScore()
    }
  }, [application.feedback, application.status, engagementScore])

  const calculateScore = async () => {
    try {
      setLoadingScore(true)
      const res = await fetch(`/api/applications/${application.id}/engagement-score`, {
        method: 'POST',
      })
      
      if (res.ok) {
        const data = await res.json()
        setEngagementScore(data.engagementScore)
      }
    } catch (error) {
      console.error('Failed to calculate engagement score:', error)
    } finally {
      setLoadingScore(false)
    }
  }

  const handleReplySubmit = async () => {
    setReplyError('')
    if (repliesMuted) {
      setReplyError('Tester has muted developer replies')
      return
    }
    const trimmed = replyText.trim()
    if (trimmed.length < 5) {
      setReplyError('Please write at least 5 characters')
      return
    }
    if (trimmed.length > 500) {
      setReplyError('Reply must be 500 characters or less')
      return
    }
    try {
      setReplyLoading(true)
      const res = await fetch(`/api/applications/${application.id}/feedback-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setReplyError(data.error || 'Failed to send reply')
        return
      }
      setDeveloperReply((current) =>
        current
          ? `${current}\n\nDeveloper reply (${new Date().toLocaleDateString()}):\n${trimmed}`
          : trimmed
      )
      setDeveloperReplyAt(new Date().toISOString())
      setReplyText('')
    } catch (error) {
      console.error('Failed to send developer reply:', error)
      setReplyError('Something went wrong. Please try again.')
    } finally {
      setReplyLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED': return 'bg-blue-100 text-blue-800'
      case 'OPTED_IN': return 'bg-indigo-100 text-indigo-800'
      case 'VERIFIED': return 'bg-green-100 text-green-800'
      case 'TESTING': return 'bg-purple-100 text-purple-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const accountCreatedAt = new Date(application.tester.createdAt).getTime()
  const accountAge = Number.isFinite(accountCreatedAt)
    ? Math.max(0, Math.floor((Date.now() - accountCreatedAt) / (1000 * 60 * 60 * 24)))
    : null
  const applicationCreatedAt = new Date(application.createdAt)
  const appliedDate = Number.isNaN(applicationCreatedAt.getTime())
    ? 'Unavailable'
    : applicationCreatedAt.toLocaleDateString()
  const testerHue = (testerColorIndex * 137.508) % 360
  const testerColor = `hsl(${testerHue} 70% 48%)`
  const testerInitials = (application.tester.name || 'Anonymous Tester')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  const repliesMuted = !!application.tester?.muteDeveloperReplies

  return (
    <>
      <Card
        className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
        style={{ borderTopColor: testerColor, borderTopWidth: 4 }}
      >
        <CardHeader
          className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
          style={{ background: `linear-gradient(120deg, hsl(${testerHue} 85% 96%), #ffffff 68%)` }}
        >
          <div className="flex min-w-0 items-center gap-4">
            <div
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-sm ring-4 ring-white"
              style={{ backgroundColor: testerColor }}
            >
              {testerInitials}
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Tester profile
              </p>
              <CardTitle className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                {application.tester.name || 'Anonymous Tester'}
              </CardTitle>
              {application.tester.email && (
                <p className="mt-1 truncate text-sm text-slate-600">{application.tester.email}</p>
              )}
            </div>
          </div>
          <Badge className={`${getStatusColor(application.status)} w-fit rounded-full px-3 py-1.5 text-xs font-bold tracking-wide`}>
            {application.testingPausedAt ? 'TESTING PAUSED' : application.status.replace('_', ' ')}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-5 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Calendar className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Applied</span>
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {appliedDate}
                </span>
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Clock className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Account age</span>
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {accountAge === null ? 'Unavailable' : `${accountAge} days`}
                </span>
              </span>
            </div>
          </div>

          {application.tester.deviceInfo ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">
                  <Smartphone className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Device information</h3>
                  <p className="text-xs text-slate-500">The tester’s Android device</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  ['Phone model', application.tester.deviceInfo.deviceModel],
                  ['Android version', application.tester.deviceInfo.androidVersion],
                  ['Screen size', application.tester.deviceInfo.screenSize || 'Not specified'],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-xl border border-slate-100 bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="font-medium">This tester has not added device information yet.</span>
            </div>
          )}

          {(application.verificationImage || application.verificationImage2) && (
            <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Play Store proof</h3>
                    <p className="text-xs text-slate-600">Tap an image to view it larger</p>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 border-indigo-200 bg-white text-indigo-700">
                  {[application.verificationImage, application.verificationImage2].filter(Boolean).length} image(s)
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {application.verificationImage && (
                  <button
                    type="button"
                    onClick={() => setImageDialogOpen(true)}
                    className="group relative overflow-hidden rounded-xl border border-indigo-200 bg-white text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <Image
                      src={application.verificationImage}
                      alt="Verification screenshot 1"
                      width={640}
                      height={360}
                      unoptimized
                      className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <span className="block px-3 py-2 text-xs font-semibold text-slate-600">Screenshot 1 · View full size</span>
                  </button>
                )}
                {application.verificationImage2 && (
                  <button
                    type="button"
                    onClick={() => setImageDialogOpen(true)}
                    className="group relative overflow-hidden rounded-xl border border-indigo-200 bg-white text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <Image
                      src={application.verificationImage2}
                      alt="Verification screenshot 2"
                      width={640}
                      height={360}
                      unoptimized
                      className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <span className="block px-3 py-2 text-xs font-semibold text-slate-600">Screenshot 2 · View full size</span>
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Testing Period Info */}
          {application.testingStartDate && application.testingEndDate && (
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-sm font-semibold mb-2">Testing Period</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Started: {new Date(application.testingStartDate).toLocaleDateString()}
                </span>
                <span className="text-gray-600">
                  Ends: {new Date(application.testingEndDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Feedback Section */}
          {application.feedback && (
            <div className="space-y-3">
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <span className="text-yellow-500">⭐</span>
                  {application.rating ? `Rating: ${application.rating}/5` : 'Feedback'}
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.feedback}</p>
              </div>

              {developerReply && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Your reply</p>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{developerReply}</p>
                  {developerReplyAt && (
                    <p className="text-xs text-blue-700 mt-2">
                      Sent {new Date(developerReplyAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {!developerReply && repliesMuted && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold text-gray-800">Replies are muted</p>
                  <p className="text-xs text-gray-600 mt-1">
                    This tester has opted out of developer replies.
                  </p>
                </div>
              )}

              {application.status === 'TESTING' && !repliesMuted ? (
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    {developerReply ? 'Send another reply' : 'Reply to tester'}
                  </p>
                  <p className="text-xs text-blue-700 mb-2">
                    {developerReply
                      ? 'Continue the conversation while testing is in progress.'
                      : 'One reply only while testing is active.'}
                  </p>
                  {replyError && (
                    <div className="text-xs text-red-600 mb-2">{replyError}</div>
                  )}
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Ask a clarification or say thanks..."
                    rows={3}
                    className="resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">{replyText.length}/500</span>
                    <Button
                      size="sm"
                      onClick={handleReplySubmit}
                      disabled={replyLoading}
                    >
                      {replyLoading ? 'Sending...' : 'Send reply'}
                    </Button>
                  </div>
                </div>
              ) : !developerReply && !repliesMuted ? (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold text-gray-800">Replies are available during testing</p>
                  <p className="text-xs text-gray-600 mt-1">
                    You can send a reply once the application enters the testing phase.
                  </p>
                </div>
              ) : null}

              {application.testerFollowupReply && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <p className="text-sm font-semibold text-amber-900 mb-1">Tester follow-up</p>
                  <p className="text-sm text-amber-800 whitespace-pre-wrap">
                    {application.testerFollowupReply}
                  </p>
                  {application.testerFollowupAt && (
                    <p className="text-xs text-amber-700 mt-2">
                      Sent {new Date(application.testerFollowupAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Engagement Score */}
          {(engagementScore !== null || application.status === 'COMPLETED' || application.status === 'TESTING') && (
            <div className={`p-3 rounded-lg ${engagementScore !== null ? getEngagementBadgeColor(engagementScore) : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Engagement Score
                </p>
                {engagementScore !== null && (
                  <div className="text-right">
                    <p className="text-lg font-bold">{engagementScore}/100</p>
                    <p className="text-xs opacity-75">{getEngagementLevel(engagementScore)}</p>
                  </div>
                )}
              </div>
              {engagementScore === null && application.status === 'COMPLETED' && (
                <Button 
                  onClick={calculateScore} 
                  disabled={loadingScore} 
                  size="sm" 
                  variant="ghost"
                  className="mt-2 w-full"
                >
                  {loadingScore ? 'Calculating...' : 'Calculate Score'}
                </Button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {application.status === 'PENDING' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-slate-900">Review this application</h3>
                <p className="mt-1 text-xs text-slate-600">Choose whether this tester should join your test.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => onApprove?.(application.id)}
                  disabled={loading}
                  className="min-h-11 flex-1 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  onClick={() => onReject?.(application.id)}
                  disabled={loading}
                  variant="destructive"
                  className="min-h-11 flex-1"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          )}

          {application.status === 'APPROVED' && (
            <div className="space-y-3 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-blue-950">Accepted · waiting for Play Store proof</p>
                  <p className="mt-1 text-xs leading-relaxed text-blue-800">
                    The tester has been notified. Their email is above, so you can add them in Play Console.
                  </p>
                </div>
              </div>
              <p className="text-xs text-blue-700">
                The tester will upload a screenshot after joining the test.
              </p>
              <Button
                onClick={() => onReject?.(application.id)}
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Close application
              </Button>
            </div>
          )}

          {application.status === 'OPTED_IN' && (
            <div className="space-y-3 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4">
              {application.verificationImage ? (
                <>
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                      <ImageIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-indigo-950">Check the Play Store screenshot</p>
                      <p className="mt-1 text-xs leading-relaxed text-indigo-800">
                        Check the proof above. If it shows the tester can join or install the app, accept them.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={() => onVerify?.(application.id)}
                      disabled={loading}
                      className="min-h-11 flex-1 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept tester
                    </Button>
                    <Button
                      onClick={() => onReject?.(application.id)}
                      disabled={loading}
                      variant="outline"
                      className="min-h-11 flex-1 border-slate-300 bg-white"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Close tester
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700">
                    <Clock className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-amber-950">Waiting for screenshot</p>
                    <p className="mt-1 text-xs text-amber-800">No action is needed until the tester sends proof.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {['VERIFIED', 'SCHEDULED'].includes(application.status) && (
            <div className="space-y-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-base font-bold text-emerald-950">Verified and ready to test</p>
                  <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                    The screenshot has been checked. Testing starts for everyone at the same time.
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-white/80 px-3 py-2 text-xs font-medium text-emerald-800">
                When your group is ready, use <strong>Start testing</strong> at the top of this job.
              </div>
              <Button
                onClick={() => onReject?.(application.id)}
                disabled={loading}
                variant="outline"
                className="min-h-10 w-full border-emerald-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Close application
              </Button>
            </div>
          )}

          {application.status === 'TESTING' && (
            <div className="flex items-start gap-3 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <Smartphone className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-purple-950">Testing in progress</p>
                <p className="mt-1 text-xs text-purple-800">
                  Will automatically complete on {new Date(application.testingEndDate!).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {application.status === 'COMPLETED' && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700">
                <CheckCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-emerald-950">Testing completed</p>
                <p className="mt-1 text-xs text-emerald-800">This tester has finished the testing period.</p>
              </div>
            </div>
          )}

          {application.status === 'REJECTED' && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-700">
                <XCircle className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-red-900">Application closed</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Play Store screenshots</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {application.verificationImage && (
              <Image
                src={application.verificationImage}
                alt="Verification screenshot 1"
                width={800}
                height={450}
                unoptimized
                className="max-h-[75vh] w-full rounded-lg border border-slate-200 object-contain"
              />
            )}
            {application.verificationImage2 && (
              <Image
                src={application.verificationImage2}
                alt="Verification screenshot 2"
                width={800}
                height={450}
                unoptimized
                className="max-h-[75vh] w-full rounded-lg border border-slate-200 object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
