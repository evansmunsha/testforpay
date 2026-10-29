'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StartThreadButton } from '@/components/messages/start-thread-button'

type Report = {
  submissions: {
    id: string
    dayNumber: number
    content: string
    completedAt: string
    tester: { id: string; name: string | null }
    video: { id: string; deletedAt: string | null; deleteAfter: string | null } | null
  }[]
  issueReports: { id: string; description: string; createdAt: string; tester: { id: string; name: string | null } }[]
}

/** Lets a developer reply to daily mission uploads and issue reports on their own job. */
export function DeveloperReports({ jobId }: { jobId: string }) {
  const [data, setData] = useState<Report | null>(null)

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/mission-reports`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
  }, [jobId])

  if (!data || (data.submissions.length === 0 && data.issueReports.length === 0)) return null

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Tester reports</CardTitle>
        <CardDescription>Reply to a daily upload or an issue report.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.issueReports.map((r) => (
          <div key={r.id} className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">Issue from {r.tester.name || 'Tester'}</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">{r.description}</p>
            <StartThreadButton target={{ kind: 'ISSUE_REPORT', issueReportId: r.id }} />
          </div>
        ))}
        {data.submissions.map((s) => (
          <div key={s.id} className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">Day {s.dayNumber} · {s.tester.name || 'Tester'}</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">{s.content}</p>
            {s.video && !s.video.deletedAt && (
              <div className="rounded-md bg-indigo-50 p-3 text-sm">
                <a className="font-medium text-blue-700 underline" href={`/api/videos/${s.video.id}`}>
                  Download screen recording
                </a>
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
