'use client'

import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Briefcase, Users, Clock, DollarSign, Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const { user, isDeveloper } = useAuth()

  if (isDeveloper) {
    return <DeveloperDashboard />
  }

  return <TesterDashboard />
}

function DeveloperDashboard() {
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalTesters: 0,
    pendingReviews: 0,
    totalSpent: 0,
  })
  const [pendingActions, setPendingActions] = useState<{
    pendingApprovals: any[],
    pendingVerifications: any[]
  }>({
    pendingApprovals: [],
    pendingVerifications: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchPendingActions()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/developer/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchPendingActions = async () => {
    try {
      const response = await fetch('/api/developer/pending-actions')
      if (response.ok) {
        const data = await response.json()
        setPendingActions(data)
      }
    } catch (error) {
      console.error('Failed to fetch pending actions:', error)
    } finally {
      setLoading(false)
    }
  }

  const statsConfig = [
    {
      title: 'Active Jobs',
      value: loading ? '...' : stats.activeJobs.toString(),
      icon: Briefcase,
      description: 'Currently running',
      color: 'bg-blue-500',
    },
    {
      title: 'Total Testers',
      value: loading ? '...' : stats.totalTesters.toString(),
      icon: Users,
      description: 'Across all jobs',
      color: 'bg-green-500',
    },
    {
      title: 'Pending Reviews',
      value: loading ? '...' : stats.pendingReviews.toString(),
      icon: Clock,
      description: 'Applications to review',
      color: 'bg-yellow-500',
    },
    {
      title: 'Total Spent',
      value: loading ? '...' : `$${stats.totalSpent}`,
      icon: DollarSign,
      description: 'All time',
      color: 'bg-purple-500',
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Overview</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Welcome to your developer dashboard</p>
        </div>
        <Link href="/dashboard/jobs/new" className="w-full sm:w-auto">
          <Button size="lg" className="gap-2 w-full sm:w-auto">
            <Plus className="h-5 w-5" />
            Create New Job
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statsConfig.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.color} p-1.5 sm:p-2 rounded-lg flex-shrink-0`}>
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-xl sm:text-3xl font-bold">{stat.value}</div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>Create your first testing job</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Ready to test your app? Create a testing job and get 20+ real users 
              to test your app for 14 days.
            </p>
            <Link href="/dashboard/jobs/new">
              <Button className="w-full gap-2">
                Create Your First Job
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hidden sm:block">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>Quick guide for developers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <p className="text-sm text-gray-600">Post your testing job with app details</p>
            </div>
            <div className="flex gap-3">
              <div className="shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <p className="text-sm text-gray-600">Testers apply and opt-in to your closed test</p>
            </div>
            <div className="flex gap-3">
              <div className="shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <p className="text-sm text-gray-600">After 14 days, meet Google Play requirements</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>Testers waiting to be approved</CardDescription>
              </div>
              <Badge variant="outline">{pendingActions.pendingApprovals.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {pendingActions.pendingApprovals.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No new applications to review
              </div>
            ) : (
              <div className="space-y-4">
                {pendingActions.pendingApprovals.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold">{app.tester.name || app.tester.email}</p>
                      <p className="text-xs text-gray-500">{app.job.appName}</p>
                    </div>
                    <Link href={`/dashboard/jobs/${app.jobId}`}>
                      <Button size="sm" variant="ghost">Review</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Verifications</CardTitle>
                <CardDescription>Testers who uploaded screenshots</CardDescription>
              </div>
              <Badge variant="outline">{pendingActions.pendingVerifications.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {pendingActions.pendingVerifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No screenshots to verify
              </div>
            ) : (
              <div className="space-y-4">
                {pendingActions.pendingVerifications.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold">{app.tester.name || app.tester.email}</p>
                      <p className="text-xs text-gray-500">{app.job.appName}</p>
                    </div>
                    <Link href={`/dashboard/jobs/${app.jobId}`}>
                      <Button size="sm" variant="ghost" className="text-indigo-600">Verify</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TesterDashboard() {
  const [stats, setStats] = useState({
    activeTests: 0,
    completedTests: 0,
    pendingApplications: 0,
    totalEarned: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/tester/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statsConfig = [
    {
      title: 'Active Tests',
      value: loading ? '...' : stats.activeTests.toString(),
      icon: Clock,
      description: 'Currently testing',
      color: 'bg-blue-500',
    },
    {
      title: 'Completed',
      value: loading ? '...' : stats.completedTests.toString(),
      icon: Briefcase,
      description: 'Tests finished',
      color: 'bg-green-500',
    },
    {
      title: 'Pending',
      value: loading ? '...' : stats.pendingApplications.toString(),
      icon: Users,
      description: 'Awaiting approval',
      color: 'bg-yellow-500',
    },
    {
      title: 'Total Earned',
      value: loading ? '...' : `$${stats.totalEarned}`,
      icon: DollarSign,
      description: 'All time',
      color: 'bg-purple-500',
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Overview</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Welcome to your tester dashboard</p>
        </div>
        <Link href="/dashboard/browse" className="w-full sm:w-auto">
          <Button size="lg" className="gap-2 w-full sm:w-auto">
            Browse Jobs
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statsConfig.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.color} p-1.5 sm:p-2 rounded-lg flex-shrink-0`}>
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-xl sm:text-3xl font-bold">{stat.value}</div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Start Earning</CardTitle>
            <CardDescription>Find your first testing job</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Browse available testing jobs and start earning money by testing apps. 
              Earn $5-$15 per app!
            </p>
            <Link href="/dashboard/browse">
              <Button className="w-full gap-2">
                Browse Available Jobs
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hidden sm:block">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>Quick guide for testers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <p className="text-sm text-gray-600">Browse and apply to testing jobs</p>
            </div>
            <div className="flex gap-3">
              <div className="shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <p className="text-sm text-gray-600">Opt-in to closed test on Google Play</p>
            </div>
            <div className="flex gap-3">
              <div className="shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <p className="text-sm text-gray-600">Test for 14 days and get paid!</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>Your latest testing applications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="font-medium">No applications yet</p>
            <p className="text-sm mt-1">Apply to testing jobs to start earning</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



