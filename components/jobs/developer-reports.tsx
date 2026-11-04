'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StartThreadButton } from '@/components/messages/start-thread-button'
import { VideoFeed } from '@/components/jobs/video-feed'
import { useAuth } from '@/hooks/use-auth'

type Report = {
  submissions: {
    id: string
    dayNumber: number
    content: string
    completedAt: string
    tester: { id: string; name: string | null }
    video: { id: string; deletedAt: string | null; deleteAfter: string | null; developerConfirmedAt: string | null } | null
  }[]
  issueReports: { id: string; description: string; createdAt: string; tester: { id: string; name: string | null } }[]
}

/** Lets a developer reply to daily mission uploads and issue reports on their own job. */
export function DeveloperReports({ jobId }: { jobId: string }) {
  const [data, setData] = useState<Report | null>(null)
  const [feedStart, setFeedStart] = useState<number | null>(null)
  const { isDeveloper } = useAuth()
  const [confirming, setConfirming] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState('')

  const confirmVideo = async (videoId: string) => {
    setConfirming(videoId)
    setConfirmError('')
    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not save. Please try again.')
      setData((current) =>
        current
          ? {
              ...current,
              submissions: current.submissions.map((s) =>
                s.video?.id === videoId
                  ? { ...s, video: { ...s.video, developerConfirmedAt: body.developerConfirmedAt } }
                  : s
              ),
            }
          : current
      )
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : 'Could not save. Please try again.')
    } finally {
      setConfirming(null)
    }
  }

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/mission-reports`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
  }, [jobId])

  if (!data || (data.submissions.length === 0 && data.issueReports.length === 0)) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tester reports</CardTitle>
          <CardDescription>
            No reports yet. A tester&apos;s screen recording appears here only after they tap Complete Mission.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const feedVideos = data.submissions
    .filter((s) => s.video && !s.video.deletedAt)
    .map((s) => ({
      id: s.video!.id,
      testerName: s.tester.name || 'Tester',
      dayNumber: s.dayNumber,
      content: s.content,
    }))
  const feedIndexById = new Map(feedVideos.map((video, index) => [video.id, index]))

  return (
    <Card className="mb-6">
      {feedStart !== null && feedVideos.length > 0 && (
        <VideoFeed videos={feedVideos} startIndex={feedStart} onClose={() => setFeedStart(null)} />
      )}
      <CardHeader>
        <CardTitle>Tester reports</CardTitle>
        <CardDescription>Reply to a daily upload or an issue report.</CardDescription>
        {feedVideos.length > 0 && (
          <button
            type="button"
            onClick={() => setFeedStart(0)}
            className="mt-2 w-fit rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            ▶ Watch all recordings ({feedVideos.length})
          </button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {confirmError && <p className="text-sm text-red-600">{confirmError}</p>}
        {data.issueReports.map((r) => (
          <div key={r.id} className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">Issue reported by {r.tester.name || 'Tester'}</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">{r.description}</p>
            <StartThreadButton target={{ kind: 'ISSUE_REPORT', issueReportId: r.id }} />
          </div>
        ))}
        {data.submissions.map((s) => (
          <div key={s.id} className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">Day {s.dayNumber} · Reported by {s.tester.name || 'Tester'}</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">{s.content}</p>
            {s.video && !s.video.deletedAt && (
              <div className="rounded-md bg-indigo-50 p-3 text-sm">
                <p className="text-xs text-gray-700">Screen recording from {s.tester.name || 'Tester'}</p>
                <div className="mt-2 overflow-hidden rounded-lg border border-indigo-100 bg-black/90 mx-auto w-full max-w-[260px] aspect-[9/16]">
                  <video
                    controls
                    preload="metadata"
                    playsInline
                    src={`/api/videos/${s.video.id}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFeedStart(feedIndexById.get(s.video!.id) ?? 0)}
                  className="mt-2 mr-4 font-medium text-indigo-700 underline"
                >
                  Open full screen
                </button>
                <a className="mt-2 inline-block font-medium text-blue-700 underline" href={`/api/videos/${s.video.id}?download=1`}>
                  Download screen recording
                </a>
                <div className="mt-3 rounded-md border border-green-200 bg-white p-2">
                  {s.video.developerConfirmedAt ? (
                    <p className="text-sm font-medium text-green-700">
                      ✓ Developer confirmed this is their app ({new Date(s.video.developerConfirmedAt).toLocaleDateString()})
                    </p>
                  ) : isDeveloper ? (
                    <>
                      <p className="text-xs text-gray-700">Did you watch this and is it your app?</p>
                      <button
                        type="button"
                        disabled={confirming === s.video.id}
                        onClick={() => confirmVideo(s.video!.id)}
                        className="mt-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {confirming === s.video.id ? 'Saving…' : 'Yes, this is my app'}
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500">The developer has not confirmed this video yet.</p>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {s.video.deleteAfter
                    ? `Earliest automatic deletion: ${new Date(s.video.deleteAfter).toLocaleString()}. Cleanup waits while the job is active or disputed.`
                    : 'This video is kept while testing is active.'}
                </p>
              </div>
            )}
            {s.video?.deletedAt && <p className="text-xs text-gray-500">The screen recording was deleted; the written report remains.</p>}
            <StartThreadButton target={{ kind: 'MISSION_SUBMISSION', taskSubmissionId: s.id }} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
