'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  User, 
  Mail, 
  Calendar, 
  Smartphone, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  TrendingUp
} from 'lucide-react'
import { getEngagementBadgeColor, getEngagementLevel } from '@/lib/engagement-scoring'

interface ApplicationCardProps {
  application: {
    id: string
    status: string
    createdAt: string
    testingStartDate: string | null
    testingEndDate: string | null
    optInVerified: boolean
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
      email: string
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
}

export function ApplicationCard({ 
  application, 
  onApprove, 
  onReject, 
  onVerify,
  loading = false 
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
    // Calculate engagement score when feedback is submitted
    if (application.feedback && engagementScore === null && application.status === 'COMPLETED') {
      calculateScore()
    }
  }, [application.feedback])

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
      setDeveloperReply(trimmed)
      setDeveloperReplyAt(new Date().toISOString())
      setReplyText('')
    } catch (error) {
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

  const accountAge = Math.floor(
    (new Date().getTime() - new Date(application.tester.createdAt).getTime()) / 
    (1000 * 60 * 60 * 24)
  )
  const repliesMuted = !!application.tester?.muteDeveloperReplies

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Image 
                src="/images/default-avatar.svg" 
                alt="Tester" 
                width={48} 
                height={48}
                className="rounded-full"
              />
              <div>
                <CardTitle className="text-lg">
                  {application.tester.name || 'Anonymous Tester'}
                </CardTitle>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {application.tester.email}
                </p>
              </div>
            </div>
            <Badge className={getStatusColor(application.status)}>
              {application.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Key Info */}
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Applied {new Date(application.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Account age: {accountAge} days</span>
            </div>
          </div>

          {/* Device Info */}
          {application.tester.deviceInfo ? (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Device Information
              </p>
              <div className="grid md:grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Model:</span>
                  <p className="font-medium">{application.tester.deviceInfo.deviceModel}</p>
                </div>
                <div>
                  <span className="text-gray-600">Android:</span>
                  <p className="font-medium">{application.tester.deviceInfo.androidVersion}</p>
                </div>
                <div>
                  <span className="text-gray-600">Screen:</span>
                  <p className="font-medium">
                    {application.tester.deviceInfo.screenSize || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                No device information provided
              </p>
            </div>
          )}

          {/* Verification Images */}
          {(application.verificationImage || application.verificationImage2) && (
            <div className="bg-indigo-50 p-3 rounded-lg">
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-indigo-600" />
                Verification Screenshots
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {application.verificationImage && (
                  <div
                    onClick={() => setImageDialogOpen(true)}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={application.verificationImage}
                      alt="Verification screenshot 1"
                      className="max-w-full h-auto rounded border border-indigo-200"
                    />
                  </div>
                )}
                {application.verificationImage2 && (
                  <div
                    onClick={() => setImageDialogOpen(true)}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={application.verificationImage2}
                      alt="Verification screenshot 2"
                      className="max-w-full h-auto rounded border border-indigo-200"
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-indigo-700 mt-2">
                Click to view full size
              </p>
            </div>
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

              {developerReply ? (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Your reply</p>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{developerReply}</p>
                  {developerReplyAt && (
                    <p className="text-xs text-blue-700 mt-2">
                      Sent {new Date(developerReplyAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : repliesMuted ? (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold text-gray-800">Replies are muted</p>
                  <p className="text-xs text-gray-600 mt-1">
                    This tester has opted out of developer replies.
                  </p>
                </div>
              ) : (
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Reply to tester</p>
                  <p className="text-xs text-blue-700 mb-2">
                    One reply only. Keep it short and helpful.
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
              )}

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
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => onApprove?.(application.id)}
                disabled={loading}
                className="flex-1"
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => onReject?.(application.id)}
                disabled={loading}
                variant="destructive"
                className="flex-1"
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {application.status === 'APPROVED' && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                ✅ Approved - Waiting for tester to opt-in to Google Play test
              </p>
            </div>
          )}

          {application.status === 'OPTED_IN' && (
            <div className="space-y-2">
              {application.verificationImage ? (
                <>
                  <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
                    <p className="text-sm text-indigo-800">
                      📸 Tester has submitted verification screenshot. Review it above and verify to start testing.
                    </p>
                  </div>
                  <Button
                    onClick={() => onVerify?.(application.id)}
                    disabled={loading}
                    size="sm"
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify & Start Testing Period
                  </Button>
                </>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⏳ Waiting for tester to upload verification screenshot
                  </p>
                </div>
              )}
            </div>
          )}

          {application.status === 'TESTING' && (
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
              <p className="text-sm text-purple-800 font-medium">
                🎯 Testing in progress
              </p>
              <p className="text-xs text-purple-700 mt-1">
                Will automatically complete on {new Date(application.testingEndDate!).toLocaleDateString()}
              </p>
            </div>
          )}

          {application.status === 'COMPLETED' && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                🎉 Testing completed successfully
              </p>
            </div>
          )}

          {application.status === 'REJECTED' && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <p className="text-sm text-red-800">
                ❌ Application was rejected
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Verification Screenshots</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {application.verificationImage && (
              <img
                src={application.verificationImage}
                alt="Verification screenshot 1"
                className="w-full h-auto rounded"
              />
            )}
            {application.verificationImage2 && (
              <img
                src={application.verificationImage2}
                alt="Verification screenshot 2"
                className="w-full h-auto rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
