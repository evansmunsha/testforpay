'use client'

import { useCallback, useEffect, useState } from 'react'
import { StartThreadButton } from '@/components/messages/start-thread-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast-provider'
import { isAfricanCountry } from '@/lib/training-rules'
import { TASK_TEMPLATES, type TaskTemplateKey } from '@/lib/constants'

interface JobOption {
  id: string
  appName: string
  status: string
  isTraining?: boolean
  appDescription?: string | null
  googlePlayLink?: string | null
  packageName?: string | null
  appCategory?: string | null
  minAndroidVersion?: string | null
  supportedCountries?: string[]
  testersNeeded?: number
  testDuration?: number
  dailyTasks?: { dayNumber: number; taskText: string }[]
}

const FALLBACK_MISSION = 'Use the app normally, explore its features, and note any problems.'

// Keeps exactly one mission per day: reuses what exists, then the template, then a fallback.
const resizeMissions = (existing: string[], days: number, templateKey: string): string[] => {
  const template: readonly string[] = templateKey in TASK_TEMPLATES
    ? TASK_TEMPLATES[templateKey as TaskTemplateKey]
    : TASK_TEMPLATES.generic
  return Array.from({ length: days }, (_, index) =>
    existing[index]?.trim() || template[index] || FALLBACK_MISSION
  )
}

const toJobOption = (job: JobOption): JobOption => ({
  id: job.id,
  appName: job.appName,
  status: job.status,
  isTraining: Boolean(job.isTraining),
  appDescription: job.appDescription,
  googlePlayLink: job.googlePlayLink,
  packageName: job.packageName,
  appCategory: job.appCategory,
  minAndroidVersion: job.minAndroidVersion,
  supportedCountries: job.supportedCountries,
  testersNeeded: job.testersNeeded,
  testDuration: job.testDuration,
  dailyTasks: job.dailyTasks,
})

interface Person { id: string; name: string | null; email: string }

interface OperationsApplication {
  id: string
  status: string
  optInVerified: boolean
  verificationImage: string | null
  verificationImage2: string | null
  verifiedAt: string | null
  testingStartDate: string | null
  testingEndDate: string | null
  testingPausedAt: string | null
  createdAt: string
  paymentStatus: string | null
  hasUnresolvedIssue: boolean
  passesScreening: boolean
  missionSubmissions: number
  tester: Person & {
    countryCode: string | null
    deviceInfo: { deviceModel: string; androidVersion: string; screenSize: string | null } | null
  }
}

interface Paged<T> { page: number; pageSize: number; total: number; items: T[] }

interface Operations {
  job: {
    id: string
    appName: string
    status: string
    isTraining?: boolean
    testersNeeded: number
    testDuration: number
    supportedCountries: string[]
    minAndroidVersion: string | null
    googlePlayLink: string
    developer: { name: string | null; email: string }
  }
  readiness: {
    canStart: boolean
    verifiedCount: number
    pausedToResume: number
    blockers: Array<{ code: string; message: string }>
  }
  statusCounts: Record<string, number>
  applications: Paged<OperationsApplication>
  reports: Paged<{
    id: string
    category: string
    details: string
    attachmentUrls: string[]
    status: string
    adminNote: string | null
    createdAt: string
    tester: Person
  }>
  missionSubmissions: Paged<{
    id: string
    content: string
    screenshotUrl: string | null
    completedAt: string
    task: { dayNumber: number }
    tester: Person
  }>
}

const CLOSABLE = ['PENDING', 'APPROVED', 'OPTED_IN', 'VERIFIED', 'SCHEDULED']

function Pager({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages === 1) return null
  return (
    <div className="flex items-center justify-between pt-3 text-sm text-gray-600">
      <span>Page {page} of {totalPages} · {total} total</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</Button>
      </div>
    </div>
  )
}

export function JobOperations() {
  const { toast } = useToast()
  const [jobs, setJobs] = useState<JobOption[]>([])
  const [jobId, setJobId] = useState('')
  const [data, setData] = useState<Operations | null>(null)
  const [pages, setPages] = useState({ applications: 1, submissions: 1, reports: 1 })
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [creatingTraining, setCreatingTraining] = useState(false)
  const [trainingForm, setTrainingForm] = useState({
    appName: '',
    appDescription: '',
    googlePlayLink: '',
    packageName: '',
    appCategory: '',
    minAndroidVersion: '',
    supportedCountries: 'ZM',
    testersNeeded: 12,
    testDuration: 14,
    taskTemplate: 'generic',
  })
  const [missions, setMissions] = useState<string[]>(() => resizeMissions([], 14, 'generic'))

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const response = await fetch('/api/admin/jobs')
        const body = await response.json()
        if (response.ok) {
          setJobs((body.jobs || []).map(toJobOption))
        }
      } catch (cause) {
        console.error('Failed to load jobs for operations:', cause)
      }
    }
    void loadJobs()
  }, [])

  const fillFromExistingJob = (id: string) => {
    const source = jobs.find((job) => job.id === id)
    if (!source) return
    const african = (source.supportedCountries || []).filter((code) => isAfricanCountry(code))
    const days = source.testDuration || trainingForm.testDuration
    const copiedTasks = [...(source.dailyTasks || [])]
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map((task) => task.taskText)
    setMissions(resizeMissions(copiedTasks, days, trainingForm.taskTemplate))
    setTrainingForm((current) => ({
      ...current,
      appName: source.appName,
      appDescription: source.appDescription || '',
      googlePlayLink: source.googlePlayLink || '',
      packageName: source.packageName || '',
      appCategory: source.appCategory || '',
      minAndroidVersion: source.minAndroidVersion || '',
      supportedCountries: african.length > 0 ? african.join(', ') : 'ZM',
      testersNeeded: source.testersNeeded || current.testersNeeded,
      testDuration: source.testDuration || current.testDuration,
    }))
  }

  const createTrainingJob = async () => {
    if (!reasonOk) {
      toast({ title: 'Reason needed', description: 'Write a reason of at least 10 characters first.', variant: 'destructive' })
      return
    }
    setCreatingTraining(true)
    try {
      const supportedCountries = trainingForm.supportedCountries
        .split(',')
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean)
      const response = await fetch('/api/admin/jobs/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...trainingForm,
          supportedCountries,
          customTasks: resizeMissions(missions, trainingForm.testDuration, trainingForm.taskTemplate),
          reason: reason.trim(),
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast({ title: 'Error', description: body.error || 'Training job was not created', variant: 'destructive' })
        return
      }
      toast({ title: 'Training job published', description: body.message || '', variant: 'success' })
      setTrainingForm((current) => ({ ...current, appName: '', appDescription: '', googlePlayLink: '' }))
      const jobsResponse = await fetch('/api/admin/jobs')
      const jobsBody = await jobsResponse.json().catch(() => ({}))
      if (jobsResponse.ok) {
        setJobs((jobsBody.jobs || []).map(toJobOption))
      }
    } catch (cause) {
      console.error('Failed to create training job:', cause)
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setCreatingTraining(false)
    }
  }

  const load = useCallback(async () => {
    if (!jobId) return
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams({
        operationsJobId: jobId,
        applicationsPage: String(pages.applications),
        submissionsPage: String(pages.submissions),
        reportsPage: String(pages.reports),
      })
      const response = await fetch(`/api/admin/jobs?${query.toString()}`)
      const body = await response.json()
      if (!response.ok) {
        setError(body.error || 'Could not load this job')
        return
      }
      setData(body)
    } catch (cause) {
      console.error('Failed to load job operations:', cause)
      setError('Could not load this job')
    } finally {
      setLoading(false)
    }
  }, [jobId, pages])

  useEffect(() => { void load() }, [load])

  const reasonOk = reason.trim().length >= 10

  const run = async (key: string, request: () => Promise<Response>, success: string) => {
    if (!reasonOk) {
      toast({ title: 'Reason needed', description: 'Write a reason of at least 10 characters first.', variant: 'destructive' })
      return
    }
    setBusyId(key)
    try {
      const response = await request()
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast({ title: 'Error', description: body.error || 'That did not work', variant: 'destructive' })
        return
      }
      toast({ title: success, description: body.message || '', variant: 'success' })
      await load()
    } catch (cause) {
      console.error('Admin operation failed:', cause)
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setBusyId(null)
    }
  }

  const json = (payload: Record<string, unknown>) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, reason: reason.trim() }),
  })
  const patchApplication = (id: string, action: 'verify' | 'reject') =>
    fetch(`/api/applications/${id}`, { ...json({ action }), method: 'PATCH' })

  const [startDate, setStartDate] = useState('')
  const tomorrowUtc = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const resumingPaused = (data?.readiness.pausedToResume ?? 0) > 0
  const dateOk = resumingPaused || (startDate !== '' && startDate >= tomorrowUtc)

  const startTesting = () => run(
    'start',
    () => fetch(`/api/jobs/${jobId}/start`, json(resumingPaused ? { resumePausedApplications: true } : { startDate })),
    resumingPaused ? 'Testing resumed' : 'Testing scheduled'
  )

  const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : '—')

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Testing Operations</CardTitle>
          <CardDescription>Oversee one job: group readiness, every tester’s checks and uploads, reports, and mission screenshots.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label htmlFor="operations-job" className="text-sm font-medium">Job</label>
            <select
              id="operations-job"
              value={jobId}
              onChange={(event) => { setJobId(event.target.value); setPages({ applications: 1, submissions: 1, reports: 1 }); setData(null) }}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Choose a job…</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.appName} ({job.status}{job.isTraining ? ' · TRAINING' : ''})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="operations-reason" className="text-sm font-medium">Admin reason for actions below (at least 10 characters)</label>
            <input
              id="operations-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="Why are you doing this? It is saved in the audit log."
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">Publish training job (no payment, points only)</p>
            <p className="mt-1 text-xs text-amber-800">
              Training jobs are restricted to African testers only. Use African country codes (for example ZM, KE, NG).
            </p>
            <div className="mt-3">
              <label htmlFor="training-copy-job" className="text-sm font-medium text-amber-900">
                Fill from an existing job (optional)
              </label>
              <select
                id="training-copy-job"
                defaultValue=""
                onChange={(event) => fillFromExistingJob(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Choose a job to copy its details…</option>
                {jobs.filter((job) => !job.isTraining).map((job) => (
                  <option key={job.id} value={job.id}>{job.appName} ({job.status})</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-amber-800">
                This only copies the details into the form. Publishing creates a separate free training job, and the original job is not changed.
              </p>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input
                value={trainingForm.appName}
                onChange={(event) => setTrainingForm((current) => ({ ...current, appName: event.target.value }))}
                placeholder="App name"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={trainingForm.googlePlayLink}
                onChange={(event) => setTrainingForm((current) => ({ ...current, googlePlayLink: event.target.value }))}
                placeholder="Google Play closed test link"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <textarea
                value={trainingForm.appDescription}
                onChange={(event) => setTrainingForm((current) => ({ ...current, appDescription: event.target.value }))}
                placeholder="What should testers do in this training?"
                rows={3}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2"
              />
              <input
                value={trainingForm.supportedCountries}
                onChange={(event) => setTrainingForm((current) => ({ ...current, supportedCountries: event.target.value }))}
                placeholder="Supported countries, comma separated (e.g. ZM, KE, NG)"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2"
              />
              <input
                value={trainingForm.minAndroidVersion}
                onChange={(event) => setTrainingForm((current) => ({ ...current, minAndroidVersion: event.target.value }))}
                placeholder="Min Android version (optional)"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={trainingForm.appCategory}
                onChange={(event) => setTrainingForm((current) => ({ ...current, appCategory: event.target.value }))}
                placeholder="Category (optional)"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-sm">
                <span>Testers needed</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={trainingForm.testersNeeded}
                  onChange={(event) => setTrainingForm((current) => ({ ...current, testersNeeded: Number(event.target.value || 1) }))}
                  className="w-24 rounded-md border border-gray-300 px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span>Duration (days)</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={trainingForm.testDuration}
                  onChange={(event) => {
                    const days = Math.min(30, Math.max(1, Number(event.target.value || 1)))
                    setTrainingForm((current) => ({ ...current, testDuration: days }))
                    setMissions((current) => resizeMissions(current, days, trainingForm.taskTemplate))
                  }}
                  className="w-24 rounded-md border border-gray-300 px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <span>Mission template</span>
                <select
                  value={trainingForm.taskTemplate}
                  onChange={(event) => {
                    const key = event.target.value
                    setTrainingForm((current) => ({ ...current, taskTemplate: key }))
                    setMissions(resizeMissions([], trainingForm.testDuration, key))
                  }}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1"
                >
                  {Object.keys(TASK_TEMPLATES).map((key) => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
                <span className="text-xs text-amber-800">Picking a template refills all daily missions below.</span>
              </label>
              <div className="space-y-2 md:col-span-2">
                <p className="text-sm font-medium text-amber-900">Daily missions (one per day, you can edit each)</p>
                {missions.map((mission, index) => (
                  <label key={index} className="flex items-start gap-2 text-sm">
                    <span className="mt-2 w-14 shrink-0 text-gray-600">Day {index + 1}</span>
                    <textarea
                      value={mission}
                      rows={2}
                      maxLength={1000}
                      onChange={(event) => setMissions((current) =>
                        current.map((text, i) => (i === index ? event.target.value : text))
                      )}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
            <Button
              className="mt-3"
              disabled={
                creatingTraining ||
                !reasonOk ||
                trainingForm.appName.trim().length < 3 ||
                trainingForm.appDescription.trim().length < 40 ||
                !trainingForm.googlePlayLink.trim()
              }
              onClick={createTrainingJob}
            >
              {creatingTraining ? 'Publishing…' : 'Publish Training Job'}
            </Button>
          </div>
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </CardContent>
      </Card>

      {loading && !data && <p className="text-sm text-gray-500">Loading…</p>}

      {data && (
        <>
          <Card className={data.readiness.canStart ? 'border-green-300' : 'border-amber-200'}>
            <CardHeader>
              <CardTitle>{data.job.appName}</CardTitle>
              <CardDescription>
                Developer: {data.job.developer.name || data.job.developer.email} ({data.job.developer.email}) · {data.job.status} · {data.job.testDuration}-day test
                {data.job.isTraining ? ' · TRAINING (points only)' : ''}
                {' · '}Countries: {data.job.supportedCountries.join(', ') || 'none declared'}
                {data.job.minAndroidVersion ? ` · Android ${data.job.minAndroidVersion}+` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-lg font-semibold">{data.readiness.verifiedCount} / {data.job.testersNeeded} verified and ready</span>
                {Object.entries(data.statusCounts).map(([status, count]) => (
                  <Badge key={status} variant="secondary">{status}: {count}</Badge>
                ))}
              </div>
              {data.readiness.blockers.length > 0 && (
                <ul className="list-disc pl-5 text-sm text-amber-800">
                  {data.readiness.blockers.map((blocker) => <li key={blocker.code}>{blocker.message}</li>)}
                </ul>
              )}
              {data.readiness.pausedToResume > 0 && (
                <p className="text-sm text-amber-800">
                  {data.readiness.pausedToResume} paused tester(s) will resume with their saved remaining time when testing starts.
                </p>
              )}
              {!resumingPaused && (
                <div>
                  <label htmlFor="operations-start-date" className="text-sm font-medium">Start date (tomorrow or later, days change at midnight UTC)</label>
                  <input
                    id="operations-start-date"
                    type="date"
                    min={tomorrowUtc}
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              )}
              <Button
                disabled={!data.readiness.canStart || !reasonOk || !dateOk || busyId === 'start'}
                onClick={startTesting}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {resumingPaused ? 'Resume paused testers now' : 'Schedule testing'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Testers ({data.applications.total})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="px-2 py-2 font-medium">Tester</th>
                      <th className="px-2 py-2 font-medium">Checks</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="px-2 py-2 font-medium">Proof</th>
                      <th className="px-2 py-2 font-medium">Testing</th>
                      <th className="px-2 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.applications.items.map((application) => (
                      <tr key={application.id} className="border-b align-top">
                        <td className="px-2 py-3">
                          <p className="font-medium">{application.tester.name || application.tester.email}</p>
                          <p className="text-xs text-gray-500">{application.tester.email}</p>
                          <p className="text-xs text-gray-500">Applied {formatDate(application.createdAt)}</p>
                        </td>
                        <td className="px-2 py-3 text-xs">
                          <p>{application.tester.countryCode || 'No country'} · {application.tester.deviceInfo
                            ? `${application.tester.deviceInfo.deviceModel}, Android ${application.tester.deviceInfo.androidVersion}`
                            : 'No device'}</p>
                          <p className={application.passesScreening ? 'text-green-700' : 'font-medium text-red-700'}>
                            {application.passesScreening ? 'Passes country/device check' : 'Fails country/device check'}
                          </p>
                          {application.hasUnresolvedIssue && <p className="font-medium text-red-700">Unresolved install report</p>}
                          <p className="text-gray-500">Payment: {application.paymentStatus || 'none'}</p>
                        </td>
                        <td className="px-2 py-3">
                          <Badge variant="outline">{application.status}</Badge>
                          {application.testingPausedAt && <p className="mt-1 text-xs font-medium text-amber-700">Paused</p>}
                          {application.verifiedAt && <p className="mt-1 text-xs text-gray-500">Verified {formatDate(application.verifiedAt)}</p>}
                        </td>
                        <td className="px-2 py-3">
                          {(application.verificationImage || application.verificationImage2) ? (
                            <div className="flex gap-2">
                              {[application.verificationImage, application.verificationImage2].map((url, index) => url && (
                                <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={url} alt={`Proof ${index + 1}`} loading="lazy" className="h-16 w-24 rounded border object-cover" />
                                </a>
                              ))}
                            </div>
                          ) : <span className="text-xs text-gray-400">No upload</span>}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-600">
                          <p>Start: {formatDate(application.testingStartDate)}</p>
                          <p>End: {formatDate(application.testingEndDate)}</p>
                          <p>Missions done: {application.missionSubmissions}</p>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex flex-col gap-2">
                            {application.status === 'OPTED_IN' && (
                              <Button size="sm" disabled={!reasonOk || busyId === application.id}
                                onClick={() => run(application.id, () => patchApplication(application.id, 'verify'), 'Tester verified')}>
                                Verify
                              </Button>
                            )}
                            {application.status === 'TESTING' && (
                              <Button size="sm" variant={application.testingPausedAt ? 'outline' : 'destructive'}
                                disabled={!reasonOk || busyId === application.id}
                                onClick={() => run(
                                  application.id,
                                  () => fetch(`/api/admin/applications/${application.id}/pause`, json({ action: application.testingPausedAt ? 'resume' : 'pause' })),
                                  application.testingPausedAt ? 'Testing resumed' : 'Testing paused'
                                )}>
                                {application.testingPausedAt ? 'Resume' : 'Pause'}
                              </Button>
                            )}
                            {CLOSABLE.includes(application.status) && (
                              <>
                                <Button size="sm" variant="outline" disabled={!reasonOk || busyId === application.id}
                                  onClick={() => run(application.id, () => patchApplication(application.id, 'reject'), 'Application closed')}>
                                  Close
                                </Button>
                                <Button size="sm" variant="outline" disabled={!reasonOk || busyId === application.id}
                                  onClick={() => run(application.id, () => fetch(`/api/admin/applications/${application.id}/withdraw`, json({})), 'Application withdrawn')}>
                                  Withdraw
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager {...data.applications} onChange={(page) => setPages((current) => ({ ...current, applications: page }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Install problem reports ({data.reports.total})</CardTitle>
              <CardDescription>Review and decide on these in the App Issues tab.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.reports.items.length === 0 && <p className="text-sm text-gray-500">No reports for this job.</p>}
              {data.reports.items.map((report) => (
                <div key={report.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{report.status}</Badge>
                    <span className="font-medium">{report.category.replaceAll('_', ' ')}</span>
                    <span className="text-gray-500">{report.tester.name || report.tester.email} · {formatDate(report.createdAt)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-gray-700">{report.details}</p>
                  {report.attachmentUrls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {report.attachmentUrls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="Tester screenshot" loading="lazy" className="h-24 rounded border object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  {report.adminNote && <p className="mt-1 text-xs text-gray-500">Admin note: {report.adminNote}</p>}
                  <div className="mt-2">
                    <StartThreadButton target={{ kind: 'ISSUE_REPORT', issueReportId: report.id }} />
                  </div>
                </div>
              ))}
              <Pager {...data.reports} onChange={(page) => setPages((current) => ({ ...current, reports: page }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily mission uploads ({data.missionSubmissions.total})</CardTitle>
              <CardDescription>Check what testers report to the developer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.missionSubmissions.items.length === 0 && <p className="text-sm text-gray-500">No mission uploads yet.</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                {data.missionSubmissions.items.map((submission) => (
                  <div key={submission.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Day {submission.task.dayNumber} · {submission.tester.name || submission.tester.email}</p>
                    <p className="text-xs text-gray-500">{formatDate(submission.completedAt)}</p>
                    <p className="mt-2 whitespace-pre-wrap text-gray-700">{submission.content}</p>
                    {submission.screenshotUrl && (
                      <a href={submission.screenshotUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={submission.screenshotUrl} alt={`Day ${submission.task.dayNumber} screenshot`} loading="lazy" className="h-32 rounded border object-cover" />
                      </a>
                    )}
                    <div className="mt-2">
                      <StartThreadButton target={{ kind: 'MISSION_SUBMISSION', taskSubmissionId: submission.id }} />
                    </div>
                  </div>
                ))}
              </div>
              <Pager {...data.missionSubmissions} onChange={(page) => setPages((current) => ({ ...current, submissions: page }))} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
