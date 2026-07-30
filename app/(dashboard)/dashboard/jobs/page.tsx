'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Briefcase, Calendar, Users, DollarSign, CheckCircle, Package } from 'lucide-react'
import Link from 'next/link'
import { formatEurFromCents } from '@/lib/currency'
import { useAuth } from '@/hooks/use-auth'
import type { Cents } from '@/types/money'

interface Job {
  id: string
  appName: string
  appDescription: string
  status: string
  planType: string | null
  testersNeeded: number
  /** Payment per tester in integer cents (EUR). */
  paymentPerTester: Cents
  /** Total job cost in integer cents (EUR). */
  totalBudget: Cents
  /** Platform fee in integer cents (EUR). */
  platformFee: Cents
  createdAt: string
  _count: {
    applications: number
  }
}

const PLAN_LABELS: Record<string, string> = {
  STARTER: 'Starter',
  GROWTH: 'Growth',
  PRO: 'Pro',
}

const PLAN_COLORS: Record<string, string> = {
  STARTER: 'bg-gray-100 text-gray-800 border-gray-200',
  GROWTH: 'bg-blue-100 text-blue-800 border-blue-200',
  PRO: 'bg-purple-100 text-purple-800 border-purple-200',
}

export default function JobsPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      if (searchParams?.get('payment') === 'success') {
        activatePaidJobs()
      } else {
        fetchJobs()
      }
    }
  }, [user, searchParams])

  const activatePaidJobs = async () => {
    try {
      await fetch('/api/jobs/activate-paid', { method: 'POST' })
      setPaymentSuccess(true)
      window.history.replaceState({}, '', '/dashboard/jobs')
    } catch (error) {
      console.error('Failed to activate jobs:', error)
    } finally {
      fetchJobs()
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await fetch(`/api/jobs?userId=${user?.id}`)
      const data = await response.json()
      if (response.ok && data.jobs) {
        setJobs(data.jobs)
      } else {
        setJobs([])
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setLoading(false)
    }
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

  const getPlanBadge = (planType: string | null) => {
    if (!planType) return null
    const label = PLAN_LABELS[planType] || planType
    const colorClass = PLAN_COLORS[planType] || 'bg-gray-100 text-gray-800 border-gray-200'
    return (
      <Badge variant="outline" className={`${colorClass} text-xs`}>
        <Package className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {paymentSuccess && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Payment successful!</p>
                <p className="text-sm text-green-700">Your job is now live and visible to testers.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">My Jobs</h2>
          <p className="text-gray-600 mt-1">Manage your testing jobs</p>
        </div>
        <Link href="/dashboard/jobs/new">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create New Job
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-gray-500">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="font-medium mb-2">No jobs yet</p>
              <p className="text-sm mb-4">Create your first testing job to begin the flow.</p>
              <ul className="mx-auto max-w-md text-left text-sm text-gray-600 space-y-1 mb-4">
                <li>• Pick a plan (Starter, Growth, or Pro)</li>
                <li>• Add your app details and Play Console link</li>
                <li>• Pay and publish — testers apply instantly</li>
              </ul>
              <Link href="/dashboard/jobs/new">
                <Button>Create Job</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {jobs.map((job) => {
            const totalCost = job.totalBudget + job.platformFee
            return (
              <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <CardTitle className="text-xl">{job.appName}</CardTitle>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                          {getPlanBadge(job.planType)}
                        </div>
                        <CardDescription className="line-clamp-2">
                          {job.appDescription}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>
                          {job._count.applications} / {job.testersNeeded} testers
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="h-4 w-4" />
                        <span>{formatEurFromCents(job.paymentPerTester)} per tester</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">{formatEurFromCents(totalCost)} total</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>Created {new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ 
                            width: `${Math.min((job._count.applications / job.testersNeeded) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}