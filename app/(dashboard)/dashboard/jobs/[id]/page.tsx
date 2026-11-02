//app/(dashboard)/dashboard/jobs/[id]/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApplicationCard } from '@/components/applications/application-card'
import { DailyCheckInPanel } from '@/components/applications/daily-checkin-panel'
import { CheckoutForm } from '@/components/payments/checkout-form'
import { useToast } from '@/components/ui/toast-provider'
import { TestingReportViewer } from '@/components/jobs/testing-report-viewer'
import { DeveloperReports } from '@/components/jobs/developer-reports'
import { TaskSubmissionGrid } from '@/components/jobs/task-submission-grid'
import { GroupChat } from '@/components/group/group-chat'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { getDeveloperActions } from '@/lib/developer-actions'
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  DollarSign, 
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  ExternalLink,
  AlertCircle,
  Info,
  RefreshCw,
  MessageSquare,
  Package,
  MoreHorizontal,
} from 'lucide-react'
import Link from 'next/link'
import { formatEurFromCents, formatUsdFromEurCents } from '@/lib/currency'
import type { Cents } from '@/types/money'

interface Job {
  id: string
  appName: string
  appDescription: string
  packageName: string | null
  googlePlayLink: string
  appCategory: string | null
  supportedCountries: string[]
  testersNeeded: number
  testDuration: number
  minAndroidVersion: string | null
  planType: string | null
  /** Payment per tester in integer cents (EUR). */
  paymentPerTester: Cents
  /** Total tester budget in integer cents (EUR). */
  totalBudget: Cents
  /** Platform fee in integer cents (EUR). */
  platformFee: Cents
  stripePaymentIntent?: string | null
  status: string
  createdAt: string
  publishedAt: string | null
  scheduledStartAt: string | null
  developer: {
    name: string | null
    email: string
  }
  applications: Application[]
  _count: {
    applications: number
  }
}

interface Application {
  id: string
  status: string
  createdAt: string
  testingStartDate: string | null
  verificationImage: string | null
  verificationImage2?: string | null
  testingEndDate: string | null
  testingPausedAt?: string | null
  optInVerified: boolean
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
      createdAt: string
      muteDeveloperReplies?: boolean
      deviceInfo: {
      deviceModel: string
      androidVersion: string
      screenSize: string | null
    } | null
  }
}

const PLAN_LABELS: Record<string, string> = {
  STARTER: 'Starter',
  GROWTH: 'Growth',
  PRO: 'Pro',
}

const PLAN_COLORS: Record<string, string> = {
  STARTER: 'bg-gray-100 text-gray-800',
  GROWTH: 'bg-blue-100 text-blue-800',
  PRO: 'bg-purple-100 text-purple-800',
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [job, setJob] = useState<Job | null>(null)
  const [recruitment, setRecruitment] = useState<{
    eligible: number
    required: number
    selected: number
    paused: number
    verifiedCount: number
    canStart: boolean
    pausedToResume: number
    blockers: Array<{ code: string; message: string }>
    contactReleased: boolean
  } | null>(null)
  const [countryCodes, setCountryCodes] = useState('')
  const [mainTab, setMainTab] = useState('testers')
  const [testerFilter, setTesterFilter] = useState<'all' | 'pending' | 'active' | 'completed' | 'rejected'>('all')
  const [resumePausedApplications, setResumePausedApplications] = useState(false)
  const [resumeReason, setResumeReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    onConfirm: (() => Promise<void> | void) | null
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    onConfirm: null,
  })

  const openConfirm = (options: {
    title: string
    description: string
    confirmLabel?: string
    onConfirm: () => Promise<void> | void
  }) => {
    setConfirmDialog({
      open: true,
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel || 'Confirm',
      onConfirm: options.onConfirm,
    })
  }

  const closeConfirm = () => {
    setConfirmDialog((prev) => ({ ...prev, open: false }))
  }

  const handleConfirm = async () => {
    const action = confirmDialog.onConfirm
    closeConfirm()
    if (action) {
      await action()
    }
  }

  useEffect(() => {
    fetchJob()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchJob(true)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchJob = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const response = await fetch(`/api/jobs/${params.id}`)
      const data = await response.json()

      if (response.ok) {
        setJob(data.job)
        setRecruitment(data.recruitment ?? null)
        setCountryCodes((data.job.supportedCountries || []).join(', '))
      } else {
        setError(data.error || 'Failed to load job')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      if (!silent) setLoading(false)
      setRefreshing(false)
    }
  }

  const saveSupportedCountries = async () => {
    try {
      const response = await fetch(`/api/jobs/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supportedCountries: countryCodes.split(',').map((code) => code.trim().toUpperCase()).filter(Boolean),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast({ title: 'Error', description: data.error || 'Could not save supported countries', variant: 'destructive' })
        return
      }
      await fetchJob(true)
      toast({ title: 'Saved', description: 'Country coverage updated', variant: 'success' })
    } catch (error) {
      console.error('Failed to save supported countries:', error)
      toast({ title: 'Error', description: 'Could not save supported countries', variant: 'destructive' })
    }
  }

  const [startDateInput, setStartDateInput] = useState('')
  const tomorrowUtc = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const startTesting = () => {
    const resumesPaused = (recruitment?.pausedToResume ?? 0) > 0
    if (resumesPaused && (!resumePausedApplications || resumeReason.trim().length < 10)) {
      toast({
        title: 'Confirm resuming paused testers',
        description: 'Tick the confirmation box and give a reason of at least 10 characters first.',
        variant: 'destructive',
      })
      return
    }
    if (!resumesPaused && (!startDateInput || startDateInput < tomorrowUtc)) {
      toast({
        title: 'Pick a start date',
        description: `Choose tomorrow (${tomorrowUtc}) or a later date. Days change at midnight UTC.`,
        variant: 'destructive',
      })
      return
    }
    openConfirm({
      title: resumesPaused ? 'Resume paused testers now?' : `Schedule testing for ${startDateInput}?`,
      description: resumesPaused
        ? `This resumes the paused testers right now with their saved remaining time.`
        : `Day 1 is ${startDateInput} for all ${job?.testersNeeded ?? 0} verified testers, and day ${job?.testDuration} is the same calendar day for everyone (days change at midnight UTC). Testers can start any time on day 1. All verified testers will be told the date.`,
      confirmLabel: resumesPaused ? 'Resume' : 'Schedule testing',
      onConfirm: async () => {
        setActionLoading(true)
        try {
          const response = await fetch(`/api/jobs/${params.id}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              resumesPaused
                ? { resumePausedApplications: true, reason: resumeReason.trim() }
                : { startDate: startDateInput }
            ),
          })
          const data = await response.json()
          if (!response.ok) {
            toast({ title: 'Error', description: data.error || 'Could not schedule testing', variant: 'destructive' })
            return
          }
          await fetchJob(true)
          toast({ title: data.scheduled ? 'Testing scheduled 📅' : 'Testing resumed', description: data.message, variant: 'success' })
        } catch (error) {
          console.error('Failed to start testing:', error)
          toast({ title: 'Error', description: 'Could not start testing', variant: 'destructive' })
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const handleDelete = () => {
    openConfirm({
      title: 'Delete job?',
      description: 'Are you sure you want to delete this job? This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/jobs/${params.id}`, {
            method: 'DELETE',
          })

          if (response.ok) {
            router.push('/dashboard/jobs')
          } else {
            toast({ title: 'Error', description: 'Failed to delete job', variant: 'destructive' })
          }
        } catch (err) {
          toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
        }
      },
    })
  }

  const handlePublish = async () => {
    try {
      const response = await fetch(`/api/jobs/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'ACTIVE',
          publishedAt: new Date().toISOString()
        }),
      })

      if (response.ok) {
        fetchJob()
        toast({ title: 'Published', description: 'Job is now live', variant: 'success' })
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to publish job',
          variant: 'destructive',
        })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    }
  }

  const handleApprove = async (applicationId: string) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })

      if (response.ok) {
        fetchJob()
        toast({ title: 'Approved', description: 'Tester has been notified', variant: 'success' })
      } else {
        const data = await response.json()
        toast({ title: 'Error', description: data.error || 'Failed to approve', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (applicationId: string) => {
    openConfirm({
      title: 'Close this application?',
      description: 'The tester is told their application was closed. Use this when a tester cannot see the Install button or cannot join. Their paid spot becomes free for another tester.',
      confirmLabel: 'Close application',
      onConfirm: async () => {
        setActionLoading(true)
        try {
          const response = await fetch(`/api/applications/${applicationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reject' }),
          })

          if (response.ok) {
            fetchJob()
            toast({ title: 'Application closed', description: 'The paid spot is free for another tester', variant: 'default' })
          } else {
            const data = await response.json().catch(() => ({}))
            toast({ title: 'Error', description: data.error || 'Failed to close application', variant: 'destructive' })
          }
        } catch (err) {
          toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const handleCancel = async () => {
    const activeCount = activeApplications.length + approvedApplications.length + completedApplications.length

    const confirmMessage = activeCount > 0
      ? `Cancel this job with ${activeCount} active tester(s)?

Testers will be compensated based on their progress:
• Completed: 100% payment
• Testing: 75% payment
• Verified: 50% payment
• Opted-in: 25% payment
• Approved only: 0%

You will receive a partial refund for unused budget.`
      : 'Are you sure you want to cancel this job? You will receive a full refund.'

    openConfirm({
      title: 'Cancel job?',
      description: confirmMessage,
      confirmLabel: 'Cancel Job',
      onConfirm: async () => {
        setActionLoading(true)
        try {
          const response = await fetch(`/api/jobs/${params.id}/cancel`, {
            method: 'POST',
          })

          const data = await response.json()

          if (response.ok) {
            let message = data.message

            if (data.cancellation?.testerPayouts?.length > 0) {
              const paidTesters = data.cancellation.testerPayouts.filter((p: any) => p.amount > 0)
              if (paidTesters.length > 0) {
                message += `. ${paidTesters.length} tester(s) compensated totaling ${formatEurFromCents(data.cancellation.totalPaidToTesters)}`
              }
            }

            if (data.refund?.issued) {
              message += `. Your refund: ${formatEurFromCents(data.refund.amount)}`
            }

            toast({ title: 'Job Cancelled', description: message, variant: 'success' })
            router.push('/dashboard/jobs')
          } else {
            if (data.jobCancelled) {
              toast({ title: 'Warning', description: data.error, variant: 'warning' })
              router.push('/dashboard/jobs')
            } else {
              toast({ title: 'Error', description: data.error || 'Failed to cancel job', variant: 'destructive' })
            }
          }
        } catch (err) {
          toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const handleVerify = async (applicationId: string) => {
    openConfirm({
      title: 'Verify this tester?',
      description: 'Confirm the screenshot if itshows the Install button on Google Play. The tester joins the ready list. Testing does not start until you schedule a start date.',
      confirmLabel: 'Verify tester',
      onConfirm: async () => {
        setActionLoading(true)
        try {
          const response = await fetch(`/api/applications/${applicationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify' }),
          })

          if (response.ok) {
            fetchJob()
            toast({ title: 'Tester verified', description: 'The tester is on the ready list. Testing starts only on the date you schedule.', variant: 'success' })
          } else {
            toast({ title: 'Error', description: 'Failed to verify application', variant: 'destructive' })
          }
        } catch (err) {
          toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Job not found'}</p>
        <Link href="/dashboard/jobs">
          <Button>Back to Jobs</Button>
        </Link>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800'
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'COMPLETED': return 'bg-purple-100 text-purple-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const progressPercentage = ((recruitment?.eligible ?? 0) / job.testersNeeded) * 100
  const planLabel = job.planType ? (PLAN_LABELS[job.planType] || job.planType) : 'Custom'
  const planBadgeClass = job.planType ? (PLAN_COLORS[job.planType] || 'bg-gray-100 text-gray-800') : 'bg-gray-100 text-gray-800'

  // Group applications by status
  const pendingApplications = job.applications.filter(app => app.status === 'PENDING')
  const approvedApplications = job.applications.filter(app => app.status === 'APPROVED')
  const activeApplications = job.applications.filter(app => 
    ['OPTED_IN', 'VERIFIED', 'SCHEDULED', 'TESTING'].includes(app.status)
  )
  const completedApplications = job.applications.filter(app => app.status === 'COMPLETED')
  const rejectedApplications = job.applications.filter(app => app.status === 'REJECTED')
  const isDraft = job.status === 'DRAFT'
  const isCancelled = job.status === 'CANCELLED'
  const isCompleted = job.status === 'COMPLETED'
  const isActive = ['ACTIVE', 'IN_PROGRESS'].includes(job.status)

  // Testers who have uploaded opt-in screenshots — waiting for dev to verify
  const awaitingVerification = job.applications.filter(app => app.status === 'OPTED_IN')
  // Testers currently in testing
  const currentlyTesting = job.applications.filter(app => app.status === 'TESTING')
  // An earlier job with paused testers is IN_PROGRESS but can still restart them together with a new group.
  const isReadyToStart = isActive && (recruitment?.canStart ?? false)
  const totalChargeEurCents = job.totalBudget + job.platformFee
  const paymentReceived = !isDraft && !!job.stripePaymentIntent
  const paymentSummary = isDraft
    ? 'Awaiting payment. Complete checkout to publish this job.'
    : isCancelled
      ? paymentReceived
        ? 'Job cancelled. Refunds and partial payouts (if any) have been processed.'
        : 'Job cancelled before payment was completed.'
      : isCompleted
        ? 'Testing completed. Payouts are being processed.'
        : isActive
          ? 'Payment received and held in escrow while testers work.'
          : 'Payment status is being updated.'

  return (
    <div className="space-y-6">
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && closeConfirm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {confirmDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={actionLoading}>
              {confirmDialog.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/jobs">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-gray-900">{job.appName}</h2>
              <Badge className={getStatusColor(job.status)}>
                {job.status}
              </Badge>
              <Badge className={planBadgeClass}>
                <Package className="h-3 w-3 mr-1" />
                {planLabel}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">{job.appName} · {job.testDuration}-day test</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setRefreshing(true)
              fetchJob(true)
            }}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          {job.status === 'DRAFT' && (
            <Button onClick={handlePublish}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Publish Job
            </Button>
          )}
          <Link href={`/dashboard/jobs/${job.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {job.status !== 'CANCELLED' && job.status !== 'COMPLETED' && (
                <DropdownMenuItem onSelect={handleCancel} disabled={actionLoading} className="text-orange-600">
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Job
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={handleDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Needs your action */}
      {(() => {
        const actions = getDeveloperActions({
          isDraft,
          pendingApprovals: pendingApplications.length,
          screenshotsToVerify: awaitingVerification.length,
          readyToStart: isReadyToStart && (recruitment?.pausedToResume ?? 0) === 0,
          scheduledStartDate: job.scheduledStartAt ? job.scheduledStartAt.slice(0, 10) : null,
        })
        const goTo = (id: string) => {
          if (id === 'approve') {
            setMainTab('testers')
            setTesterFilter('pending')
          } else if (id === 'verify') {
            setMainTab('testers')
            setTesterFilter('active')
          }
          const anchor = id === 'start' ? 'start-banner' : id === 'publish' ? 'payment-status' : 'job-tabs'
          document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        return (
          <Card className={actions.length > 0 ? 'border-2 border-blue-300 bg-blue-50' : 'border-green-200 bg-green-50'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {actions.length > 0 ? 'Needs your action' : 'Nothing needs your action right now'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {actions.length === 0 && (
                <p className="text-sm text-green-900">New applications, screenshots and reports will show here.</p>
              )}
              {actions.map((action) => (
                <div key={action.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-900">{action.text}</p>
                  <Button size="sm" className="min-h-11 sm:min-h-9" onClick={() => goTo(action.id)}>
                    {action.buttonLabel}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })()}

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Plan
            </CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planLabel}</div>
            <p className="text-xs text-gray-500 mt-1">{job.testersNeeded} testers • €{(job.paymentPerTester / 100).toFixed(2)} each</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Applications
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recruitment?.eligible ?? 0} / {job.testersNeeded} eligible testers
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Duration
            </CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{job.testDuration} days</div>
            <p className="text-xs text-gray-500 mt-1">Testing period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Developer Charge
            </CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatEurFromCents(totalChargeEurCents)}</div>
            <p className="text-xs text-gray-500 mt-1">Charged in EUR</p>
          </CardContent>
        </Card>
      </div>

      {/* Step banners — guide dev through the correct sequence */}
      {/* Ready-to-start banner */}
      {isReadyToStart && (recruitment?.pausedToResume ?? 0) === 0 && (
        <div id="start-banner" className="rounded-xl border-2 border-green-400 bg-green-50 p-5 flex flex-col sm:flex-row sm:items-start gap-4">
          <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-green-900 text-base">
              {recruitment?.verifiedCount} / {job.testersNeeded} testers verified — ready to start!
            </p>
            <p className="text-sm text-green-800 mt-1">
              All required testers have confirmed they can install the app. Pick a start date (tomorrow or later). Day 1 is that date for everyone, and the {job.testDuration}-day period ends on the same calendar day for every tester. Days change at midnight UTC.
              {job.scheduledStartAt && (
                <> Currently scheduled: <strong>{job.scheduledStartAt.slice(0, 10)}</strong>.</>
              )}
            </p>
            <input
              type="date"
              min={tomorrowUtc}
              value={startDateInput}
              onChange={(event) => setStartDateInput(event.target.value)}
              aria-label="Testing start date"
              className="mt-2 rounded-md border border-green-400 bg-white px-3 py-2 text-sm"
            />
          </div>
          <Button
            onClick={startTesting}
            disabled={actionLoading}
            className="bg-green-600 hover:bg-green-700 text-white shrink-0"
          >
            {job.scheduledStartAt ? 'Change start date' : 'Schedule testing'}
          </Button>
        </div>
      )}

      {isActive && (
        <Card className="border-indigo-200">
          <CardHeader>
            <CardTitle>Recruitment progress</CardTitle>
            <CardDescription>
              Approve applicants one by one. Each approved tester gets the Play Store link immediately and their email is visible so you can add them to Play Console. Once they upload a screenshot showing the Install button, verify them. The Schedule testing button appears when you have enough verified testers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="job-supported-countries" className="text-sm font-medium">Supported country codes</label>
              <div className="flex gap-2">
                <input
                  id="job-supported-countries"
                  value={countryCodes}
                  onChange={(event) => setCountryCodes(event.target.value.toUpperCase())}
                  placeholder="US, GB, MA"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <Button onClick={saveSupportedCountries} disabled={actionLoading}>Save</Button>
              </div>
              <p className="text-xs text-gray-500">Enter two-letter ISO codes separated by commas.</p>
            </div>

            <div className="rounded-md bg-gray-50 p-3 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Approved (waiting for screenshot)</span>
                <strong>{job.applications.filter(a => a.status === 'APPROVED').length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Screenshot submitted (awaiting review)</span>
                <strong>{awaitingVerification.length}</strong>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-medium">Verified — ready to start</span>
                <strong className={(recruitment?.verifiedCount ?? 0) >= job.testersNeeded ? 'text-green-700' : 'text-gray-900'}>
                  {recruitment?.verifiedCount ?? 0} / {job.testersNeeded} needed
                </strong>
              </div>
            </div>

            {(recruitment?.pausedToResume ?? 0) > 0 && (
              <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                <p>
                  {recruitment?.pausedToResume} earlier tester{recruitment?.pausedToResume === 1 ? ' is' : 's are'} paused.
                  Starting will resume only their saved remaining time. Their original start date and finished work stay.
                </p>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={resumePausedApplications}
                    onChange={(event) => setResumePausedApplications(event.target.checked)}
                  />
                  <span>I confirm resuming the paused testers now.</span>
                </label>
                <input
                  value={resumeReason}
                  onChange={(event) => setResumeReason(event.target.value)}
                  maxLength={1000}
                  placeholder="Reason for resuming (at least 10 characters)"
                  className="w-full rounded-md border border-amber-400 bg-white px-3 py-2"
                />
              </div>
            )}

            {isReadyToStart ? (
              <div className="space-y-2">
                <Button
                  onClick={startTesting}
                  disabled={actionLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  {(recruitment?.pausedToResume ?? 0) > 0
                    ? `Resume paused testers (${recruitment?.verifiedCount} ready)`
                    : `Schedule testing (${recruitment?.verifiedCount} testers ready)`}
                </Button>
                {(recruitment?.pausedToResume ?? 0) === 0 && (
                  <p className="text-xs text-gray-500">Use the date picker in the green box above to choose the start date.</p>
                )}
              </div>
            ) : (
              <div className="space-y-1 text-xs text-gray-500">
                <p>
                  Keep approving applicants and verifying their screenshots. The Schedule testing button appears once {job.testersNeeded} testers are verified.
                </p>
                {(recruitment?.blockers ?? [])
                  .filter((blocker) => blocker.code !== 'NOT_ENOUGH_VERIFIED')
                  .map((blocker) => (
                    <p key={blocker.code} className="font-medium text-amber-700">{blocker.message}</p>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card id="payment-status">
        <CardHeader>
          <CardTitle>Payment Status</CardTitle>
          <CardDescription>Clear view of escrow and payouts</CardDescription>
        </CardHeader>        <CardContent className="space-y-4">
          <div className="text-sm">{paymentSummary}</div>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              {paymentReceived ? (
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              )}
              <div>
                <p className="font-medium">Payment received</p>
                <p className="text-xs text-gray-600">
                  {paymentReceived
                    ? isCancelled
                      ? 'Payment was captured; refund processing has started.'
                      : 'Paid and held in escrow.'
                    : 'Not paid yet.'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium">Tester payouts</p>
                <p className="text-xs text-gray-600">
                  {isCompleted ? 'Payouts are processing.' : 'Payouts run after testing completes.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div id="job-tabs" />

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="testers">
                Testers ({job.applications.length})
              </TabsTrigger>
              <TabsTrigger value="reports">
                Reports &amp; videos
              </TabsTrigger>
              <TabsTrigger value="chat">
                Chat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="testers" className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {([
                  ['all', 'All', job.applications.length],
                  ['pending', 'To approve', pendingApplications.length],
                  ['active', 'Active', activeApplications.length],
                  ['completed', 'Done', completedApplications.length],
                  ['rejected', 'Rejected', rejectedApplications.length],
                ] as const).map(([key, label, count]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={testerFilter === key ? 'default' : 'outline'}
                    className="min-h-11 sm:min-h-9"
                    onClick={() => setTesterFilter(key)}
                  >
                    {label} ({count})
                  </Button>
                ))}
              </div>
              {(() => {
                const filtered =
                  testerFilter === 'pending' ? pendingApplications
                  : testerFilter === 'active' ? activeApplications
                  : testerFilter === 'completed' ? completedApplications
                  : testerFilter === 'rejected' ? rejectedApplications
                  : job.applications
                if (filtered.length === 0) {
                  return (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-12 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p className="font-medium">
                            {job.applications.length === 0 ? 'No applications yet' : 'No testers in this list'}
                          </p>
                          {job.applications.length === 0 && (
                            <p className="text-sm mt-1">
                              {job.status === 'DRAFT'
                                ? 'Publish your job to start receiving applications'
                                : 'Testers will appear here once they apply'}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                }
                return filtered.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onApprove={application.status === 'PENDING' ? handleApprove : undefined}
                    onReject={application.status === 'PENDING' ? handleReject : undefined}
                    onVerify={['OPTED_IN', 'VERIFIED', 'SCHEDULED', 'TESTING'].includes(application.status) ? handleVerify : undefined}
                    loading={actionLoading}
                  />
                ))
              })()}
            </TabsContent>

            <TabsContent value="reports" className="space-y-8">
              <DeveloperReports jobId={job.id} />
              <section className="space-y-3">
                <h3 className="font-semibold text-gray-900">Daily mission submissions</h3>
                <TaskSubmissionGrid jobId={job.id} />
              </section>
              <section className="space-y-3">
                <h3 className="font-semibold text-gray-900">Daily check-ins</h3>
                {activeApplications.length === 0 && completedApplications.length === 0 ? (
                  <p className="text-sm text-gray-500">Check-ins appear here once testers start testing.</p>
                ) : (
                  [...activeApplications, ...completedApplications].map(application => (
                    <div key={application.id}>
                      <p className="text-sm font-medium text-gray-600 mb-2">
                        {application.tester.name || 'Tester'}
                      </p>
                      <DailyCheckInPanel
                        applicationId={application.id}
                        applicationStatus={application.status}
                        testingStartDate={application.testingStartDate}
                        isDeveloperView={true}
                      />
                    </div>
                  ))
                )}
              </section>
              <section className="space-y-3">
                <h3 className="font-semibold text-gray-900">Testing report</h3>
                <TestingReportViewer jobId={job.id} />
              </section>
            </TabsContent>

            <TabsContent value="chat">
              <GroupChat jobId={job.id} hideBack />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Plan</p>
                <div className="flex items-center gap-2">
                  <Badge className={planBadgeClass}>
                    {planLabel}
                  </Badge>
                  <span className="text-sm text-gray-500">{job.testersNeeded} testers</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Description</p>
                <p className="text-sm">{job.appDescription}</p>
              </div>

              {job.packageName && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Package Name</p>
                  <p className="text-sm font-mono">{job.packageName}</p>
                </div>
              )}

              {job.appCategory && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Category</p>
                  <p className="text-sm capitalize">{job.appCategory}</p>
                </div>
              )}

              {job.minAndroidVersion && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Min Android Version</p>
                  <p className="text-sm">{job.minAndroidVersion}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600 mb-1">Created</p>
                <p className="text-sm">
                  {new Date(job.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Google Play Link</CardTitle>
            </CardHeader>
            <CardContent>
              <a 
                href={job.googlePlayLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
              >
                <span className="break-all">{job.googlePlayLink}</span>
                <ExternalLink className="h-4 w-4 shrink-0" />
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tester contact details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              Tester emails appear on each application as soon as you approve that tester, so you can add them in Google Play Console. Pending applicants’ emails stay private.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
          <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Plan</span>
                <span className="font-medium">{planLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Testers</span>
                <span className="font-medium">{job.testersNeeded}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment per tester</span>
                <span className="font-medium">{formatEurFromCents(job.paymentPerTester)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Test duration</span>
                <span className="font-medium">{job.testDuration} days</span>
              </div>

              <div className="space-y-2 border-t pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tester payments</span>
                  <span className="font-medium">{formatEurFromCents(job.totalBudget)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Platform fee</span>
                  <span className="font-medium">{formatEurFromCents(job.platformFee)}</span>
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-semibold">Total</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-blue-600">
                      {formatEurFromCents(totalChargeEurCents)}
                    </span>
                    <p className="text-xs text-gray-400">≈{formatUsdFromEurCents(totalChargeEurCents)} USD</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {job.status === 'DRAFT' && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-sm text-blue-900 mb-4">
                  Complete the EUR payment first, then publish the job to make it visible to testers.
                </p>
                <div className="mb-4">
                  <CheckoutForm jobId={job.id} amountEurCents={totalChargeEurCents} />
                </div>
                <Button onClick={handlePublish} className="w-full">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Publish Job
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}