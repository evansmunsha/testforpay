'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast-provider'
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  XCircle,
  ShieldAlert,
  Flag,
  MessageSquare
} from 'lucide-react'

interface Stats {
  totalUsers: number
  totalDevelopers: number
  totalTesters: number
  totalJobs: number
  activeJobs: number
  completedJobs: number
  totalApplications: number
  totalRevenue: number
  pendingPayments: number
}

interface User {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  stripeAccountId: string | null
  suspended: boolean
  suspendReason: string | null
  _count: { developedJobs: number; applications: number }
}

interface Job {
  id: string
  appName: string
  status: string
  testersNeeded: number
  paymentPerTester: number
  createdAt: string
  developer: { id: string; email: string; name: string | null }
  _count: { applications: number }
}

interface Application {
  id: string
  status: string
  createdAt: string
  job: { id: string; appName: string }
  tester: { id: string; email: string; name: string | null }
}

interface Payment {
  id: string
  amount: number
  status: string
  createdAt: string
  failureReason?: string | null
  application: {
    job: { id: string; appName: string }
    tester: { id: string; email: string; name: string | null }
  }
}

interface FraudStats {
  totalFlagged: number
  unresolvedLogs: number
  recentHighSeverity: number
  topSuspiciousUsers: Array<{
    id: string
    email: string
    name: string | null
    fraudScore: number
    flagged: boolean
    createdAt: string
    _count: { applications: number }
  }>
}

interface FraudLog {
  id: string
  type: string
  severity: string
  description: string
  ipAddress: string | null
  resolved: boolean
  createdAt: string
  user: { id: string; email: string; name: string | null; role: string } | null
}

interface FeedbackReport {
  id: string
  reason: string
  details: string | null
  createdAt: string
  resolvedAt: string | null
  reporter: { id: string; email: string; name: string | null; role: string }
  application: {
    id: string
    developerReply?: string | null
    job: { id: string; appName: string; developer: { id: string; email: string; name: string | null } }
  }
}

interface TestimonialFeedback {
  id: string
  type: string
  rating: number
  title: string
  message: string
  approved: boolean
  createdAt: string
  displayName: string | null
  companyName: string | null
  user: { id: string; email: string; name: string | null; role: string }
}

export default function AdminDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [processingPayouts, setProcessingPayouts] = useState(false)

  // Tab data
  const [users, setUsers] = useState<User[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [fraudStats, setFraudStats] = useState<FraudStats | null>(null)
  const [fraudLogs, setFraudLogs] = useState<FraudLog[]>([])
  const [feedbackReports, setFeedbackReports] = useState<FeedbackReport[]>([])
  const [testimonials, setTestimonials] = useState<TestimonialFeedback[]>([])
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'pending' | 'approved'>('pending')
  const [loadingTab, setLoadingTab] = useState(false)
  const [activeTab, setActiveTab] = useState('users')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const failedPaymentsCount = payments.filter((payment) => payment.status === 'FAILED').length
  const unresolvedReportsCount = feedbackReports.filter((report) => !report.resolvedAt).length

  const handleSuspendUser = async (userId: string, action: 'suspend' | 'unsuspend') => {
    const reason = action === 'suspend' 
      ? prompt('Enter suspension reason (optional):', 'Violation of Terms of Service')
      : null
    
    if (action === 'suspend' && reason === null) return // User cancelled

    setActionLoading(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Success', description: data.message, variant: 'success' })
        fetchUsers()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update user', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to PERMANENTLY DELETE this user? This cannot be undone.')) return

    setActionLoading(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Deleted', description: data.message, variant: 'success' })
        fetchUsers()
        fetchStats()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete user', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleProcessPayouts = async () => {
    setProcessingPayouts(true)
    try {
      const response = await fetch('/api/admin/payouts/process', { method: 'POST' })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Payouts Processed', description: `${data.processed} payouts processed`, variant: 'success' })
        fetchStats()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to process payouts', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setProcessingPayouts(false)
    }
  }

  useEffect(() => {
    if (!loading && user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Fetch stats and initial tab data only after auth is confirmed
  useEffect(() => {
    if (!loading && user?.role === 'ADMIN') {
      fetchStats()
      fetchUsers() // Load users tab by default
    }
  }, [loading, user])

  useEffect(() => {
    if (!loading && user?.role === 'ADMIN') {
      if (activeTab === 'users') fetchUsers()
      else if (activeTab === 'jobs') fetchJobs()
      else if (activeTab === 'applications') fetchApplications()
      else if (activeTab === 'payments') fetchPayments()
      else if (activeTab === 'reports') fetchFeedbackReports()
      else if (activeTab === 'testimonials') fetchTestimonials()
      else if (activeTab === 'fraud') fetchFraudData()
    }
  }, [activeTab, loading, user, feedbackFilter])

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const response = await fetch('/api/admin/stats')
      const data = await response.json()
      console.log('📊 Stats response:', { status: response.status, data })
      if (response.ok) {
        setStats(data.stats)
        console.log('✅ Stats loaded:', data.stats)
      } else {
        console.error('❌ Stats fetch failed:', data)
      }
    } catch (error) {
      console.error('❌ Failed to fetch stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchUsers = async () => {
    setLoadingTab(true)
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      console.log('👥 Users response:', { status: response.status, count: data.users?.length, data })
      if (response.ok) {
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('❌ Failed to fetch users:', error)
    } finally {
      setLoadingTab(false)
    }
  }

  const fetchJobs = async () => {
    setLoadingTab(true)
    try {
      const response = await fetch('/api/admin/jobs')
      const data = await response.json()
      console.log('📋 Jobs response:', { status: response.status, count: data.jobs?.length })
      if (response.ok) setJobs(data.jobs || [])
    } catch (error) {
      console.error('❌ Failed to fetch jobs:', error)
    } finally {
      setLoadingTab(false)
    }
  }

  const fetchApplications = async () => {
    setLoadingTab(true)
    try {
      const response = await fetch('/api/admin/applications')
      const data = await response.json()
      console.log('📝 Applications response:', { status: response.status, count: data.applications?.length })
      if (response.ok) setApplications(data.applications || [])
    } catch (error) {
      console.error('❌ Failed to fetch applications:', error)
    } finally {
      setLoadingTab(false)
    }
  }

  const fetchPayments = async () => {
    setLoadingTab(true)
    try {
      const response = await fetch('/api/admin/payments')
      const data = await response.json()
      console.log('💰 Payments response:', { status: response.status, count: data.payments?.length })
      if (response.ok) setPayments(data.payments || [])
    } catch (error) {
      console.error('❌ Failed to fetch payments:', error)
    } finally {
      setLoadingTab(false)
    }
  }

  const fetchFraudData = async () => {
    setLoadingTab(true)
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/admin/fraud?view=stats'),
        fetch('/api/admin/fraud?view=logs&resolved=false'),
      ])
      const statsData = await statsRes.json()
      const logsData = await logsRes.json()
      if (statsRes.ok) setFraudStats(statsData)
      if (logsRes.ok) setFraudLogs(logsData.logs || [])
    } catch (error) {
      console.error('Failed to fetch fraud data:', error)
    } finally {
      setLoadingTab(false)
    }
  }

  const fetchFeedbackReports = async () => {
    setLoadingTab(true)
    try {
      const response = await fetch('/api/admin/feedback-reports?resolved=false')
      const data = await response.json()
      if (response.ok) {
        setFeedbackReports(data.reports || [])
      } else {
        console.error('Failed to fetch reports:', data.error)
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoadingTab(false)
    }
  }

  const fetchTestimonials = async () => {
    setLoadingTab(true)
    try {
      const params = new URLSearchParams()
      if (feedbackFilter === 'pending') params.set('approved', 'false')
      if (feedbackFilter === 'approved') params.set('approved', 'true')
      const response = await fetch(`/api/admin/feedback?${params.toString()}`)
      const data = await response.json()
      if (response.ok) {
        setTestimonials(data.feedback || [])
      } else {
        console.error('Failed to fetch feedback:', data.error)
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error)
    } finally {
      setLoadingTab(false)
    }
  }

  const handleResolveReport = async (reportId: string) => {
    setActionLoading(reportId)
    try {
      const response = await fetch(`/api/admin/feedback-reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Resolved', description: 'Report marked as resolved', variant: 'success' })
        fetchFeedbackReports()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to resolve report', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleFeedbackApproval = async (feedbackId: string, approved: boolean) => {
    setActionLoading(feedbackId)
    try {
      const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Updated', description: data.message, variant: 'success' })
        fetchTestimonials()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update feedback', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!confirm('Delete this feedback permanently?')) return
    setActionLoading(feedbackId)
    try {
      const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Deleted', description: data.message, variant: 'success' })
        fetchTestimonials()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete feedback', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleResolveFraudLog = async (logId: string) => {
    setActionLoading(logId)
    try {
      const response = await fetch('/api/admin/fraud', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve-log', logId }),
      })
      if (response.ok) {
        toast({ title: 'Resolved', description: 'Fraud log marked as resolved', variant: 'success' })
        fetchFraudData()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to resolve', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleClearUserFlags = async (userId: string) => {
    setActionLoading(userId)
    try {
      const response = await fetch('/api/admin/fraud', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-flags', userId }),
      })
      if (response.ok) {
        toast({ title: 'Cleared', description: 'User fraud flags cleared', variant: 'success' })
        fetchFraudData()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to clear flags', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }


  // Retry payout for failed payments (admin)
  // This function must be inside the AdminDashboard component, but outside of the JSX/table rendering
  // Place this with the other handler functions
  const handleRetryPayout = async (paymentId: string) => {
    setActionLoading(paymentId)
    try {
      const response = await fetch(`/api/admin/payments/retry/${paymentId}`, { method: 'POST' })
      if (response.ok) {
        await fetchPayments()
        toast({ title: 'Retry Success', description: 'Payout retry triggered', variant: 'success' })
      } else {
        const data = await response.json()
        toast({ title: 'Retry Failed', description: data.error || 'Failed to retry payout', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      ACTIVE: { variant: 'default', icon: CheckCircle },
      COMPLETED: { variant: 'secondary', icon: CheckCircle },
      DRAFT: { variant: 'outline', icon: Clock },
      PENDING: { variant: 'outline', icon: Clock },
      APPROVED: { variant: 'default', icon: CheckCircle },
      REJECTED: { variant: 'destructive', icon: XCircle },
      TESTING: { variant: 'default', icon: Clock },
      PAID: { variant: 'secondary', icon: DollarSign },
    }
    const config = statusConfig[status] || { variant: 'outline' as const, icon: Clock }
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (user?.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-600 mt-1">Platform overview and management</p>
        </div>
        <Button 
          onClick={handleProcessPayouts} 
          disabled={processingPayouts}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {processingPayouts ? 'Processing...' : 'Process Due Payouts'}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loadingStats ? '...' : (stats?.totalUsers ?? 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.totalDevelopers ?? 0} developers • {stats?.totalTesters ?? 0} testers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Jobs
            </CardTitle>
            <Briefcase className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loadingStats ? '...' : (stats?.totalJobs ?? 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.activeJobs ?? 0} active • {stats?.completedJobs ?? 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Applications
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loadingStats ? '...' : (stats?.totalApplications ?? 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              €{loadingStats ? '...' : (stats?.totalRevenue?.toFixed(2) ?? '0.00')}
            </div>
            <p className="text-xs text-gray-500 mt-1">Platform fees</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Users ({stats?.totalUsers || 0})</TabsTrigger>
          <TabsTrigger value="jobs">Jobs ({stats?.totalJobs || 0})</TabsTrigger>
          <TabsTrigger value="applications">Applications ({stats?.totalApplications || 0})</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports ({unresolvedReportsCount})</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
          <TabsTrigger value="fraud" className="text-red-600">
            <ShieldAlert className="h-4 w-4 mr-1" />
            Fraud ({fraudStats?.unresolvedLogs || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>All registered users on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTab ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Name</th>
                        <th className="text-left py-3 px-2">Email</th>
                        <th className="text-left py-3 px-2">Role</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-left py-3 px-2">Jobs/Apps</th>
                        <th className="text-left py-3 px-2">Stripe</th>
                        <th className="text-left py-3 px-2">Joined</th>
                        <th className="text-left py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className={`border-b hover:bg-gray-50 ${u.suspended ? 'bg-red-50' : ''}`}>
                          <td className="py-3 px-2">{u.name || '-'}</td>
                          <td className="py-3 px-2">{u.email}</td>
                          <td className="py-3 px-2">
                            <Badge variant={u.role === 'ADMIN' ? 'destructive' : u.role === 'DEVELOPER' ? 'default' : 'secondary'}>
                              {u.role}
                            </Badge>
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
                          </td>
                          <td className="py-3 px-2">
                            {u.role === 'DEVELOPER' ? `${u._count.developedJobs} jobs` : `${u._count.applications} apps`}
                          </td>
                          <td className="py-3 px-2">
                            {u.stripeAccountId ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-gray-500">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-2">
                            {u.role !== 'ADMIN' && (
                              <div className="flex gap-1">
                                {u.suspended ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSuspendUser(u.id, 'unsuspend')}
                                    disabled={actionLoading === u.id}
                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                  >
                                    Unsuspend
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSuspendUser(u.id, 'suspend')}
                                    disabled={actionLoading === u.id}
                                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Job Management</CardTitle>
              <CardDescription>All testing jobs on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTab ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No jobs found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">App Name</th>
                        <th className="text-left py-3 px-2">Developer</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-left py-3 px-2">Testers</th>
                        <th className="text-left py-3 px-2">Apps</th>
                        <th className="text-left py-3 px-2">Payment</th>
                        <th className="text-left py-3 px-2">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <tr key={job.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium">{job.appName}</td>
                          <td className="py-3 px-2">{job.developer.name || job.developer.email}</td>
                          <td className="py-3 px-2">{getStatusBadge(job.status)}</td>
                          <td className="py-3 px-2">{job.testersNeeded}</td>
                          <td className="py-3 px-2">{job._count.applications}</td>
                          <td className="py-3 px-2">€{job.paymentPerTester}</td>
                          <td className="py-3 px-2 text-gray-500">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Application Monitoring</CardTitle>
              <CardDescription>All tester applications</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTab ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No applications found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Tester</th>
                        <th className="text-left py-3 px-2">App</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-left py-3 px-2">Applied</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app) => (
                        <tr key={app.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2">{app.tester.name || app.tester.email}</td>
                          <td className="py-3 px-2">{app.job.appName}</td>
                          <td className="py-3 px-2">{getStatusBadge(app.status)}</td>
                          <td className="py-3 px-2 text-gray-500">
                            {new Date(app.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Reconciliation</CardTitle>
              <CardDescription>All tester payments</CardDescription>
            </CardHeader>
            <CardContent>
              {failedPaymentsCount > 0 && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <AlertCircle className="h-4 w-4" />
                  {failedPaymentsCount} failed payout{failedPaymentsCount === 1 ? '' : 's'} need attention. See the
                  reason column for details.
                </div>
              )}
              <div className="mb-4 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                <Info className="mt-0.5 h-4 w-4 text-blue-700" />
                <div>
                  <p className="font-medium">Payouts run only when funds are available</p>
                </div>
              </div>
              {loadingTab ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No payments found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Tester</th>
                        <th className="text-left py-3 px-2">App</th>
                        <th className="text-left py-3 px-2">Amount</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-left py-3 px-2">Reason</th>
                        <th className="text-left py-3 px-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2">
                            {payment.application?.tester?.name || payment.application?.tester?.email || '-'}
                          </td>
                          <td className="py-3 px-2">{payment.application?.job?.appName || '-'}</td>
                          <td className="py-3 px-2 font-medium">€{payment.amount.toFixed(2)}</td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              {getStatusBadge(payment.status)}
                              {payment.status === 'FAILED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="ml-2"
                                  disabled={actionLoading === payment.id}
                                  onClick={() => handleRetryPayout(payment.id)}
                                >
                                  {actionLoading === payment.id ? 'Retrying...' : 'Retry'}
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            {payment.failureReason || (payment.status === 'FAILED' ? 'Unknown error' : '-')}
                          </td>
                          <td className="py-3 px-2 text-gray-500">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}

  
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Feedback Reply Reports</CardTitle>
              <CardDescription>Reports submitted by testers about developer replies</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTab ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : feedbackReports.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Flag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No reports found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Reporter</th>
                        <th className="text-left py-3 px-2">App</th>
                        <th className="text-left py-3 px-2">Reason</th>
                        <th className="text-left py-3 px-2">Reply</th>
                        <th className="text-left py-3 px-2">Details</th>
                        <th className="text-left py-3 px-2">Date</th>
                        <th className="text-left py-3 px-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbackReports.map((report) => (
                        <tr key={report.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2">
                            {report.reporter.name || report.reporter.email}
                          </td>
                          <td className="py-3 px-2">{report.application.job.appName}</td>
                          <td className="py-3 px-2">
                            <Badge variant="outline">{report.reason}</Badge>
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            <span className="line-clamp-2">
                              {report.application.developerReply || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            {report.details || '-'}
                          </td>
                          <td className="py-3 px-2 text-gray-500">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading === report.id}
                              onClick={() => handleResolveReport(report.id)}
                            >
                              {actionLoading === report.id ? 'Resolving...' : 'Resolve'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testimonials">
          <Card>
            <CardHeader>
              <CardTitle>Testimonials & Feedback</CardTitle>
              <CardDescription>Approve feedback to show on the landing page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Button
                  size="sm"
                  variant={feedbackFilter === 'pending' ? 'default' : 'outline'}
                  onClick={() => setFeedbackFilter('pending')}
                >
                  Pending
                </Button>
                <Button
                  size="sm"
                  variant={feedbackFilter === 'approved' ? 'default' : 'outline'}
                  onClick={() => setFeedbackFilter('approved')}
                >
                  Approved
                </Button>
                <Button
                  size="sm"
                  variant={feedbackFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFeedbackFilter('all')}
                >
                  All
                </Button>
              </div>

              {loadingTab ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : testimonials.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No feedback found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Type</th>
                        <th className="text-left py-3 px-2">Rating</th>
                        <th className="text-left py-3 px-2">Title</th>
                        <th className="text-left py-3 px-2">Message</th>
                        <th className="text-left py-3 px-2">Author</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-left py-3 px-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testimonials.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2 capitalize">{item.type}</td>
                          <td className="py-3 px-2">{item.rating}/5</td>
                          <td className="py-3 px-2 font-medium">{item.title}</td>
                          <td className="py-3 px-2 text-gray-600">
                            <span className="line-clamp-2">{item.message}</span>
                          </td>
                          <td className="py-3 px-2">
                            {item.displayName || item.user.name || item.user.email}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={item.approved ? 'default' : 'outline'}>
                              {item.approved ? 'Approved' : 'Pending'}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoading === item.id}
                                onClick={() => handleToggleFeedbackApproval(item.id, !item.approved)}
                              >
                                {actionLoading === item.id
                                  ? 'Saving...'
                                  : item.approved
                                    ? 'Unapprove'
                                    : 'Approve'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={actionLoading === item.id}
                                onClick={() => handleDeleteFeedback(item.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fraud">
          <div className="space-y-6">
            {/* Fraud Stats */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-600">Flagged Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-700">{fraudStats?.totalFlagged || 0}</div>
                </CardContent>
              </Card>
              <Card className="border-orange-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-orange-600">Unresolved Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-700">{fraudStats?.unresolvedLogs || 0}</div>
                </CardContent>
              </Card>
              <Card className="border-yellow-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-yellow-600">High Severity (7d)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-700">{fraudStats?.recentHighSeverity || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Top Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {fraudStats?.topSuspiciousUsers?.[0]?.fraudScore || 0}/100
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Suspicious Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-red-500" />
                  Suspicious Users
                </CardTitle>
                <CardDescription>Users with high fraud scores</CardDescription>
              </CardHeader>
              <CardContent>
                {fraudStats?.topSuspiciousUsers?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-green-400" />
                    <p>No suspicious users detected</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">User</th>
                          <th className="text-left py-3 px-2">Fraud Score</th>
                          <th className="text-left py-3 px-2">Applications</th>
                          <th className="text-left py-3 px-2">Joined</th>
                          <th className="text-left py-3 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fraudStats?.topSuspiciousUsers?.map((u) => (
                          <tr key={u.id} className="border-b hover:bg-red-50">
                            <td className="py-3 px-2">
                              <div>{u.name || u.email}</div>
                              <div className="text-xs text-gray-500">{u.email}</div>
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant={u.fraudScore >= 70 ? 'destructive' : u.fraudScore >= 40 ? 'secondary' : 'outline'}>
                                {u.fraudScore}/100
                              </Badge>
                            </td>
                            <td className="py-3 px-2">{u._count.applications}</td>
                            <td className="py-3 px-2 text-gray-500">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleClearUserFlags(u.id)}
                                  disabled={actionLoading === u.id}
                                >
                                  Clear Flags
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleSuspendUser(u.id, 'suspend')}
                                  disabled={actionLoading === u.id}
                                >
                                  Suspend
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fraud Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Unresolved Fraud Logs</CardTitle>
                <CardDescription>Detected suspicious activities</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTab ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                  </div>
                ) : fraudLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                    <p>No unresolved fraud logs</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fraudLogs.map((log) => (
                      <div key={log.id} className={`p-4 rounded-lg border ${
                        log.severity === 'critical' ? 'bg-red-50 border-red-300' :
                        log.severity === 'high' ? 'bg-orange-50 border-orange-300' :
                        log.severity === 'medium' ? 'bg-yellow-50 border-yellow-300' :
                        'bg-gray-50 border-gray-300'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={log.severity === 'critical' || log.severity === 'high' ? 'destructive' : 'secondary'}>
                                {log.severity.toUpperCase()}
                              </Badge>
                              <Badge variant="outline">{log.type.replace('_', ' ')}</Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(log.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="mt-2 text-sm">{log.description}</p>
                            {log.user && (
                              <p className="mt-1 text-xs text-gray-500">
                                User: {log.user.name || log.user.email} ({log.user.role})
                              </p>
                            )}
                            {log.ipAddress && (
                              <p className="text-xs text-gray-500">IP: {log.ipAddress}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolveFraudLog(log.id)}
                            disabled={actionLoading === log.id}
                          >
                            Mark Resolved
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

      {/* Alerts */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-900">
            <AlertCircle className="h-5 w-5" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-yellow-800">
            <p>✓ All systems operational</p>
            <p>✓ No pending issues</p>
            <p>✓ {stats?.pendingPayments || 0} payments pending processing</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

