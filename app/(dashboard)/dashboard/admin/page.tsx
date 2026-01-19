'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  CheckCircle
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

export default function AdminDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [processingPayouts, setProcessingPayouts] = useState(false)

  const handleProcessPayouts = async () => {
    setProcessingPayouts(true)
    try {
      const response = await fetch('/api/admin/payouts/process', { method: 'POST' })
      const data = await response.json()
      if (response.ok) {
        alert(`Successfully processed ${data.processed} payouts!`)
        fetchStats()
      } else {
        alert(data.error || 'Failed to process payouts')
      }
    } catch (error) {
      alert('Something went wrong')
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
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Monitor and manage platform users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>User management interface coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Job Management</CardTitle>
              <CardDescription>Monitor all testing jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Job management interface coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Application Monitoring</CardTitle>
              <CardDescription>Review and moderate applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Application monitoring interface coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Reconciliation</CardTitle>
              <CardDescription>Track and manage all payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Payment reconciliation interface coming soon</p>
              </div>
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