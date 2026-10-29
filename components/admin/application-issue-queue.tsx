'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface IssueReport {
  id: string
  applicationId: string
  jobId: string
  category: string
  details: string
  attachmentUrls: string[]
  status: string
  createdAt: string
  tester: { name: string | null; email: string }
  job: { appName: string; developer: { name: string | null; email: string } }
}

export function ApplicationIssueQueue() {
  const [reports, setReports] = useState<IssueReport[]>([])
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const response = await fetch('/api/admin/application-issues')
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Failed to load reports')
        return
      }
      setReports(data.reports || [])
    } catch (cause) {
      console.error('Failed to load application issue reports:', cause)
      setError('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const updateReport = async (report: IssueReport, status: 'UNDER_REVIEW' | 'RESOLVED' | 'INCOMPATIBLE') => {
    if ((reasons[report.id] || '').trim().length < 10) {
      setError('Add an admin reason of at least 10 characters before updating a report.')
      return
    }
    setBusyId(report.id)
    setError('')
    try {
      const response = await fetch('/api/admin/application-issues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: report.id,
          status,
          adminNote: notes[report.id] || '',
          reason: reasons[report.id],
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Failed to update report')
        return
      }
      await load()
    } catch (cause) {
      console.error('Failed to update application issue report:', cause)
      setError('Failed to update report')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div className="py-8 text-center text-gray-500">Loading private reports…</div>

  return (
    <div className="space-y-4">
      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {reports.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No unresolved application reports.</div>
      ) : reports.map((report) => (
        <article key={report.id} className="space-y-3 rounded-lg border bg-white p-4">
          <header className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{report.job.appName} · {report.category.replaceAll('_', ' ').toLowerCase()}</h3>
              <p className="text-sm text-gray-600">
                Tester: {report.tester.name || 'Tester'} ({report.tester.email}) · Developer: {report.job.developer.name || report.job.developer.email}
              </p>
              <p className="text-xs text-gray-500">{new Date(report.createdAt).toLocaleString()} · {report.status}</p>
            </div>
            <a className="text-sm text-blue-700 underline" href={`/dashboard/jobs/${report.jobId}`}>
              Application {report.applicationId.slice(0, 8)}
            </a>
          </header>
          <p className="whitespace-pre-wrap text-sm">{report.details}</p>
          {report.attachmentUrls?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {report.attachmentUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Tester screenshot" loading="lazy" className="h-24 rounded border object-cover" />
                </a>
              ))}
            </div>
          )}
          <textarea
            value={notes[report.id] || ''}
            onChange={(event) => setNotes((previous) => ({ ...previous, [report.id]: event.target.value }))}
            rows={2}
            maxLength={2000}
            placeholder="Internal admin note (optional)"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <input
            value={reasons[report.id] || ''}
            onChange={(event) => setReasons((previous) => ({ ...previous, [report.id]: event.target.value }))}
            maxLength={1000}
            placeholder="Admin action reason (required, at least 10 characters)"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busyId === report.id} onClick={() => updateReport(report, 'UNDER_REVIEW')}>Mark under review</Button>
            <Button size="sm" variant="outline" disabled={busyId === report.id} onClick={() => updateReport(report, 'RESOLVED')}>Resolve</Button>
            <Button size="sm" variant="destructive" disabled={busyId === report.id} onClick={() => updateReport(report, 'INCOMPATIBLE')}>Confirm incompatibility</Button>
          </div>
        </article>
      ))}
    </div>
  )
}
