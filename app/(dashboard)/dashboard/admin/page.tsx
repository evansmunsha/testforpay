'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast-provider'
import {
  Users, Briefcase, DollarSign, TrendingUp, AlertCircle, Info,
  CheckCircle, Clock, XCircle, ShieldAlert, Flag, MessageSquare,
  Eye, Trash2, TrendingDown, Activity, Zap, AlertTriangle,
} from 'lucide-react'
import { formatEurFromCents } from '@/lib/currency'
import type { Cents } from '@/types/money'

interface Stats {
  totalUsers: number
  totalDevelopers: number
  totalTesters: number
  totalJobs: number
  activeJobs: number
  completedJobs: number
  cancelledJobs: number
  totalApplications: number
  totalContactMessages: number
  totalRevenue: Cents
  totalPaidOut: Cents
  pendingPayments: number
  failedPayments: number
  revenue: { allTime: Cents; thisMonth: Cents; lastMonth: Cents; growthPercent: number }
  performance: { jobCompletionRate: number; appCompletionRate: number; jobsWithZeroApplications: number; newJobsLast7d: number }
  attention: { jobsWithZeroApplications: number; testersStuckInVerification: number; activeTesters: number; failedPayments: number }
  activity: { activeUsersLast24h: number; activeUsersLast7d: number; activeUsersLast30d: number; newUsersLast7d: number; newUsersLast30d: number }
  health: { verifiedEmailCount: number; unverifiedEmailCount: number; testersWithStripe: number; testersWithoutStripe: number }
}

interface User {
  id: string; email: string; name: string | null; role: string; createdAt: string
  stripeAccountId: string | null; suspended: boolean; suspendReason: string | null
  lastLoginAt: string | null; loginCount: number; emailVerified: boolean
  _count: { developedJobs: number; applications: number }
}

interface Job {
  id: string; appName: string; status: string; testersNeeded: number
  paymentPerTester: Cents; createdAt: string
  developer: { id: string; email: string; name: string | null }
  _count: { applications: number }
}

interface Application {
  id: string; status: string; createdAt: string
  job: { id: string; appName: string }
  tester: { id: string; email: string; name: string | null }
}

interface Payment {
  id: string; amount: Cents; status: string; createdAt: string; failureReason?: string | null
  application: { job: { id: string; appName: string }; tester: { id: string; email: string; name: string | null } }
}

interface ContactMessage {
  id: string; name: string; email: string; subject: string; message: string
  ipAddress: string | null; createdAt: string
}

interface FraudStats {
  totalFlagged: number; unresolvedLogs: number; recentHighSeverity: number
  topSuspiciousUsers: Array<{ id: string; email: string; name: string | null; fraudScore: number; flagged: boolean; createdAt: string; _count: { applications: number } }>
}

interface FraudLog {
  id: string; type: string; severity: string; description: string; ipAddress: string | null
  resolved: boolean; createdAt: string
  user: { id: string; email: string; name: string | null; role: string } | null
}

interface FeedbackReport {
  id: string; reason: string; details: string | null; createdAt: string; resolvedAt: string | null
  reporter: { id: string; email: string; name: string | null; role: string }
  application: { id: string; developerReply?: string | null; job: { id: string; appName: string; developer: { id: string; email: string; name: string | null } } }
}

interface TestimonialFeedback {
  id: string; type: string; rating: number; title: string; message: string; approved: boolean
  createdAt: string; displayName: string | null; companyName: string | null
  user: { id: string; email: string; name: string | null; role: string }
}

// ── Reusable stat card ─────────────────────────────────────────────────────────
function StatCard({ title, value, sub, icon: Icon, color = 'blue', loading }: {
  title: string; value: string | number; sub?: string
  icon: React.ElementType; color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'orange'
  loading?: boolean
}) {
  const colors = {
    blue: 'text-blue-600 bg-blue-50', green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50', yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-600 bg-red-50', orange: 'text-orange-600 bg-orange-50',
  }
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
              {loading ? <span className="inline-block h-7 w-16 animate-pulse rounded bg-gray-200" /> : value}
            </p>
            {sub && <p className="text-xs text-gray-400 mt-1 truncate">{loading ? '' : sub}</p>}
          </div>
          <div className={`shrink-0 p-2 sm:p-3 rounded-xl ${colors[color]}`}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Table wrapper — scroll on small screens ─────────────────────────────────────
function ScrollTable({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto -mx-4 sm:mx-0"><div className="min-w-[600px] sm:min-w-0 px-4 sm:px-0">{children}</div></div>
}

// ── Loading skeleton rows ───────────────────────────────────────────────────────
function TableSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-3 py-3">
          {[...Array(cols)].map((_, j) => (
            <div key={j} className="h-4 flex-1 animate-pulse rounded bg-gray-200" />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [processingPayouts, setProcessingPayouts] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([])
  const [selectedContact, setSelectedContact] = useState<ContactMessage | null>(null)
  const [fraudStats, setFraudStats] = useState<FraudStats | null>(null)
  const [fraudLogs, setFraudLogs] = useState<FraudLog[]>([])
  const [feedbackReports, setFeedbackReports] = useState<FeedbackReport[]>([])
  const [testimonials, setTestimonials] = useState<TestimonialFeedback[]>([])
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'pending' | 'approved'>('pending')
  const [loadingTab, setLoadingTab] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; confirmLabel: string; onConfirm: (() => Promise<void> | void) | null }>
    ({ open: false, title: '', description: '', confirmLabel: 'Confirm', onConfirm: null })
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [suspendTargetId, setSuspendTargetId] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState('Violation of Terms of Service')
  const failedPaymentsCount = payments.filter(p => p.status === 'FAILED').length
  const unresolvedReportsCount = feedbackReports.filter(r => !r.resolvedAt).length
  const attentionCount = (stats?.attention.jobsWithZeroApplications ?? 0)
    + (stats?.attention.testersStuckInVerification ?? 0)
    + (stats?.attention.failedPayments ?? 0)

  const openConfirm = (opts: { title: string; description: string; confirmLabel?: string; onConfirm: () => Promise<void> | void }) => {
    setConfirmDialog({ open: true, title: opts.title, description: opts.description, confirmLabel: opts.confirmLabel || 'Confirm', onConfirm: opts.onConfirm })
  }
  const closeConfirm = () => setConfirmDialog(p => ({ ...p, open: false }))
  const handleConfirm = async () => { const a = confirmDialog.onConfirm; closeConfirm(); if (a) await a() }

  const openSuspendDialog = (id: string) => { setSuspendTargetId(id); setSuspendReason('Violation of Terms of Service'); setSuspendDialogOpen(true) }

  const performSuspendUser = async (userId: string, action: 'suspend' | 'unsuspend', reason?: string | null) => {
    setActionLoading(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, reason }) })
      const data = await res.json()
      if (res.ok) { toast({ title: 'Success', description: data.message, variant: 'success' }); fetchUsers() }
      else toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' })
    } catch { toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' }) }
    finally { setActionLoading(null) }
  }

  const handleSuspendUser = async (userId: string, action: 'suspend' | 'unsuspend') => {
    if (action === 'suspend') { openSuspendDialog(userId); return }
    await performSuspendUser(userId, 'unsuspend', null)
  }

  const handleConfirmSuspend = async () => {
    if (!suspendTargetId) return
    const id = suspendTargetId; setSuspendTargetId(null); setSuspendDialogOpen(false)
    await performSuspendUser(id, 'suspend', suspendReason || null)
  }

  const handleDeleteUser = async (userId: string) => {
    openConfirm({ title: 'Delete user?', description: 'Permanently delete this user? This cannot be undone.', confirmLabel: 'Delete',
      onConfirm: async () => {
        setActionLoading(userId)
        try {
          const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
          const data = await res.json()
          if (res.ok) { toast({ title: 'Deleted', description: data.message, variant: 'success' }); fetchUsers(); fetchStats() }
          else toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' })
        } catch { toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' }) }
        finally { setActionLoading(null) }
      }
    })
  }

  const handleProcessPayouts = async () => {
    setProcessingPayouts(true)
    try {
      const res = await fetch('/api/admin/payouts/process', { method: 'POST' })
      const data = await res.json()
      if (res.ok) { toast({ title: 'Payouts Processed', description: `${data.processed} payouts processed`, variant: 'success' }); fetchStats() }
      else toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' })
    } catch { toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' }) }
    finally { setProcessingPayouts(false) }
  }

  useEffect(() => { if (!loading && user?.role !== 'ADMIN') router.push('/dashboard') }, [user, loading, router])
  useEffect(() => { if (!loading && user?.role === 'ADMIN') { fetchStats(); fetchUsers() } }, [loading, user])
  useEffect(() => {
    if (!loading && user?.role === 'ADMIN') {
      if (activeTab === 'users') fetchUsers()
      else if (activeTab === 'jobs') fetchJobs()
      else if (activeTab === 'applications') fetchApplications()
      else if (activeTab === 'payments') fetchPayments()
      else if (activeTab === 'contacts') fetchContactMessages()
      else if (activeTab === 'reports') fetchFeedbackReports()
      else if (activeTab === 'testimonials') fetchTestimonials()
      else if (activeTab === 'fraud') fetchFraudData()
    }
  }, [activeTab, loading, user, feedbackFilter])

  const fetchStats = async () => {
    setLoadingStats(true)
    try { const res = await fetch('/api/admin/stats'); const data = await res.json(); if (res.ok) setStats(data.stats) }
    catch (e) { console.error('Failed to fetch stats:', e) }
    finally { setLoadingStats(false) }
  }
  const fetchUsers = async () => { setLoadingTab(true); try { const res = await fetch('/api/admin/users'); const data = await res.json(); if (res.ok) setUsers(data.users || []) } catch (e) { console.error(e) } finally { setLoadingTab(false) } }
  const fetchJobs = async () => { setLoadingTab(true); try { const res = await fetch('/api/admin/jobs'); const data = await res.json(); if (res.ok) setJobs(data.jobs || []) } catch (e) { console.error(e) } finally { setLoadingTab(false) } }
  const fetchApplications = async () => { setLoadingTab(true); try { const res = await fetch('/api/admin/applications'); const data = await res.json(); if (res.ok) setApplications(data.applications || []) } catch (e) { console.error(e) } finally { setLoadingTab(false) } }
  const fetchPayments = async () => { setLoadingTab(true); try { const res = await fetch('/api/admin/payments'); const data = await res.json(); if (res.ok) setPayments(data.payments || []) } catch (e) { console.error(e) } finally { setLoadingTab(false) } }
  const fetchContactMessages = async () => { setLoadingTab(true); try { const res = await fetch('/api/admin/contact'); const data = await res.json(); if (res.ok) setContactMessages(data.messages || []) } catch (e) { console.error(e) } finally { setLoadingTab(false) } }
  const fetchFraudData = async () => {
    setLoadingTab(true)
    try {
      const [sRes, lRes] = await Promise.all([fetch('/api/admin/fraud?view=stats'), fetch('/api/admin/fraud?view=logs&resolved=false')])
      const sData = await sRes.json(); const lData = await lRes.json()
      if (sRes.ok) setFraudStats(sData); if (lRes.ok) setFraudLogs(lData.logs || [])
    } catch (e) { console.error(e) } finally { setLoadingTab(false) }
  }
  const fetchFeedbackReports = async () => { setLoadingTab(true); try { const res = await fetch('/api/admin/feedback-reports?resolved=false'); const data = await res.json(); if (res.ok) setFeedbackReports(data.reports || []) } catch (e) { console.error(e) } finally { setLoadingTab(false) } }
  const fetchTestimonials = async () => {
    setLoadingTab(true)
    try {
      const p = new URLSearchParams(); if (feedbackFilter === 'pending') p.set('approved', 'false'); if (feedbackFilter === 'approved') p.set('approved', 'true')
      const res = await fetch(`/api/admin/feedback?${p}`); const data = await res.json(); if (res.ok) setTestimonials(data.feedback || [])
    } catch (e) { console.error(e) } finally { setLoadingTab(false) }
  }

  const handleDeleteContactMessage = async (id: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/contact/${id}`, { method: 'DELETE' }); const data = await res.json()
      if (res.ok) { toast({ title: 'Deleted', description: data.message || 'Deleted', variant: 'success' }); setContactMessages(p => p.filter(m => m.id !== id)); if (selectedContact?.id === id) setSelectedContact(null) }
      else toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' })
    } catch { toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' }) } finally { setActionLoading(null) }
  }
  const confirmDeleteContactMessage = (m: ContactMessage) => openConfirm({ title: 'Delete message?', description: `Delete message from ${m.name}?`, confirmLabel: 'Delete', onConfirm: () => handleDeleteContactMessage(m.id) })

  const handleResolveReport = async (id: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/feedback-reports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolved: true }) })
      if (res.ok) { toast({ title: 'Resolved', description: 'Report resolved', variant: 'success' }); fetchFeedbackReports() }
    } catch { toast({ title: 'Error', description: 'Failed', variant: 'destructive' }) } finally { setActionLoading(null) }
  }

  const handleToggleFeedbackApproval = async (id: string, approved: boolean) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approved }) })
      const data = await res.json()
      if (res.ok) { toast({ title: 'Updated', description: data.message, variant: 'success' }); fetchTestimonials() }
    } catch { toast({ title: 'Error', description: 'Failed', variant: 'destructive' }) } finally { setActionLoading(null) }
  }

  const handleDeleteFeedback = async (id: string) => {
    openConfirm({ title: 'Delete feedback?', description: 'Delete permanently?', confirmLabel: 'Delete', onConfirm: async () => {
      setActionLoading(id)
      try { const res = await fetch(`/api/admin/feedback/${id}`, { method: 'DELETE' }); const data = await res.json(); if (res.ok) { toast({ title: 'Deleted', description: data.message, variant: 'success' }); fetchTestimonials() } }
      catch { toast({ title: 'Error', description: 'Failed', variant: 'destructive' }) } finally { setActionLoading(null) }
    }})
  }

  const handleResolveFraudLog = async (id: string) => {
    setActionLoading(id)
    try { const res = await fetch('/api/admin/fraud', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resolve-log', logId: id }) }); if (res.ok) { toast({ title: 'Resolved', description: 'Fraud log resolved', variant: 'success' }); fetchFraudData() } }
    catch { toast({ title: 'Error', description: 'Failed', variant: 'destructive' }) } finally { setActionLoading(null) }
  }

  const handleClearUserFlags = async (userId: string) => {
    setActionLoading(userId)
    try { const res = await fetch('/api/admin/fraud', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear-flags', userId }) }); if (res.ok) { toast({ title: 'Cleared', description: 'Flags cleared', variant: 'success' }); fetchFraudData() } }
    catch { toast({ title: 'Error', description: 'Failed', variant: 'destructive' }) } finally { setActionLoading(null) }
  }

  const handleRetryPayout = async (paymentId: string) => {
    setActionLoading(paymentId)
    try {
      const res = await fetch(`/api/admin/payments/retry/${paymentId}`, { method: 'POST' })
      if (res.ok) { await fetchPayments(); toast({ title: 'Retry Success', description: 'Payout retry triggered', variant: 'success' }) }
      else { const data = await res.json(); toast({ title: 'Retry Failed', description: data.error || 'Failed', variant: 'destructive' }) }
    } catch { toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' }) } finally { setActionLoading(null) }
  }

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
      ACTIVE: { variant: 'default', icon: CheckCircle }, COMPLETED: { variant: 'secondary', icon: CheckCircle },
      DRAFT: { variant: 'outline', icon: Clock }, PENDING: { variant: 'outline', icon: Clock },
      APPROVED: { variant: 'default', icon: CheckCircle }, REJECTED: { variant: 'destructive', icon: XCircle },
      TESTING: { variant: 'default', icon: Clock }, FAILED: { variant: 'destructive', icon: XCircle },
      ESCROWED: { variant: 'outline', icon: Clock }, PROCESSING: { variant: 'default', icon: Clock },
    }
    const c = cfg[status] || { variant: 'outline' as const, icon: Clock }
    const Icon = c.icon
    return <Badge variant={c.variant} className="flex items-center gap-1 w-fit"><Icon className="h-3 w-3" />{status}</Badge>
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
  if (user?.role !== 'ADMIN') return null

  return (
    <div className="space-y-6 pb-10">

      {/* ── Confirm Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={confirmDialog.open} onOpenChange={o => !o && closeConfirm()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{confirmDialog.title}</DialogTitle><DialogDescription className="whitespace-pre-line">{confirmDialog.description}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={closeConfirm}>Cancel</Button><Button variant="destructive" onClick={handleConfirm} disabled={!!actionLoading}>{confirmDialog.confirmLabel}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Suspend Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={suspendDialogOpen} onOpenChange={o => !o && setSuspendDialogOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Suspend user?</DialogTitle><DialogDescription>Provide an optional reason.</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label htmlFor="sr">Reason</Label><Input id="sr" value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Violation of Terms of Service" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleConfirmSuspend} disabled={!!actionLoading}>Suspend</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Platform overview and management</p>
        </div>
        <Button onClick={handleProcessPayouts} disabled={processingPayouts} className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
          {processingPayouts ? 'Processing...' : 'Process Due Payouts'}
        </Button>
      </div>

      {/* ── Needs Attention banner ──────────────────────────────────────────── */}
      {!loadingStats && attentionCount > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm text-amber-900">
                <p className="font-semibold">{attentionCount} item{attentionCount !== 1 ? 's' : ''} need your attention</p>
                {(stats?.attention.jobsWithZeroApplications ?? 0) > 0 && <p>• {stats!.attention.jobsWithZeroApplications} active job{stats!.attention.jobsWithZeroApplications !== 1 ? 's' : ''} with zero applications</p>}
                {(stats?.attention.testersStuckInVerification ?? 0) > 0 && <p>• {stats!.attention.testersStuckInVerification} tester{stats!.attention.testersStuckInVerification !== 1 ? 's' : ''} stuck in verification for 48h+</p>}
                {(stats?.attention.failedPayments ?? 0) > 0 && <p>• {stats!.attention.failedPayments} failed payout{stats!.attention.failedPayments !== 1 ? 's' : ''} to retry</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Core stats: 2 cols on mobile, 4 on desktop ──────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Users" value={stats?.totalUsers ?? 0} sub={`${stats?.totalDevelopers ?? 0} devs · ${stats?.totalTesters ?? 0} testers`} icon={Users} color="blue" loading={loadingStats} />
        <StatCard title="Total Jobs" value={stats?.totalJobs ?? 0} sub={`${stats?.activeJobs ?? 0} active · ${stats?.completedJobs ?? 0} done`} icon={Briefcase} color="green" loading={loadingStats} />
        <StatCard title="Applications" value={stats?.totalApplications ?? 0} sub="All time" icon={TrendingUp} color="purple" loading={loadingStats} />
        <StatCard title="All-time Revenue" value={loadingStats ? '...' : formatEurFromCents(stats?.totalRevenue ?? 0)} sub="Platform fees" icon={DollarSign} color="yellow" loading={loadingStats} />
      </div>

      {/* ── Secondary stats row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Revenue This Month" value={loadingStats ? '...' : formatEurFromCents(stats?.revenue.thisMonth ?? 0)}
          sub={loadingStats ? '' : `${stats!.revenue.growthPercent >= 0 ? '+' : ''}${stats!.revenue.growthPercent}% vs last month`}
          icon={stats?.revenue.growthPercent !== undefined && stats.revenue.growthPercent >= 0 ? TrendingUp : TrendingDown}
          color={stats?.revenue.growthPercent !== undefined && stats.revenue.growthPercent >= 0 ? 'green' : 'red'} loading={loadingStats} />
        <StatCard title="Pending Payments" value={stats?.pendingPayments ?? 0} sub="Awaiting processing" icon={Clock} color="orange" loading={loadingStats} />
        <StatCard title="Failed Payouts" value={stats?.failedPayments ?? 0} sub="Need retry" icon={AlertCircle} color={stats?.failedPayments ? 'red' : 'green'} loading={loadingStats} />
        <StatCard title="Active Testers" value={stats?.attention.activeTesters ?? 0} sub="Currently in TESTING" icon={Activity} color="blue" loading={loadingStats} />
      </div>

      {/* ── Activity + Health row ───────────────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-blue-500" />User Activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[['Last 24 hours', stats?.activity.activeUsersLast24h], ['Last 7 days', stats?.activity.activeUsersLast7d], ['Last 30 days', stats?.activity.activeUsersLast30d]].map(([label, val]) => (
              <div key={label as string} className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-bold text-blue-600">{loadingStats ? '—' : val}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 space-y-2">
              {[['New (7 days)', stats?.activity.newUsersLast7d, 'text-green-600'], ['New (30 days)', stats?.activity.newUsersLast30d, 'text-green-600']].map(([label, val, cls]) => (
                <div key={label as string} className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-bold ${cls}`}>{loadingStats ? '—' : val}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />Platform Health</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              ['Email verified', stats?.health.verifiedEmailCount, 'text-green-600'],
              ['Not verified', stats?.health.unverifiedEmailCount, 'text-red-500'],
              ['Testers with Stripe', stats?.health.testersWithStripe, 'text-green-600'],
              ['Testers without Stripe', stats?.health.testersWithoutStripe, 'text-amber-500'],
            ].map(([label, val, cls]) => (
              <div key={label as string} className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{label}</span>
                <span className={`font-bold ${cls}`}>{loadingStats ? '—' : val}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-purple-500" />Performance</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              ['Job completion rate', `${stats?.performance.jobCompletionRate ?? 0}%`, 'text-blue-600'],
              ['App completion rate', `${stats?.performance.appCompletionRate ?? 0}%`, 'text-blue-600'],
              ['Jobs without applicants', stats?.performance.jobsWithZeroApplications, stats?.performance.jobsWithZeroApplications ? 'text-red-500' : 'text-green-600'],
              ['New jobs (7 days)', stats?.performance.newJobsLast7d, 'text-green-600'],
            ].map(([label, val, cls]) => (
              <div key={label as string} className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{label}</span>
                <span className={`font-bold ${cls}`}>{loadingStats ? '—' : val}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex w-max gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users <Badge variant="secondary" className="ml-1">{stats?.totalUsers || 0}</Badge></TabsTrigger>
            <TabsTrigger value="jobs">Jobs <Badge variant="secondary" className="ml-1">{stats?.totalJobs || 0}</Badge></TabsTrigger>
            <TabsTrigger value="applications">Apps <Badge variant="secondary" className="ml-1">{stats?.totalApplications || 0}</Badge></TabsTrigger>
            <TabsTrigger value="contacts">Msgs <Badge variant="secondary" className="ml-1">{stats?.totalContactMessages || 0}</Badge></TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="reports">
              Reports {unresolvedReportsCount > 0 && <Badge variant="destructive" className="ml-1">{unresolvedReportsCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
            <TabsTrigger value="fraud" className="text-red-600">
              <ShieldAlert className="h-3.5 w-3.5 mr-1" />Fraud {(fraudStats?.unresolvedLogs ?? 0) > 0 && <Badge variant="destructive" className="ml-1">{fraudStats?.unresolvedLogs}</Badge>}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Overview tab ──────────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Recent Jobs Status</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[['ACTIVE', stats?.activeJobs, 'bg-blue-500'], ['COMPLETED', stats?.completedJobs, 'bg-green-500'], ['CANCELLED', stats?.cancelledJobs, 'bg-red-400']].map(([label, count, bg]) => (
                  <div key={label as string} className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${bg}`} />
                    <span className="text-sm text-gray-600 flex-1">{label}</span>
                    <span className="font-bold text-sm">{loadingStats ? '—' : count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Revenue Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  ['This month', formatEurFromCents(stats?.revenue.thisMonth ?? 0)],
                  ['Last month', formatEurFromCents(stats?.revenue.lastMonth ?? 0)],
                  ['All time', formatEurFromCents(stats?.revenue.allTime ?? 0)],
                  ['Growth', `${stats?.revenue.growthPercent ?? 0}%`],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-bold">{loadingStats ? '—' : val}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Users tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="users">
          <Card>
            <CardHeader><CardTitle>User Management</CardTitle><CardDescription>All registered users</CardDescription></CardHeader>
            <CardContent>
              {loadingTab ? <TableSkeleton cols={6} /> : users.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><Users className="h-10 w-10 mx-auto mb-3" /><p>No users found</p></div>
              ) : (
                <ScrollTable>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-gray-500">
                      <th className="py-3 px-2 font-medium">User</th>
                      <th className="py-3 px-2 font-medium">Role</th>
                      <th className="py-3 px-2 font-medium">Status</th>
                      <th className="py-3 px-2 font-medium">Activity</th>
                      <th className="py-3 px-2 font-medium">Stripe</th>
                      <th className="py-3 px-2 font-medium">Actions</th>
                    </tr></thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className={`border-b hover:bg-gray-50 transition-colors ${u.suspended ? 'bg-red-50' : ''}`}>
                          <td className="py-3 px-2">
                            <div className="font-medium">{u.name || '—'}</div>
                            <div className="text-xs text-gray-400">{u.email}</div>
                            <div className="text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={u.role === 'ADMIN' ? 'destructive' : u.role === 'DEVELOPER' ? 'default' : 'secondary'}>{u.role}</Badge>
                            <div className="text-xs text-gray-400 mt-1">{u.role === 'DEVELOPER' ? `${u._count.developedJobs} jobs` : `${u._count.applications} apps`}</div>
                          </td>
                          <td className="py-3 px-2">
                            {u.suspended
                              ? <Badge variant="destructive" className="flex items-center gap-1 w-fit"><XCircle className="h-3 w-3" />Suspended</Badge>
                              : <Badge variant="outline" className="flex items-center gap-1 w-fit text-green-600 border-green-300"><CheckCircle className="h-3 w-3" />Active</Badge>}
                            {u.suspendReason && <div className="text-xs text-red-400 mt-1 max-w-[120px] truncate">{u.suspendReason}</div>}
                          </td>
                          <td className="py-3 px-2 text-xs text-gray-400">
                            {u.lastLoginAt
                              ? <div>
                                  <div className="font-medium text-gray-600">{new Date(u.lastLoginAt).toLocaleDateString()}</div>
                                  <div>{u.loginCount} login{u.loginCount !== 1 ? 's' : ''}</div>
                                  {!u.emailVerified && <div className="text-amber-500 font-medium">Email unverified</div>}
                                </div>
                              : <span className="text-gray-300">Never logged in</span>}
                          </td>
                          <td className="py-3 px-2">{u.stripeAccountId ? <CheckCircle className="h-4 w-4 text-green-500" /> : <span className="text-gray-300">—</span>}</td>
                          <td className="py-3 px-2">
                            {u.role !== 'ADMIN' && (
                              <div className="flex flex-col sm:flex-row gap-1">
                                {u.suspended
                                  ? <Button size="sm" variant="outline" onClick={() => handleSuspendUser(u.id, 'unsuspend')} disabled={actionLoading === u.id} className="text-green-600 border-green-300">Unsuspend</Button>
                                  : <Button size="sm" variant="outline" onClick={() => handleSuspendUser(u.id, 'suspend')} disabled={actionLoading === u.id} className="text-orange-600 border-orange-300">Suspend</Button>}
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(u.id)} disabled={actionLoading === u.id}>Delete</Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollTable>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Jobs tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader><CardTitle>Job Management</CardTitle><CardDescription>All testing jobs</CardDescription></CardHeader>
            <CardContent>
              {loadingTab ? <TableSkeleton cols={5} /> : jobs.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><Briefcase className="h-10 w-10 mx-auto mb-3" /><p>No jobs found</p></div>
              ) : (
                <ScrollTable>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-gray-500">
                      <th className="py-3 px-2 font-medium">App</th>
                      <th className="py-3 px-2 font-medium">Developer</th>
                      <th className="py-3 px-2 font-medium">Status</th>
                      <th className="py-3 px-2 font-medium">Testers</th>
                      <th className="py-3 px-2 font-medium">Pay/tester</th>
                      <th className="py-3 px-2 font-medium">Created</th>
                    </tr></thead>
                    <tbody>
                      {jobs.map(j => (
                        <tr key={j.id} className={`border-b hover:bg-gray-50 transition-colors ${j._count.applications === 0 && j.status === 'ACTIVE' ? 'bg-amber-50' : ''}`}>
                          <td className="py-3 px-2">
                            <div className="font-medium">{j.appName}</div>
                            {j._count.applications === 0 && j.status === 'ACTIVE' && <div className="text-xs text-amber-600 font-medium">⚠ No applicants yet</div>}
                          </td>
                          <td className="py-3 px-2 text-gray-500">{j.developer.name || j.developer.email}</td>
                          <td className="py-3 px-2">{getStatusBadge(j.status)}</td>
                          <td className="py-3 px-2"><span className="font-medium">{j._count.applications}</span><span className="text-gray-400">/{j.testersNeeded}</span></td>
                          <td className="py-3 px-2">{formatEurFromCents(j.paymentPerTester)}</td>
                          <td className="py-3 px-2 text-gray-400">{new Date(j.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollTable>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Applications tab ──────────────────────────────────────────────── */}
        <TabsContent value="applications">
          <Card>
            <CardHeader><CardTitle>Application Monitoring</CardTitle><CardDescription>All tester applications</CardDescription></CardHeader>
            <CardContent>
              {loadingTab ? <TableSkeleton cols={4} /> : applications.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><CheckCircle className="h-10 w-10 mx-auto mb-3" /><p>No applications found</p></div>
              ) : (
                <ScrollTable>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-gray-500">
                      <th className="py-3 px-2 font-medium">Tester</th>
                      <th className="py-3 px-2 font-medium">App</th>
                      <th className="py-3 px-2 font-medium">Status</th>
                      <th className="py-3 px-2 font-medium">Applied</th>
                    </tr></thead>
                    <tbody>
                      {applications.map(a => (
                        <tr key={a.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-2">{a.tester.name || a.tester.email}</td>
                          <td className="py-3 px-2">{a.job.appName}</td>
                          <td className="py-3 px-2">{getStatusBadge(a.status)}</td>
                          <td className="py-3 px-2 text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollTable>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Contacts tab ──────────────────────────────────────────────────── */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader><CardTitle>Contact Messages</CardTitle><CardDescription>Messages from the contact form</CardDescription></CardHeader>
            <CardContent>
              {loadingTab ? <TableSkeleton cols={4} /> : contactMessages.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><MessageSquare className="h-10 w-10 mx-auto mb-3" /><p>No messages yet</p></div>
              ) : (
                <ScrollTable>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-gray-500">
                      <th className="py-3 px-2 font-medium">From</th>
                      <th className="py-3 px-2 font-medium">Subject</th>
                      <th className="py-3 px-2 font-medium">Date</th>
                      <th className="py-3 px-2 font-medium">Actions</th>
                    </tr></thead>
                    <tbody>
                      {contactMessages.map(m => (
                        <tr key={m.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-2">
                            <div className="font-medium">{m.name}</div>
                            <div className="text-xs text-blue-500">{m.email}</div>
                          </td>
                          <td className="py-3 px-2 text-gray-600 max-w-[200px] truncate">{m.subject}</td>
                          <td className="py-3 px-2 text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 px-2">
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => setSelectedContact(m)}><Eye className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => confirmDeleteContactMessage(m)} disabled={actionLoading === m.id}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollTable>
              )}
            </CardContent>
          </Card>
          <Dialog open={!!selectedContact} onOpenChange={o => !o && setSelectedContact(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Contact Message</DialogTitle><DialogDescription>{selectedContact?.subject}</DialogDescription></DialogHeader>
              <div className="space-y-3">
                <div className="rounded-lg border bg-gray-50 p-3 text-sm">
                  <p className="font-medium">{selectedContact?.name}</p>
                  <p className="text-blue-600">{selectedContact?.email}</p>
                  {selectedContact?.ipAddress && <p className="text-xs text-gray-400 mt-1">IP: {selectedContact.ipAddress}</p>}
                </div>
                <div className="rounded-lg border p-3 text-sm text-gray-700 whitespace-pre-wrap">{selectedContact?.message}</div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedContact(null)}>Close</Button>
                <Button variant="destructive" onClick={() => selectedContact && confirmDeleteContactMessage(selectedContact)}>Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Payments tab ──────────────────────────────────────────────────── */}
        <TabsContent value="payments">
          <Card>
            <CardHeader><CardTitle>Payment Reconciliation</CardTitle><CardDescription>All tester payouts</CardDescription></CardHeader>
            <CardContent>
              {failedPaymentsCount > 0 && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />{failedPaymentsCount} failed payout{failedPaymentsCount !== 1 ? 's' : ''} need attention
                </div>
              )}
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />Payouts run only when funds are available in the platform balance.
              </div>
              {loadingTab ? <TableSkeleton cols={5} /> : payments.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><DollarSign className="h-10 w-10 mx-auto mb-3" /><p>No payments found</p></div>
              ) : (
                <ScrollTable>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-gray-500">
                      <th className="py-3 px-2 font-medium">Tester</th>
                      <th className="py-3 px-2 font-medium">App</th>
                      <th className="py-3 px-2 font-medium">Amount</th>
                      <th className="py-3 px-2 font-medium">Status</th>
                      <th className="py-3 px-2 font-medium">Date</th>
                    </tr></thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id} className={`border-b hover:bg-gray-50 transition-colors ${p.status === 'FAILED' ? 'bg-red-50' : ''}`}>
                          <td className="py-3 px-2">{p.application?.tester?.name || p.application?.tester?.email || '—'}</td>
                          <td className="py-3 px-2">{p.application?.job?.appName || '—'}</td>
                          <td className="py-3 px-2 font-medium">{formatEurFromCents(p.amount)}</td>
                          <td className="py-3 px-2">
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(p.status)}
                              {p.status === 'FAILED' && (
                                <Button size="sm" variant="outline" className="w-fit text-xs" disabled={actionLoading === p.id} onClick={() => handleRetryPayout(p.id)}>
                                  {actionLoading === p.id ? 'Retrying...' : 'Retry'}
                                </Button>
                              )}
                              {p.failureReason && <p className="text-xs text-red-500">{p.failureReason}</p>}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollTable>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reports tab ───────────────────────────────────────────────────── */}
        <TabsContent value="reports">
          <Card>
            <CardHeader><CardTitle>Feedback Reports</CardTitle><CardDescription>Reports from testers about developer replies</CardDescription></CardHeader>
            <CardContent>
              {loadingTab ? <TableSkeleton cols={5} /> : feedbackReports.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><Flag className="h-10 w-10 mx-auto mb-3" /><p>No unresolved reports</p></div>
              ) : (
                <div className="space-y-3">
                  {feedbackReports.map(r => (
                    <div key={r.id} className="rounded-lg border p-4 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{r.application.job.appName}</p>
                          <p className="text-xs text-gray-400">Reported by {r.reporter.name || r.reporter.email} · {new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Button size="sm" variant="outline" disabled={actionLoading === r.id} onClick={() => handleResolveReport(r.id)}>
                          {actionLoading === r.id ? 'Resolving...' : 'Resolve'}
                        </Button>
                      </div>
                      <Badge variant="outline">{r.reason}</Badge>
                      {r.details && <p className="text-sm text-gray-600">{r.details}</p>}
                      {r.application.developerReply && <div className="rounded bg-gray-50 p-2 text-xs text-gray-500 border-l-2 border-gray-300">{r.application.developerReply}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Testimonials tab ──────────────────────────────────────────────── */}
        <TabsContent value="testimonials">
          <Card>
            <CardHeader>
              <CardTitle>Testimonials</CardTitle>
              <CardDescription>Approve feedback to show on the landing page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                {(['pending', 'approved', 'all'] as const).map(f => (
                  <Button key={f} size="sm" variant={feedbackFilter === f ? 'default' : 'outline'} onClick={() => setFeedbackFilter(f)} className="capitalize">{f}</Button>
                ))}
              </div>
              {loadingTab ? <TableSkeleton cols={5} /> : testimonials.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><MessageSquare className="h-10 w-10 mx-auto mb-3" /><p>No feedback found</p></div>
              ) : (
                <div className="space-y-3">
                  {testimonials.map(t => (
                    <div key={t.id} className="rounded-lg border p-4 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{t.title}</p>
                          <p className="text-xs text-gray-400">{t.displayName || t.user.name || t.user.email} · {t.type} · {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={t.approved ? 'default' : 'outline'}>{t.approved ? 'Approved' : 'Pending'}</Badge>
                          <Button size="sm" variant="outline" disabled={actionLoading === t.id} onClick={() => handleToggleFeedbackApproval(t.id, !t.approved)}>
                            {actionLoading === t.id ? 'Saving...' : t.approved ? 'Unapprove' : 'Approve'}
                          </Button>
                          <Button size="sm" variant="destructive" disabled={actionLoading === t.id} onClick={() => handleDeleteFeedback(t.id)}>Delete</Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3">{t.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Fraud tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="fraud">
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Flagged Users', val: fraudStats?.totalFlagged ?? 0, color: 'border-red-200 text-red-700' },
                { label: 'Unresolved Logs', val: fraudStats?.unresolvedLogs ?? 0, color: 'border-orange-200 text-orange-700' },
                { label: 'High Severity (7d)', val: fraudStats?.recentHighSeverity ?? 0, color: 'border-yellow-200 text-yellow-700' },
                { label: 'Top Score', val: `${fraudStats?.topSuspiciousUsers?.[0]?.fraudScore ?? 0}/100`, color: 'border-gray-200 text-gray-700' },
              ].map(s => (
                <Card key={s.label} className={`border ${s.color.split(' ')[0]}`}>
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color.split(' ')[1]}`}>{s.val}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Suspicious users */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Flag className="h-4 w-4 text-red-500" />Suspicious Users</CardTitle></CardHeader>
              <CardContent>
                {!fraudStats?.topSuspiciousUsers?.length ? (
                  <div className="text-center py-8 text-gray-400"><ShieldAlert className="h-10 w-10 mx-auto mb-3 text-green-400" /><p>No suspicious users</p></div>
                ) : (
                  <ScrollTable>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-gray-500"><th className="py-3 px-2 font-medium">User</th><th className="py-3 px-2 font-medium">Score</th><th className="py-3 px-2 font-medium">Apps</th><th className="py-3 px-2 font-medium">Actions</th></tr></thead>
                      <tbody>
                        {fraudStats.topSuspiciousUsers.map(u => (
                          <tr key={u.id} className="border-b hover:bg-red-50">
                            <td className="py-3 px-2"><div className="font-medium">{u.name || u.email}</div><div className="text-xs text-gray-400">{u.email}</div></td>
                            <td className="py-3 px-2"><Badge variant={u.fraudScore >= 70 ? 'destructive' : 'secondary'}>{u.fraudScore}/100</Badge></td>
                            <td className="py-3 px-2">{u._count.applications}</td>
                            <td className="py-3 px-2">
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => handleClearUserFlags(u.id)} disabled={actionLoading === u.id}>Clear</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleSuspendUser(u.id, 'suspend')} disabled={actionLoading === u.id}>Suspend</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollTable>
                )}
              </CardContent>
            </Card>

            {/* Fraud logs */}
            <Card>
              <CardHeader><CardTitle className="text-base">Unresolved Fraud Logs</CardTitle></CardHeader>
              <CardContent>
                {loadingTab ? <TableSkeleton cols={3} /> : fraudLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-400"><CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-400" /><p>No unresolved fraud logs</p></div>
                ) : (
                  <div className="space-y-3">
                    {fraudLogs.map(log => (
                      <div key={log.id} className={`rounded-lg border p-3 ${log.severity === 'critical' ? 'bg-red-50 border-red-300' : log.severity === 'high' ? 'bg-orange-50 border-orange-200' : log.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <Badge variant={log.severity === 'critical' || log.severity === 'high' ? 'destructive' : 'secondary'}>{log.severity.toUpperCase()}</Badge>
                              <Badge variant="outline">{log.type.replace(/_/g, ' ')}</Badge>
                              <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm">{log.description}</p>
                            {log.user && <p className="text-xs text-gray-500">User: {log.user.name || log.user.email} ({log.user.role})</p>}
                            {log.ipAddress && <p className="text-xs text-gray-400">IP: {log.ipAddress}</p>}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleResolveFraudLog(log.id)} disabled={actionLoading === log.id}>
                            {actionLoading === log.id ? 'Resolving...' : 'Resolve'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
