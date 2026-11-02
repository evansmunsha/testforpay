'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Target, ArrowLeft } from 'lucide-react'
import { DailyMissionCard } from '@/components/tester/daily-mission-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'

type MissionData = {
  jobName: string
  totalDays: number
  applicationStatus: string
  mission: {
    task: { id: string; taskText: string }
    dayNumber: number
    isCatchUp: boolean
    isCompleted: boolean
    submission: { content: string; video: { id: string; deletedAt: string | null } | null } | null
    videoDeleteAfter: string | null
  } | null
  missionNote: string | null
  reports: {
    id: string
    dayNumber: number
    taskText: string
    content: string
    screenshotUrl: string | null
    completedAt: string
    video: { id: string; deletedAt: string | null } | null
  }[]
}

/** One place for a tester's job: today's mission, the report form, past reports with videos. */
export function TesterJobMissions({ jobId }: { jobId: string }) {
  const { user } = useAuth()
  const [data, setData] = useState<MissionData | null>(null)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/mission-reports`, { cache: 'no-store' })
      setData(response.ok ? await response.json() : null)
    } catch {
      setData(null)
    } finally {
      setLoaded(true)
    }
  }, [jobId])

  useEffect(() => {
    if (user?.role === 'TESTER') load()
  }, [user?.role, load])

  if (user?.role !== 'TESTER' || !loaded || !data) return null

  const handleSubmit = async (
    content: string,
    screenshotUrl?: string,
    video?: { pathname: string; contentType: string; sizeBytes: number; durationSeconds: number }
  ) => {
    if (!data.mission) return
    const response = await fetch(`/api/tasks/${data.mission.task.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, screenshotUrl, video }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.error ?? 'Submission failed')
    }
    await load()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/dashboard/applications" className="inline-flex items-center gap-1 text-sm text-blue-700 underline">
        <ArrowLeft className="h-4 w-4" /> Back to My Applications
      </Link>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">{data.jobName}: daily mission</h2>
        </div>
        {data.mission ? (
          <DailyMissionCard
            key={data.mission.task.id}
            dayNumber={data.mission.dayNumber}
            totalDays={data.totalDays}
            taskText={data.mission.task.taskText}
            taskId={data.mission.task.id}
            isCompleted={data.mission.isCompleted}
            existingContent={data.mission.submission?.content ?? null}
            existingVideoId={data.mission.submission?.video?.deletedAt ? null : data.mission.submission?.video?.id ?? null}
            videoDeleteAfter={data.mission.videoDeleteAfter}
            jobName={data.jobName}
            isCatchUp={data.mission.isCatchUp}
            onSubmit={handleSubmit}
          />
        ) : (
          <Card>
            <CardContent className="pt-6 text-sm text-gray-700">{data.missionNote}</CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your reports</CardTitle>
          <CardDescription>Everything you have sent for this job, with your screen recordings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.reports.length === 0 && <p className="text-sm text-gray-500">No reports yet.</p>}
          {data.reports.map((report) => (
            <div key={report.id} className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Day {report.dayNumber}</p>
              <p className="text-xs text-gray-500">Mission: {report.taskText}</p>
              <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{report.content}</p>
              {report.screenshotUrl && (
                <a className="text-sm text-blue-700 underline" href={report.screenshotUrl} target="_blank" rel="noopener noreferrer">
                  Screenshot link
                </a>
              )}
              {report.video && !report.video.deletedAt && (
                <video
                  controls
                  preload="metadata"
                  playsInline
                  src={`/api/videos/${report.video.id}`}
                  className="mx-auto aspect-[9/16] w-full max-w-[260px] rounded-lg bg-black object-cover"
                />
              )}
              {report.video?.deletedAt && (
                <p className="text-xs text-gray-500">The screen recording was deleted; your written report remains.</p>
              )}
              <p className="text-xs text-gray-400">Sent {new Date(report.completedAt).toLocaleString()}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
