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
  CheckCircle,
  Clock,
  XCircle
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
  application: {
    job: { id: string; appName: string }
    tester: { id: string; email: string; name: string | null }
  }
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
  const [loadingTab, setLoadingTab] = useState(false)
  const [activeTab, setActiveTab] = useState('users')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    if (activeTab === 'users') fetchUsers()
    else if (activeTab === 'jobs') fetchJobs()
    else if (activeTab === 'applications') fetchApplications()
    else if (activeTab === 'payments') fetchPayments()
  }, [activeTab])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      const data = await response.json()
      if (response.ok) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchUsers = async () => {
    setLoadingTab(true)
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      if (response.ok) setUsers(data.users)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoadingTab(false)
    }
  }

  const fetchJobs = async () => {
    setLoadingTab(true)
    try {
      const response = await fetch('/api/admin/jobs')
      const data = await response.json()
      if (response.ok) setJobs(data.jobs)
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setLoadingTab(false)
    }
  }

  const fetchApplications = async () => {
    setLoadingTab(true)
    try {
      const response = await fetch('/api/admin/applications')
      const data = await response.json()
      if (response.ok) setApplications(data.applications)
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoadingTab(false)
    }
  }

  const fetchPayments = async () => {
    setLoadingTab(true)
    try {
      const response = await fetch('/api/admin/payments')
      const data = await response.json()
      if (response.ok) setPayments(data.payments)
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    } finally {
      setLoadingTab(false)
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

  if (loading || loadingStats) {
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
            <div className="text-3xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.totalDevelopers || 0} developers • {stats?.totalTesters || 0} testers
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
            <div className="text-3xl font-bold">{stats?.totalJobs || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.activeJobs || 0} active • {stats?.completedJobs || 0} completed
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
            <div className="text-3xl font-bold">{stats?.totalApplications || 0}</div>
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
            <div className="text-3xl font-bold">${stats?.totalRevenue.toFixed(2) || '0.00'}</div>
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
                          <td className="py-3 px-2">${job.paymentPerTester}</td>
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
                          <td className="py-3 px-2 font-medium">${payment.amount.toFixed(2)}</td>
                          <td className="py-3 px-2">{getStatusBadge(payment.status)}</td>
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