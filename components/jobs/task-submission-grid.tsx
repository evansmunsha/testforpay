// components/jobs/task-submission-grid.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Minus, Loader2 } from 'lucide-react'

interface Submission {
  testerId: string
  content: string
  completedAt: string
}

interface DailyTask {
  id: string
  dayNumber: number
  taskText: string
  submissions: Submission[]
}

interface Tester {
  id: string
  name: string | null
  email: string
}

interface TasksData {
  tasks: DailyTask[]
  testers: Tester[]
}

interface TaskSubmissionGridProps {
  jobId: string
}

export function TaskSubmissionGrid({ jobId }: TaskSubmissionGridProps) {
  const [data, setData] = useState<TasksData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/tasks`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load missions')
        return r.json() as Promise<TasksData>
      })
      .then((d) => setData(d))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [jobId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading missions...
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-red-600">{error}</div>
    )
  }

  if (!data) return null

  const { tasks, testers } = data

  if (tasks.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        No daily missions configured for this job.
      </div>
    )
  }

  const completionRate =
    testers.length > 0 && tasks.length > 0
      ? Math.round(
          (tasks.reduce((acc, task) => acc + task.submissions.length, 0) /
            (testers.length * tasks.length)) *
            100
        )
      : 0

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Tester Mission Tracker</CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              <span className="inline-flex items-center gap-1 mr-3">
                <CheckCircle className="h-3 w-3 text-green-600" /> Completed
              </span>
              <span className="inline-flex items-center gap-1">
                <Minus className="h-3 w-3 text-gray-300" /> Pending / upcoming
              </span>
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {completionRate}% complete
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto">
        {testers.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            No approved testers yet. Missions will appear here once testers are approved.
          </p>
        ) : (
          <div className="min-w-[600px]">
            {/* Header row */}
            <div
              className="grid gap-1 text-xs"
              style={{
                gridTemplateColumns: `160px repeat(${tasks.length}, minmax(28px, 1fr))`,
              }}
            >
              <div className="font-semibold p-2 text-gray-600">Tester</div>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="text-center p-1 font-medium text-gray-500"
                  title={`Day ${task.dayNumber}: ${task.taskText}`}
                >
                  D{task.dayNumber}
                </div>
              ))}
            </div>

            {/* Tester rows */}
            {testers.map((tester) => (
              <div
                key={tester.id}
                className="grid gap-1 text-xs border-t border-gray-100"
                style={{
                  gridTemplateColumns: `160px repeat(${tasks.length}, minmax(28px, 1fr))`,
                }}
              >
                <div className="p-2 text-sm text-gray-700 truncate" title={tester.email}>
                  {tester.name ?? tester.email}
                </div>
                {tasks.map((task) => {
                  const sub = task.submissions.find(
                    (s) => s.testerId === tester.id
                  )
                  return (
                    <div
                      key={`${tester.id}-${task.id}`}
                      className="p-1 flex items-center justify-center"
                      title={
                        sub
                          ? `Submitted: ${sub.content.slice(0, 120)}${sub.content.length > 120 ? '…' : ''}`
                          : `Day ${task.dayNumber}: not yet submitted`
                      }
                    >
                      {sub ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Minus className="h-4 w-4 text-gray-300" />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
