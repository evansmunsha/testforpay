'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Briefcase, Calendar, Users, DollarSign, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'

interface Job {
  id: string
  appName: string
  appDescription: string
  status: string
  testersNeeded: number
  paymentPerTester: number
  createdAt: string
  _count: {
    applications: number
  }
}

export default function JobsPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      // Check if returning from successful payment
      if (searchParams?.get('payment') === 'success') {
        activatePaidJobs()
      } else {
        fetchJobs()
      }
    }
  }, [user, searchParams])

  const activatePaidJobs = async () => {
    try {
      // Activate any DRAFT jobs that were just paid
      await fetch('/api/jobs/activate-paid', { method: 'POST' })
      setPaymentSuccess(true)
      // Clear the URL param
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {paymentSuccess && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900 text-sm sm:text-base">Payment successful!</p>
                <p className="text-xs sm:text-sm text-green-700">Your job is now live and visible to testers.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">My Jobs</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your testing jobs</p>
        </div>
        <Link href="/dashboard/jobs/new" className="w-full sm:w-auto">
          <Button size="lg" className="gap-2 w-full sm:w-auto">
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
              <p className="text-sm mb-4">Create your first testing job to get started</p>
              <Link href="/dashboard/jobs/new">
                <Button>Create Job</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {jobs.map((job) => (
            <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{job.appName}</CardTitle>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
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
                      <span>${job.paymentPerTester} per tester</span>
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
          ))}
        </div>
      )}
    </div>
  )
}