'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ReportView {
  id: string
  reason: string
  createdAt: string
  reporterName: string
  type: 'POST' | 'COMMENT'
  postId: string | null
  commentId: string | null
  body: string
  status: string
  authorId: string | null
  authorName: string
}

export function CommunityModerationQueue() {
  const [reports, setReports] = useState<ReportView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/community', { cache: 'no-store' })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(json.error || 'Could not load reports.')
        return
      }
      setError('')
      setReports(json.reports)
    } catch {
      setError('No connection. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Every action needs a written reason of 10+ characters, which is saved in the moderation log.
  const act = async (report: ReportView, action: string, extra: Record<string, unknown> = {}, resolve?: 'DISMISS_REPORT' | 'ACTION_REPORT') => {
    const reason = window.prompt('Reason (at least 10 characters)')
    if (!reason) return
    setBusyId(report.id)
    setError('')
    try {
      const send = (payload: Record<string, unknown>) =>
        fetch('/api/admin/community', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, ...payload }),
        })
      const response = await send({ action, ...extra })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(json.error || 'Action failed.')
        return
      }
      if (resolve) await send({ action: resolve, reportId: report.id })
      await load()
    } catch {
      setError('No connection. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {reports.length === 0 && !error && <p className="text-sm text-muted-foreground">No open reports. 🎉</p>}
      {reports.map((report) => (
        <div key={report.id} className="space-y-2 rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{report.type === 'POST' ? 'Post' : 'Comment'}</Badge>
            {report.status === 'HIDDEN' && <Badge variant="destructive">Hidden</Badge>}
            <span>by <strong>{report.authorName}</strong></span>
            <span className="text-muted-foreground">· reported by {report.reporterName}</span>
          </div>
          <p className="whitespace-pre-wrap break-words rounded bg-muted p-2">{report.body}</p>
          <p><strong>Reason:</strong> {report.reason}</p>
          <div className="flex flex-wrap gap-2">
            {report.type === 'POST' && report.postId && (
              <Button size="sm" variant="outline" disabled={busyId === report.id} onClick={() => act(report, 'HIDE_POST', { postId: report.postId }, 'ACTION_REPORT')}>Hide post</Button>
            )}
            {report.type === 'COMMENT' && report.commentId && (
              <Button size="sm" variant="outline" disabled={busyId === report.id} onClick={() => act(report, 'HIDE_COMMENT', { commentId: report.commentId }, 'ACTION_REPORT')}>Hide comment</Button>
            )}
            {report.authorId && (
              <Button size="sm" variant="outline" disabled={busyId === report.id} onClick={() => {
                const days = window.prompt('Mute for how many days? (leave empty for until lifted)')
                void act(report, 'MUTE_USER', { userId: report.authorId, days: days ? Number(days) : undefined }, 'ACTION_REPORT')
              }}>Mute author</Button>
            )}
            <Button size="sm" variant="ghost" disabled={busyId === report.id} onClick={() => act(report, 'DISMISS_REPORT', { reportId: report.id })}>Dismiss</Button>
          </div>
        </div>
      ))}
    </div>
  )
}
