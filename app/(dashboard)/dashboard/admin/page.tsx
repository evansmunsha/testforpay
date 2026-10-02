'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter, useSearchParams } from 'next/navigation'
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
  attention: {
    jobsWithZeroApplications: number
    testersStuckInVerification: number
    activeTesters: number
    failedPayments: number
    samples: {
      jobsNeedingApplicants: Array<{ id: string; appName: string; createdAt: string }>
      applicationsStuckInVerification: Array<{
        id: string
        updatedAt: string
        tester: { name: string | null; email: string }
        job: { id: string; appName: string }
      }>
      failedPaymentDetails: Array<{
        id: string
        updatedAt: string
        application: {
          tester: { name: string | null; email: string }
          job: { id: string; appName: string }
        }
      }>
    }
  }
  applicationPipeline: Partial<Record<'PENDING' | 'APPROVED' | 'OPTED_IN' | 'VERIFIED' | 'TESTING' | 'COMPLETED' | 'REJECTED', number>>
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
  id: string
  appName: string
  status: string
  testersNeeded: number
  paymentPerTester: Cents
  totalBudget: Cents
  platformFee: Cents
  createdAt: string
  publishedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  packageName?: string | null
  appDescription?: string | null
  googlePlayLink?: string | null
  appCategory?: string | null
  minAndroidVersion?: string | null
  stripeSessionId?: string | null
  stripePaymentIntent?: string | null
  planType?: string | null
  testimonialEmailSent?: boolean
  testDuration?: number | null
  dailyTasks: Array<{ id: string; dayNumber: number; taskText: string }>
  applications: Array<{
    id: string
    status: string
    createdAt: string
    testingStartDate: string | null
    testingEndDate: string | null
    completedMissionDays: number
    payment: { status: string } | null
    tester: { id: string; name: string | null; email: string }
  }>
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

interface AdminActivityEvent {
  id: string
  title: string
  detail: string
  createdAt: string
  tab: 'jobs' | 'applications' | 'payments' | 'users' | 'fraud'
}

interface AdminSystemHealth {
  checkedAt: string
  services: {
    database: 'healthy' | 'unavailable'
    stripeConfigured: boolean
    stripeWebhookConfigured: boolean
    emailConfigured: boolean
    cronAuthConfigured: boolean
  }
  cronRuns: Array<{
    jobName: string
    status: string
    startedAt: string
    completedAt: string | null
    durationMs: number | null
    errorMessage: string | null
  }>
}

interface AdminAuditEntry {
  id: string
  actorId: string
  actorEmail: string
  action: string
  targetType: string
  targetId: string
  reason: string
  createdAt: string
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
  id: string
  type: string
  rating: number
  title: string
  message: string
  approved: boolean
  category: string
  createdAt: string
  displayName: string | null
  companyName: string | null
  application?: {
    id: string
    status: string
    job: {
      id: string
      appName: string
    }
    tester: {
      id: string
      email: string
      name: string | null
    }
  } | null
  user: { id: string; email: string; name: string | null; role: string }
}

interface AcquisitionTarget {
  id: string
  name: string
  appName: string
  source: string
  status: 'Not contacted' | 'Contacted' | 'Reply received' | 'Booked demo' | 'Quoted' | 'Paid'
  priority: 'High' | 'Medium' | 'Low'
  email: string
  lastContacted: string
  nextAction: string
  notes: string
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

function JobDetailCard({ job, formatEurFromCents, getStatusBadge }: {
  job: Job
  formatEurFromCents: (value: number | bigint) => string
  getStatusBadge: (status: string) => React.ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`border rounded-lg ${job._count.applications === 0 && job.status === 'ACTIVE' ? 'bg-amber-50 border-amber-300' : 'bg-white'}`}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setExpanded(value => !value)
          }
        }}
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="font-semibold text-lg">{job.appName}</h3>
              {getStatusBadge(job.status)}
              {job.planType && (
                <Badge variant="outline" className="text-xs">
                  {job.planType}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Developer</div>
                <div className="font-medium">{job.developer.name || job.developer.email}</div>
              </div>
              <div>
                <div className="text-gray-500">Testers</div>
                <div className="font-medium">
                  <span className={job._count.applications === 0 && job.status === 'ACTIVE' ? 'text-amber-600' : ''}>{job._count.applications}</span>
                  <span className="text-gray-400">/{job.testersNeeded}</span>
                </div>
              </div>
              <div>
                <div className="text-gray-500">Payment/Tester</div>
                <div className="font-medium">{formatEurFromCents(job.paymentPerTester)}</div>
              </div>
              <div>
                <div className="text-gray-500">Total Budget</div>
                <div className="font-medium">{formatEurFromCents(job.totalBudget)}</div>
              </div>
            </div>

            {job._count.applications === 0 && job.status === 'ACTIVE' && (
              <div className="mt-2 text-sm text-amber-700 font-medium">⚠ No applicants yet</div>
            )}
          </div>

          <span className="shrink-0 flex items-center gap-2 text-sm text-gray-500" aria-hidden="true">
            <span>{expanded ? 'Hide details' : 'View details'}</span>
            {expanded ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-gray-50 p-6 space-y-6">
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-3 uppercase tracking-wide">App Details</h4>
            <div className="bg-white rounded-lg p-4 space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Package Name</div>
                  <div className="text-sm font-mono">{job.packageName || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Category</div>
                  <div className="text-sm">{job.appCategory || '—'}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Google Play Link</div>
                {job.googlePlayLink ? (
                  <a href={job.googlePlayLink} target="_blank" rel="noreferrer noopener" className="text-sm text-blue-600 hover:underline break-all">
                    {job.googlePlayLink}
                  </a>
                ) : (
                  <div className="text-sm text-gray-500">—</div>
                )}
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Description</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{job.appDescription || '—'}</div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-3 uppercase tracking-wide">Requirements</h4>
            <div className="bg-white rounded-lg p-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Testers Needed</div>
                  <div className="text-sm font-medium">{job.testersNeeded}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Test Duration</div>
                  <div className="text-sm font-medium">{job.testDuration ? `${job.testDuration} days` : '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Min Android Version</div>
                  <div className="text-sm font-medium">{job.minAndroidVersion || '—'}</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-3 uppercase tracking-wide">Daily Missions</h4>
            <div className="bg-white rounded-lg p-4">
              {job.dailyTasks.length > 0 ? (
                <ol className="divide-y">
                  {job.dailyTasks.map(task => (
                    <li key={task.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                      <span className="shrink-0 text-sm font-semibold text-gray-700">Day {task.dayNumber}</span>
                      <p className="min-w-0 whitespace-pre-wrap text-sm text-gray-700">{task.taskText}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-gray-500">No daily missions have been configured for this job.</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-3 uppercase tracking-wide">
              Applicants <span className="font-normal normal-case">({job.applications.length})</span>
            </h4>
            <div className="overflow-x-auto rounded-lg bg-white">
              {job.applications.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Tester</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Missions</th>
                      <th className="px-4 py-3 font-medium">Testing window</th>
                      <th className="px-4 py-3 font-medium">Payout</th>
                      <th className="px-4 py-3 font-medium">Applied</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {job.applications.map(application => (
                      <tr key={application.id}>
                        <td className="px-4 py-3 font-medium text-gray-900">{application.tester.name || '—'}</td>
                        <td className="px-4 py-3">
                          <a className="break-all text-blue-700 hover:underline" href={`mailto:${application.tester.email}`}>
                            {application.tester.email}
                          </a>
                        </td>
                        <td className="px-4 py-3">{application.status.replaceAll('_', ' ')}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {application.completedMissionDays}/{job.dailyTasks.length}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {application.testingStartDate
                            ? `${new Date(application.testingStartDate).toLocaleDateString()} – ${application.testingEndDate ? new Date(application.testingEndDate).toLocaleDateString() : 'Ongoing'}`
                            : 'Not started'}
                        </td>
                        <td className="px-4 py-3">{application.payment?.status ?? '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">{new Date(application.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-4 text-sm text-gray-500">No testers have applied to this job yet.</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-3 uppercase tracking-wide">Payment Details</h4>
            <div className="bg-white rounded-lg p-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Payment per Tester</div>
                  <div className="text-sm font-medium">{formatEurFromCents(job.paymentPerTester)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Total Budget</div>
                  <div className="text-sm font-medium">{formatEurFromCents(job.totalBudget)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Platform Fee</div>
                  <div className="text-sm font-medium">{formatEurFromCents(job.platformFee)}</div>
                </div>
              </div>

              {job.stripeSessionId && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs text-gray-500 mb-1">Stripe Session ID</div>
                  <div className="text-xs font-mono text-gray-700">{job.stripeSessionId}</div>
                </div>
              )}

              {job.stripePaymentIntent && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-1">Stripe Payment Intent</div>
                  <div className="text-xs font-mono text-gray-700">{job.stripePaymentIntent}</div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-3 uppercase tracking-wide">Timeline</h4>
            <div className="bg-white rounded-lg p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Created</div>
                  <div className="text-sm">{new Date(job.createdAt).toLocaleString()}</div>
                </div>
                {job.publishedAt && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Published</div>
                    <div className="text-sm">{new Date(job.publishedAt).toLocaleString()}</div>
                  </div>
                )}
                {job.startedAt && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Started</div>
                    <div className="text-sm">{new Date(job.startedAt).toLocaleString()}</div>
                  </div>
                )}
                {job.completedAt && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Completed</div>
                    <div className="text-sm">{new Date(job.completedAt).toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-3 uppercase tracking-wide">Developer Information</h4>
            <div className="bg-white rounded-lg p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Name</div>
                  <div className="text-sm font-medium">{job.developer.name || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Email</div>
                  <div className="text-sm">{job.developer.email}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Developer ID</div>
                  <div className="text-xs font-mono text-gray-700">{job.developer.id}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Testimonial Email Sent</div>
                  <div className="text-sm">
                    {job.testimonialEmailSent ? <span className="text-green-600">✓ Yes</span> : <span className="text-gray-400">✗ No</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-3 uppercase tracking-wide">Internal Details</h4>
            <div className="bg-white rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Job ID</div>
              <div className="text-xs font-mono text-gray-700">{job.id}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [processingPayouts, setProcessingPayouts] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  // User management pagination and filters
  const [userPage, setUserPage] = useState(1)
  const [userLimit, setUserLimit] = useState(20)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('')
  const [userEmailFilter, setUserEmailFilter] = useState('')
  const [userPagination, setUserPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobSearch, setJobSearch] = useState('')
  const [jobStatusFilter, setJobStatusFilter] = useState('')
  const [jobLimit, setJobLimit] = useState(10)
  const [jobPage, setJobPage] = useState(1)
  const [jobPagination, setJobPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [recentActivity, setRecentActivity] = useState<AdminActivityEvent[]>([])
  const [systemHealth, setSystemHealth] = useState<AdminSystemHealth | null>(null)
  const [auditEntries, setAuditEntries] = useState<AdminAuditEntry[]>([])
  const [auditLogError, setAuditLogError] = useState('')
  const [pendingAdminReason, setPendingAdminReason] = useState('')
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([])
  const [selectedContact, setSelectedContact] = useState<ContactMessage | null>(null)
  const [fraudStats, setFraudStats] = useState<FraudStats | null>(null)
  const [fraudLogs, setFraudLogs] = useState<FraudLog[]>([])
  const [feedbackReports, setFeedbackReports] = useState<FeedbackReport[]>([])
  const [testimonials, setTestimonials] = useState<TestimonialFeedback[]>([])
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'pending' | 'approved'>('pending')
  const [acquisitionTargets, setAcquisitionTargets] = useState<AcquisitionTarget[]>([])
  const [showAcquisitionForm, setShowAcquisitionForm] = useState(false)
  const [newAcquisitionTarget, setNewAcquisitionTarget] = useState({
    name: '',
    appName: '',
    source: '',
    status: 'Not contacted' as AcquisitionTarget['status'],
    priority: 'Medium' as AcquisitionTarget['priority'],
    email: '',
    nextAction: '',
    notes: '',
  })
  const acquisitionStatuses: AcquisitionTarget['status'][] = ['Not contacted', 'Contacted', 'Reply received', 'Booked demo', 'Quoted', 'Paid']
  const [loadingTab, setLoadingTab] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; confirmLabel: string; reasonRequired: boolean; onConfirm: ((reason?: string) => Promise<void> | void) | null }>
    ({ open: false, title: '', description: '', confirmLabel: 'Confirm', reasonRequired: false, onConfirm: null })
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [suspendTargetId, setSuspendTargetId] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState('Violation of Terms of Service')

  useEffect(() => {
    const requestedTab = searchParams.get('tab')
    if (requestedTab === 'contacts') setActiveTab('contacts')
  }, [searchParams])
  const failedPaymentsCount = payments.filter(p => p.status === 'FAILED').length
  const unresolvedReportsCount = feedbackReports.filter(r => !r.resolvedAt).length
  const attentionCount = (stats?.attention.jobsWithZeroApplications ?? 0)
    + (stats?.attention.testersStuckInVerification ?? 0)
    + (stats?.attention.failedPayments ?? 0)

  const openConfirm = (opts: { title: string; description: string; confirmLabel?: string; reasonRequired?: boolean; onConfirm: (reason?: string) => Promise<void> | void }) => {
    setPendingAdminReason('')
    setConfirmDialog({ open: true, title: opts.title, description: opts.description, confirmLabel: opts.confirmLabel || 'Confirm', reasonRequired: opts.reasonRequired ?? false, onConfirm: opts.onConfirm })
  }
  const closeConfirm = () => { setPendingAdminReason(''); setConfirmDialog(p => ({ ...p, open: false })) }
  const handleConfirm = async () => { const a = confirmDialog.onConfirm; const reason = pendingAdminReason.trim(); closeConfirm(); if (a) await a(reason) }

  const openSuspendDialog = (id: string) => { setSuspendTargetId(id); setSuspendReason('Violation of Terms of Service'); setSuspendDialogOpen(true) }

  const performSuspendUser = async (userId: string, action: 'suspend' | 'unsuspend', reason?: string | null) => {
    setActionLoading(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, reason }) })
      const data = await res.json()
      if (res.ok) { toast({ title: 'Success', description: data.message, variant: 'success' }); fetchUsers(); fetchAuditEntries() }
      else toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' })
    } catch { toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' }) }
    finally { setActionLoading(null) }
  }

  const handleSuspendUser = async (userId: string, action: 'suspend' | 'unsuspend') => {
    if (action === 'suspend') { openSuspendDialog(userId); return }
    openConfirm({
      title: 'Unsuspend user?',
      description: 'Restore this user’s access to the platform.',
      confirmLabel: 'Unsuspend',
      reasonRequired: true,
      onConfirm: reason => performSuspendUser(userId, 'unsuspend', reason),
    })
  }

  const handleConfirmSuspend = async () => {
    if (!suspendTargetId) return
    const id = suspendTargetId; setSuspendTargetId(null); setSuspendDialogOpen(false)
    await performSuspendUser(id, 'suspend', suspendReason)
  }

  const handleDeleteUser = async (userId: string) => {
    openConfirm({ title: 'Delete user?', description: 'Permanently delete this user? This cannot be undone.', confirmLabel: 'Delete', reasonRequired: true,
      onConfirm: async (reason) => {
        setActionLoading(userId)
        try {
          const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
          const data = await res.json()
          if (res.ok) { toast({ title: 'Deleted', description: data.message, variant: 'success' }); fetchUsers(); fetchStats(); fetchAuditEntries() }
          else toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' })
        } catch { toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' }) }
        finally { setActionLoading(null) }
      }
    })
  }

  const handleProcessPayouts = async () => {
    openConfirm({
      title: 'Process due payouts?',
      description: 'This will attempt payouts currently eligible for processing.',
      confirmLabel: 'Process payouts',
      reasonRequired: true,
      onConfirm: async reason => {
        setProcessingPayouts(true)
        try {
          const res = await fetch('/api/admin/payouts/process', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
          const data = await res.json()
          if (res.ok) { toast({ title: 'Payouts Processed', description: `${data.processed} payouts processed`, variant: 'success' }); fetchStats(); fetchAuditEntries() }
          else toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' })
        } catch { toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' }) }
        finally { setProcessingPayouts(false) }
      },
    })
  }

  useEffect(() => { if (!loading && user?.role !== 'ADMIN') router.push('/dashboard') }, [user, loading, router])
  useEffect(() => { if (!loading && user?.role === 'ADMIN') { fetchStats(); fetchUsers(); fetchRecentActivity(); fetchSystemHealth(); fetchAuditEntries(); fetchAcquisitionTargets() } }, [loading, user])
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

  const fetchRecentActivity = async () => {
    try {
      const res = await fetch('/api/admin/activity')
      const data = await res.json()
      if (res.ok) setRecentActivity(data.events || [])
    } catch (error) {
      console.error('Failed to fetch admin activity:', error)
    }
  }

  const fetchSystemHealth = async () => {
    try {
      const res = await fetch('/api/admin/health')
      const data = await res.json()
      if (res.ok) setSystemHealth(data)
    } catch (error) {
      console.error('Failed to fetch system health:', error)
    }
  }

  const fetchAuditEntries = async () => {
    try {
      const res = await fetch('/api/admin/audit-log')
      const data = await res.json()
      if (res.ok) {
        setAuditEntries(data.entries || [])
        setAuditLogError('')
      } else {
        setAuditLogError(data.error || 'Audit history unavailable')
      }
    } catch (error) {
      console.error('Failed to fetch admin audit history:', error)
      setAuditLogError('Audit history could not be reached.')
    }
  }

  useEffect(() => {
  if (activeTab === 'users' && user?.role === 'ADMIN') {
    fetchUsers()
  }
}, [userPage, userLimit, userSearch, userRoleFilter, userStatusFilter, userEmailFilter, activeTab])


  const fetchUsers = async () => {
  setLoadingTab(true)
  try {
    const params = new URLSearchParams()
    params.set('page', userPage.toString())
    params.set('limit', userLimit.toString())
    if (userSearch) params.set('search', userSearch)
    if (userRoleFilter) params.set('role', userRoleFilter)
    if (userStatusFilter) params.set('status', userStatusFilter)
    if (userEmailFilter) params.set('emailVerified', userEmailFilter)

    const res = await fetch(`/api/admin/users?${params}`)
    const data = await res.json()
    if (res.ok) {
      setUsers(data.users || [])
      setUserPagination(data.pagination)
    }
  } catch (e) {
    console.error(e)
  } finally {
    setLoadingTab(false)
  }
}

  const fetchJobs = async () => { setLoadingTab(true); try { const res = await fetch('/api/admin/jobs'); const data = await res.json(); if (res.ok) { setJobs(data.jobs || []); setJobPage(1) } } catch (e) { console.error(e) } finally { setLoadingTab(false) } }
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
    openConfirm({ title: 'Resolve fraud log?', description: 'Record why this fraud alert is considered resolved.', confirmLabel: 'Resolve', reasonRequired: true, onConfirm: async reason => {
      setActionLoading(id)
      try { const res = await fetch('/api/admin/fraud', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resolve-log', logId: id, reason }) }); if (res.ok) { toast({ title: 'Resolved', description: 'Fraud log resolved', variant: 'success' }); fetchFraudData(); fetchAuditEntries() } else { const data = await res.json(); toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' }) } }
      catch { toast({ title: 'Error', description: 'Failed', variant: 'destructive' }) } finally { setActionLoading(null) }
    } })
  }

  const handleClearUserFlags = async (userId: string) => {
    openConfirm({ title: 'Clear fraud flags?', description: 'Record why the user’s fraud flags should be cleared.', confirmLabel: 'Clear flags', reasonRequired: true, onConfirm: async reason => {
      setActionLoading(userId)
      try { const res = await fetch('/api/admin/fraud', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear-flags', userId, reason }) }); if (res.ok) { toast({ title: 'Cleared', description: 'Flags cleared', variant: 'success' }); fetchFraudData(); fetchAuditEntries() } else { const data = await res.json(); toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' }) } }
      catch { toast({ title: 'Error', description: 'Failed', variant: 'destructive' }) } finally { setActionLoading(null) }
    } })
  }

  const handleRetryPayout = async (paymentId: string) => {
    openConfirm({
      title: 'Retry payout?',
      description: 'This will retry the transfer to the tester.',
      confirmLabel: 'Retry payout',
      reasonRequired: true,
      onConfirm: async reason => {
        setActionLoading(paymentId)
        try {
          const res = await fetch(`/api/admin/payments/retry/${paymentId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
          if (res.ok) { await fetchPayments(); fetchAuditEntries(); toast({ title: 'Retry Success', description: 'Payout retry triggered', variant: 'success' }) }
          else { const data = await res.json(); toast({ title: 'Retry Failed', description: data.error || 'Failed', variant: 'destructive' }) }
        } catch { toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' }) } finally { setActionLoading(null) }
      },
    })
  }

  const advanceAcquisitionTarget = async (id: string) => {
    const target = acquisitionTargets.find(item => item.id === id)
    if (!target) return

    const currentIndex = acquisitionStatuses.indexOf(target.status)
    const nextStatus = acquisitionStatuses[Math.min(currentIndex + 1, acquisitionStatuses.length - 1)]
    const nextAction =
      nextStatus === 'Paid'
        ? 'Close the job and mark as delivered.'
        : nextStatus === 'Reply received'
          ? 'Send pricing details and answer the developer’s questions.'
          : nextStatus === 'Booked demo'
            ? 'Send a direct signup link and confirm the requirement timing.'
            : nextStatus === 'Quoted'
              ? 'Follow up with a clear offer and launch timeline.'
              : 'Continue outreach and ask for the app link or launch date.'

    try {
      const res = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus, nextAction, lastContacted: new Date().toISOString() }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Update failed', description: data.error || 'Could not update the lead.', variant: 'destructive' })
        return
      }

      setAcquisitionTargets(prev => prev.map(item => item.id === id ? data.lead : item))
      toast({ title: 'Lead updated', description: `${target.name} moved to ${nextStatus}.`, variant: 'success' })
    } catch (error) {
      console.error('Failed to advance acquisition target:', error)
      toast({ title: 'Error', description: 'Could not update the lead.', variant: 'destructive' })
    }
  }

  const handleAddAcquisitionTarget = async () => {
    const name = newAcquisitionTarget.name.trim()
    const appName = newAcquisitionTarget.appName.trim()
    const email = newAcquisitionTarget.email.trim()
    const source = newAcquisitionTarget.source.trim()

    if (!name || !appName || !email) {
      toast({ title: 'Missing fields', description: 'Name, app name, and email are required.', variant: 'destructive' })
      return
    }

    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          appName,
          email,
          source: source || 'Manual entry',
          status: newAcquisitionTarget.status,
          priority: newAcquisitionTarget.priority,
          nextAction: newAcquisitionTarget.nextAction.trim() || 'Send the intro email and ask for the app link.',
          notes: newAcquisitionTarget.notes.trim() || 'New lead added to the acquisition pipeline.',
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Save failed', description: data.error || 'Could not add the lead.', variant: 'destructive' })
        return
      }

      setAcquisitionTargets(prev => [data.lead, ...prev])
      setShowAcquisitionForm(false)
      setNewAcquisitionTarget({
        name: '',
        appName: '',
        source: '',
        status: 'Not contacted',
        priority: 'Medium',
        email: '',
        nextAction: '',
        notes: '',
      })
      toast({ title: 'Lead added', description: `${name} is now in the developer outreach tracker.`, variant: 'success' })
    } catch (error) {
      console.error('Failed to add acquisition target:', error)
      toast({ title: 'Error', description: 'Could not save the lead.', variant: 'destructive' })
    }
  }

  const fetchAcquisitionTargets = async () => {
    try {
      const res = await fetch('/api/admin/leads')
      const data = await res.json()
      if (res.ok) setAcquisitionTargets(data.leads || [])
      else console.error('Failed to fetch acquisition leads:', data.error || 'Unknown error')
    } catch (error) {
      console.error('Failed to fetch acquisition leads:', error)
    }
  }

  const acquisitionSummary = {
    total: acquisitionTargets.length,
    notContacted: acquisitionTargets.filter(t => t.status === 'Not contacted').length,
    replies: acquisitionTargets.filter(t => t.status === 'Reply received' || t.status === 'Booked demo' || t.status === 'Quoted' || t.status === 'Paid').length,
    paid: acquisitionTargets.filter(t => t.status === 'Paid').length,
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !jobSearch || job.appName.toLowerCase().includes(jobSearch.toLowerCase()) || (job.packageName || '').toLowerCase().includes(jobSearch.toLowerCase())
    const matchesStatus = !jobStatusFilter || job.status === jobStatusFilter
    return matchesSearch && matchesStatus
  })

  const jobTotals = {
    total: filteredJobs.length,
    totalPages: Math.max(1, Math.ceil(filteredJobs.length / jobLimit)),
    page: Math.min(jobPage, Math.max(1, Math.ceil(filteredJobs.length / jobLimit))),
    limit: jobLimit,
  }

  const paginatedJobs = filteredJobs.slice((jobTotals.page - 1) * jobTotals.limit, jobTotals.page * jobTotals.limit)

  useEffect(() => {
    if (jobPage > jobTotals.totalPages) setJobPage(jobTotals.totalPages)
  }, [jobPage, jobTotals.totalPages])

  useEffect(() => {
    setJobPagination({ page: jobTotals.page, limit: jobTotals.limit, total: jobTotals.total, totalPages: jobTotals.totalPages })
  }, [jobTotals.page, jobTotals.limit, jobTotals.total, jobTotals.totalPages])

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
      ACTIVE: { variant: 'default', icon: CheckCircle }, COMPLETED: { variant: 'secondary', icon: CheckCircle },
      DRAFT: { variant: 'outline', icon: Clock }, PENDING: { variant: 'outline', icon: Clock },
      APPROVED: { variant: 'default', icon: CheckCircle }, REJECTED: { variant: 'destructive', icon: XCircle },
      TESTING: { variant: 'default', icon: Clock }, FAILED: { variant: 'destructive', icon: XCircle },
      ESCROWED: { variant: 'outline', icon: Clock }, PROCESSING: { variant: 'default', icon: Clock },
      CANCELLED: { variant: 'destructive', icon: XCircle }, IN_PROGRESS: { variant: 'default', icon: Clock },
      VERIFIED: { variant: 'default', icon: CheckCircle }, OPTED_IN: { variant: 'outline', icon: Clock },
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
          {confirmDialog.reasonRequired && (
            <div className="space-y-2">
              <Label htmlFor="admin-action-reason">Reason</Label>
              <textarea
                id="admin-action-reason"
                value={pendingAdminReason}
                onChange={event => setPendingAdminReason(event.target.value)}
                minLength={10}
                maxLength={1000}
                required
                placeholder="Explain why this action is necessary (at least 10 characters)."
                className="min-h-24 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={closeConfirm}>Cancel</Button><Button variant="destructive" onClick={handleConfirm} disabled={!!actionLoading || (confirmDialog.reasonRequired && pendingAdminReason.trim().length < 10)}>{confirmDialog.confirmLabel}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Suspend Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={suspendDialogOpen} onOpenChange={o => !o && setSuspendDialogOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Suspend user?</DialogTitle><DialogDescription>Provide an optional reason.</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label htmlFor="sr">Reason</Label><textarea id="sr" value={suspendReason} onChange={e => setSuspendReason(e.target.value)} minLength={10} maxLength={1000} required placeholder="Explain why this user is being suspended." className="min-h-24 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleConfirmSuspend} disabled={!!actionLoading || suspendReason.trim().length < 10}>Suspend</Button></DialogFooter>
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
                {(stats?.attention.jobsWithZeroApplications ?? 0) > 0 && (
                  <div>
                    <button className="font-medium underline" onClick={() => setActiveTab('jobs')}>
                      {stats!.attention.jobsWithZeroApplications} active job{stats!.attention.jobsWithZeroApplications !== 1 ? 's' : ''} with zero applications
                    </button>
                    <ul className="ml-5 list-disc text-amber-800">
                      {stats!.attention.samples.jobsNeedingApplicants.map(job => <li key={job.id}>{job.appName}</li>)}
                    </ul>
                  </div>
                )}
                {(stats?.attention.testersStuckInVerification ?? 0) > 0 && (
                  <div>
                    <button className="font-medium underline" onClick={() => setActiveTab('applications')}>
                      {stats!.attention.testersStuckInVerification} tester{stats!.attention.testersStuckInVerification !== 1 ? 's' : ''} stuck in verification for 48h+
                    </button>
                    <ul className="ml-5 list-disc text-amber-800">
                      {stats!.attention.samples.applicationsStuckInVerification.map(application => (
                        <li key={application.id}>{application.tester.name || application.tester.email} · {application.job.appName}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(stats?.attention.failedPayments ?? 0) > 0 && (
                  <div>
                    <button className="font-medium underline" onClick={() => setActiveTab('payments')}>
                      {stats!.attention.failedPayments} failed payout{stats!.attention.failedPayments !== 1 ? 's' : ''} to retry
                    </button>
                    <ul className="ml-5 list-disc text-amber-800">
                      {stats!.attention.samples.failedPaymentDetails.map(payment => (
                        <li key={payment.id}>{payment.application.tester.name || payment.application.tester.email} · {payment.application.job.appName}</li>
                      ))}
                    </ul>
                  </div>
                )}
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Tester Pipeline</CardTitle>
          <CardDescription>Applications by current stage</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            ['Applied', 'PENDING'],
            ['Approved', 'APPROVED'],
            ['Opt-in submitted', 'OPTED_IN'],
            ['Verified', 'VERIFIED'],
            ['Testing', 'TESTING'],
            ['Completed', 'COMPLETED'],
            ['Rejected', 'REJECTED'],
          ].map(([label, status]) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveTab('applications')}
              className="rounded-md border p-3 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="block text-xs text-gray-500">{label}</span>
              <span className="mt-1 block text-2xl font-semibold text-gray-900">
                {loadingStats ? '—' : stats?.applicationPipeline[status as keyof Stats['applicationPipeline']] ?? 0}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* ── Activity + Health row ───────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-600" />System Checks</span>
              <Button size="sm" variant="ghost" onClick={fetchSystemHealth}>Refresh</Button>
            </CardTitle>
            <CardDescription>
              {systemHealth ? `Checked ${new Date(systemHealth.checkedAt).toLocaleTimeString()}` : 'Checking services...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              ['Database connection', systemHealth?.services.database === 'healthy', systemHealth?.services.database === 'unavailable' ? 'Unavailable' : 'Connected'],
              ['Stripe credentials', systemHealth?.services.stripeConfigured, systemHealth?.services.stripeConfigured ? 'Configured' : 'Missing'],
              ['Stripe webhook secret', systemHealth?.services.stripeWebhookConfigured, systemHealth?.services.stripeWebhookConfigured ? 'Configured' : 'Missing'],
              ['Email credentials', systemHealth?.services.emailConfigured, systemHealth?.services.emailConfigured ? 'Configured' : 'Missing'],
              ['Cron authentication', systemHealth?.services.cronAuthConfigured, systemHealth?.services.cronAuthConfigured ? 'Configured' : 'Missing'],
            ].map(([label, healthy, status]) => (
              <div key={label as string} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-gray-600">{label}</span>
                <span className={`font-medium ${healthy === undefined ? 'text-gray-400' : healthy ? 'text-green-700' : 'text-red-600'}`}>
                  {healthy === undefined ? 'Unknown' : status}
                </span>
              </div>
            ))}
            <div className="space-y-2 border-t pt-2">
              <p className="text-xs font-semibold text-gray-700">Scheduled jobs</p>
              {['auto-complete-tests', 'process-payouts', 'nudge-developers'].map(jobName => {
                const run = systemHealth?.cronRuns.find(item => item.jobName === jobName)
                return (
                  <div key={jobName} className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-600">{jobName.replaceAll('-', ' ')}</span>
                      <span className={`font-medium ${run?.status === 'SUCCEEDED' ? 'text-green-700' : run?.status === 'FAILED' ? 'text-red-600' : 'text-gray-400'}`}>
                        {run ? run.status : 'No run recorded'}
                      </span>
                    </div>
                    {run && <p className="mt-0.5 text-right text-[11px] text-gray-400">{new Date(run.startedAt).toLocaleString()}{run.durationMs !== null ? ` · ${run.durationMs} ms` : ' · In progress'}</p>}
                    {run?.errorMessage && <p className="mt-0.5 text-right text-[11px] text-red-600">{run.errorMessage}</p>}
                  </div>
                )
              })}
            </div>
            <p className="border-t pt-2 text-[11px] text-gray-400">Credentials are checked for presence only; external delivery is not verified.</p>
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
            <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
            <TabsTrigger value="fraud" className="text-red-600">
              <ShieldAlert className="h-3.5 w-3.5 mr-1" />Fraud {(fraudStats?.unresolvedLogs ?? 0) > 0 && <Badge variant="destructive" className="ml-1">{fraudStats?.unresolvedLogs}</Badge>}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="acquisition">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Total targets</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">{acquisitionSummary.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Not contacted</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">{acquisitionSummary.notContacted}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Reply/interest</div>
                <div className="mt-2 text-3xl font-bold text-emerald-600">{acquisitionSummary.replies}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Paid jobs</div>
                <div className="mt-2 text-3xl font-bold text-violet-600">{acquisitionSummary.paid}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Developer outreach tracker</CardTitle>
                <CardDescription>Track founder outreach for the 14-day developer acquisition sprint.</CardDescription>
              </div>
              <Button onClick={() => setShowAcquisitionForm(v => !v)} variant="outline" className="w-full sm:w-auto">
                {showAcquisitionForm ? 'Hide form' : 'Add target'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {showAcquisitionForm && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="acq-name">Contact name</Label>
                      <Input id="acq-name" value={newAcquisitionTarget.name} onChange={e => setNewAcquisitionTarget(prev => ({ ...prev, name: e.target.value }))} placeholder="Jane Developer" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acq-app">App name</Label>
                      <Input id="acq-app" value={newAcquisitionTarget.appName} onChange={e => setNewAcquisitionTarget(prev => ({ ...prev, appName: e.target.value }))} placeholder="Night Grid" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acq-email">Email</Label>
                      <Input id="acq-email" type="email" value={newAcquisitionTarget.email} onChange={e => setNewAcquisitionTarget(prev => ({ ...prev, email: e.target.value }))} placeholder="jane@company.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acq-source">Source</Label>
                      <Input id="acq-source" value={newAcquisitionTarget.source} onChange={e => setNewAcquisitionTarget(prev => ({ ...prev, source: e.target.value }))} placeholder="Google Play search" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acq-priority">Priority</Label>
                      <select id="acq-priority" value={newAcquisitionTarget.priority} onChange={e => setNewAcquisitionTarget(prev => ({ ...prev, priority: e.target.value as AcquisitionTarget['priority'] }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acq-status">Status</Label>
                      <select id="acq-status" value={newAcquisitionTarget.status} onChange={e => setNewAcquisitionTarget(prev => ({ ...prev, status: e.target.value as AcquisitionTarget['status'] }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {acquisitionStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2 xl:col-span-2">
                      <Label htmlFor="acq-action">Next action</Label>
                      <Input id="acq-action" value={newAcquisitionTarget.nextAction} onChange={e => setNewAcquisitionTarget(prev => ({ ...prev, nextAction: e.target.value }))} placeholder="Send the intro email and ask for the app link" />
                    </div>
                    <div className="space-y-2 md:col-span-2 xl:col-span-3">
                      <Label htmlFor="acq-notes">Notes</Label>
                      <Input id="acq-notes" value={newAcquisitionTarget.notes} onChange={e => setNewAcquisitionTarget(prev => ({ ...prev, notes: e.target.value }))} placeholder="Need 12 testers for the next closed test." />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAcquisitionForm(false)}>Cancel</Button>
                    <Button onClick={handleAddAcquisitionTarget}>Save lead</Button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-3">Name</th>
                      <th className="px-3 py-3">App</th>
                      <th className="px-3 py-3">Source</th>
                      <th className="px-3 py-3">Priority</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Last contact</th>
                      <th className="px-3 py-3">Next action</th>
                      <th className="px-3 py-3">Notes</th>
                      <th className="px-3 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {acquisitionTargets.map(target => (
                      <tr key={target.id} className="align-top">
                        <td className="px-3 py-3">
                          <div className="font-medium text-gray-900">{target.name}</div>
                          <div className="text-xs text-gray-500">{target.email}</div>
                        </td>
                        <td className="px-3 py-3 text-gray-800">{target.appName}</td>
                        <td className="px-3 py-3 text-gray-600">{target.source}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${target.priority === 'High' ? 'bg-red-100 text-red-700' : target.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                            {target.priority}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${target.status === 'Paid' ? 'bg-violet-100 text-violet-700' : target.status === 'Reply received' || target.status === 'Booked demo' ? 'bg-emerald-100 text-emerald-700' : target.status === 'Contacted' ? 'bg-blue-100 text-blue-700' : target.status === 'Quoted' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                            {target.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-600">{target.lastContacted}</td>
                        <td className="px-3 py-3 text-gray-600 max-w-xs">{target.nextAction}</td>
                        <td className="px-3 py-3 text-gray-600 max-w-xs">{target.notes}</td>
                        <td className="px-3 py-3">
                          <Button size="sm" variant="outline" onClick={() => advanceAcquisitionTarget(target.id)}>
                            {target.status === 'Paid' ? 'Keep active' : 'Advance'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
            <Card className="sm:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <CardDescription>Latest platform changes and tester activity</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={fetchRecentActivity}>Refresh</Button>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="py-5 text-center text-sm text-gray-500">No recent activity yet.</p>
                ) : (
                  <div className="divide-y">
                    {recentActivity.map(event => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setActiveTab(event.tab)}
                        className="flex w-full flex-col gap-1 py-3 text-left transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-gray-900">{event.title}</span>
                          <span className="block truncate text-xs text-gray-500">{event.detail}</span>
                        </span>
                        <time className="shrink-0 text-xs text-gray-400" dateTime={event.createdAt}>
                          {new Date(event.createdAt).toLocaleString()}
                        </time>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="sm:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Admin Action History</CardTitle>
                  <CardDescription>Reasoned records of sensitive changes</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={fetchAuditEntries}>Refresh</Button>
              </CardHeader>
              <CardContent>
                {auditLogError ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{auditLogError}</p>
                ) : auditEntries.length === 0 ? (
                  <p className="py-5 text-center text-sm text-gray-500">No sensitive admin actions recorded yet.</p>
                ) : (
                  <div className="divide-y">
                    {auditEntries.map(entry => (
                      <div key={entry.id} className="space-y-1 py-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                          <p className="font-medium text-gray-900">{entry.action.replaceAll('_', ' ')} · {entry.targetType} {entry.targetId}</p>
                          <time className="text-xs text-gray-400" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
                        </div>
                        <p className="text-xs text-gray-500">By {entry.actorEmail} · {entry.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Users tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                {userPagination ? `${userPagination.total} total users` : 'All registered users'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters and Search */}
              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Search */}
                  <div className="lg:col-span-2">
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setUserPage(1) }}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Role Filter */}
                  <select
                    value={userRoleFilter}
                    onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(1) }}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Roles</option>
                    <option value="DEVELOPER">Developers</option>
                    <option value="TESTER">Testers</option>
                    <option value="ADMIN">Admins</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={userStatusFilter}
                    onChange={(e) => { setUserStatusFilter(e.target.value); setUserPage(1) }}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Email Verification Filter */}
                  <select
                    value={userEmailFilter}
                    onChange={(e) => { setUserEmailFilter(e.target.value); setUserPage(1) }}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Verification Status</option>
                    <option value="true">Email Verified</option>
                    <option value="false">Email Unverified</option>
                  </select>

                  {/* Results per page */}
                  <select
                    value={userLimit}
                    onChange={(e) => { setUserLimit(parseInt(e.target.value)); setUserPage(1) }}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="10">10 per page</option>
                    <option value="20">20 per page</option>
                    <option value="50">50 per page</option>
                  </select>

                  {/* Clear Filters */}
                  {(userSearch || userRoleFilter || userStatusFilter || userEmailFilter) && (
                    <button
                      onClick={() => {
                        setUserSearch('')
                        setUserRoleFilter('')
                        setUserStatusFilter('')
                        setUserEmailFilter('')
                        setUserPage(1)
                      }}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              {/* Users Table */}
              {loadingTab ? (
                <TableSkeleton cols={6} />
              ) : users.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users className="h-10 w-10 mx-auto mb-3" />
                  <p>No users found</p>
                </div>
              ) : (
                <>
                  <ScrollTable>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-500">
                          <th className="py-3 px-2 font-medium">User</th>
                          <th className="py-3 px-2 font-medium">Role</th>
                          <th className="py-3 px-2 font-medium">Status</th>
                          <th className="py-3 px-2 font-medium">Activity</th>
                          <th className="py-3 px-2 font-medium">Stripe</th>
                          <th className="py-3 px-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id} className={`border-b hover:bg-gray-50 transition-colors ${u.suspended ? 'bg-red-50' : ''}`}>
                            <td className="py-3 px-2">
                              <div className="font-medium">{u.name || '—'}</div>
                              <div className="text-xs text-gray-400">{u.email}</div>
                              <div className="text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant={u.role === 'ADMIN' ? 'destructive' : u.role === 'DEVELOPER' ? 'default' : 'secondary'}>
                                {u.role}
                              </Badge>
                              <div className="text-xs text-gray-400 mt-1">
                                {u.role === 'DEVELOPER' ? `${u._count.developedJobs} jobs` : `${u._count.applications} apps`}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              {u.suspended ? (
                                <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                  <XCircle className="h-3 w-3" />
                                  Suspended
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="flex items-center gap-1 w-fit text-green-600 border-green-300">
                                  <CheckCircle className="h-3 w-3" />
                                  Active
                                </Badge>
                              )}
                              {u.suspendReason && (
                                <div className="text-xs text-red-400 mt-1 max-w-[120px] truncate">{u.suspendReason}</div>
                              )}
                            </td>
                            <td className="py-3 px-2 text-xs text-gray-400">
                              {u.lastLoginAt ? (
                                <div>
                                  <div className="font-medium text-gray-600">{new Date(u.lastLoginAt).toLocaleDateString()}</div>
                                  <div>{u.loginCount} login{u.loginCount !== 1 ? 's' : ''}</div>
                                  {!u.emailVerified && <div className="text-amber-500 font-medium">Email unverified</div>}
                                </div>
                              ) : (
                                <span className="text-gray-300">Never logged in</span>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              {u.stripeAccountId ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              {u.role !== 'ADMIN' && (
                                <div className="flex flex-col sm:flex-row gap-1">
                                  {u.suspended ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSuspendUser(u.id, 'unsuspend')}
                                      disabled={actionLoading === u.id}
                                      className="text-green-600 border-green-300"
                                    >
                                      Unsuspend
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSuspendUser(u.id, 'suspend')}
                                      disabled={actionLoading === u.id}
                                      className="text-orange-600 border-orange-300"
                                    >
                                      Suspend
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteUser(u.id)}
                                    disabled={actionLoading === u.id}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollTable>

                  {/* Pagination */}
                  {userPagination && userPagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t pt-4">
                      <div className="text-sm text-gray-600">
                        Showing {((userPagination.page - 1) * userPagination.limit) + 1} to{' '}
                        {Math.min(userPagination.page * userPagination.limit, userPagination.total)} of{' '}
                        {userPagination.total} users
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setUserPage(p => Math.max(1, p - 1))}
                          disabled={userPagination.page === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, userPagination.totalPages) }, (_, i) => {
                            let pageNum
                            if (userPagination.totalPages <= 5) {
                              pageNum = i + 1
                            } else if (userPagination.page <= 3) {
                              pageNum = i + 1
                            } else if (userPagination.page >= userPagination.totalPages - 2) {
                              pageNum = userPagination.totalPages - 4 + i
                            } else {
                              pageNum = userPagination.page - 2 + i
                            }
                            return (
                              <Button
                                key={pageNum}
                                size="sm"
                                variant={userPagination.page === pageNum ? 'default' : 'outline'}
                                onClick={() => setUserPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setUserPage(p => Math.min(userPagination.totalPages, p + 1))}
                          disabled={userPagination.page === userPagination.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* ── Jobs tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Job Management</CardTitle>
              <CardDescription>
                {jobPagination ? `${jobPagination.total} total jobs` : 'All testing jobs'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="Search by app name or package name..."
                      value={jobSearch}
                      onChange={(e) => { setJobSearch(e.target.value); setJobPage(1) }}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <select
                    value={jobStatusFilter}
                    onChange={(e) => { setJobStatusFilter(e.target.value); setJobPage(1) }}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <select
                    value={jobLimit}
                    onChange={(e) => { setJobLimit(parseInt(e.target.value)); setJobPage(1) }}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="10">10 per page</option>
                    <option value="20">20 per page</option>
                    <option value="50">50 per page</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => { setJobStatusFilter('ACTIVE'); setJobPage(1) }}
                    className={`px-4 py-2 text-sm rounded-lg border ${jobStatusFilter === 'ACTIVE' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Active Jobs
                  </button>
                  <button
                    type="button"
                    onClick={() => { setJobStatusFilter('DRAFT'); setJobPage(1) }}
                    className={`px-4 py-2 text-sm rounded-lg border ${jobStatusFilter === 'DRAFT' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Drafts
                  </button>

                  {(jobSearch || jobStatusFilter) && (
                    <button
                      type="button"
                      onClick={() => {
                        setJobSearch('')
                        setJobStatusFilter('')
                        setJobPage(1)
                      }}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              {loadingTab ? <TableSkeleton cols={6} /> : paginatedJobs.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><Briefcase className="h-10 w-10 mx-auto mb-3" /><p>No jobs found</p></div>
              ) : (
                <>
                  <div className="space-y-4">
                    {paginatedJobs.map(j => (
                      <JobDetailCard key={j.id} job={j} formatEurFromCents={formatEurFromCents} getStatusBadge={getStatusBadge} />
                    ))}
                  </div>

                  {jobPagination && jobPagination.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t pt-4">
                      <div className="text-sm text-gray-600">
                        Showing {((jobPagination.page - 1) * jobPagination.limit) + 1} to{' '}
                        {Math.min(jobPagination.page * jobPagination.limit, jobPagination.total)} of{' '}
                        {jobPagination.total} jobs
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setJobPage(p => Math.max(1, p - 1))}
                          disabled={jobPagination.page === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, jobPagination.totalPages) }, (_, i) => {
                            let pageNum
                            if (jobPagination.totalPages <= 5) {
                              pageNum = i + 1
                            } else if (jobPagination.page <= 3) {
                              pageNum = i + 1
                            } else if (jobPagination.page >= jobPagination.totalPages - 2) {
                              pageNum = jobPagination.totalPages - 4 + i
                            } else {
                              pageNum = jobPagination.page - 2 + i
                            }
                            return (
                              <Button
                                key={pageNum}
                                size="sm"
                                variant={jobPagination.page === pageNum ? 'default' : 'outline'}
                                onClick={() => setJobPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setJobPage(p => Math.min(jobPagination.totalPages, p + 1))}
                          disabled={jobPagination.page === jobPagination.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
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
                        <div className="flex-1">
                          {/* Category Badge */}
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={t.category === 'JOB_COMPLETION' ? 'default' : 'secondary'}>
                              {t.category === 'JOB_COMPLETION' ? '✓ Job Completion' : 'Platform Feedback'}
                            </Badge>
                          </div>

                          <p className="font-medium text-sm">{t.title}</p>
                          <p className="text-xs text-gray-400">{t.displayName || t.user.name || t.user.email} · {t.type} · {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</p>

                          {/* Verification Details for Admin */}
                          {t.application && (
                            <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                              <p><strong>Verified:</strong> Application #{t.application.id.slice(0, 8)}</p>
                              <p><strong>Status:</strong> {t.application.status}</p>
                              <p><strong>Job:</strong> {t.application.job.appName}</p>
                              <p><strong>Tester:</strong> {t.application.tester.name || t.application.tester.email}</p>
                            </div>
                          )}
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
