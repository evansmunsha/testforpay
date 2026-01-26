'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApplicationCard } from '@/components/applications/application-card'
import { useToast } from '@/components/ui/toast-provider'
import { TestingReportViewer } from '@/components/jobs/testing-report-viewer'
import { ProductionQuestionnaire } from '@/components/dashboard/production-questionnaire'
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
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface Job {
  id: string
  appName: string
  appDescription: string
  packageName: string | null
  googlePlayLink: string
  appCategory: string | null
  testersNeeded: number
  testDuration: number
  minAndroidVersion: string | null
  paymentPerTester: number
  totalBudget: number
  platformFee: number
  status: string
  createdAt: string
  publishedAt: string | null
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
  optInVerified: boolean
  feedback: string | null
  rating: number | null
  tester: {
    id: string
    name: string | null
    email: string
    createdAt: string
    deviceInfo: {
      deviceModel: string
      androidVersion: string
      screenSize: string | null
    } | null
  }
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchJob()
  }, [])

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/jobs/${params.id}`)
      const data = await response.json()

      if (response.ok) {
        setJob(data.job)
      } else {
        setError(data.error || 'Failed to load job')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this job? This cannot be undone.')) return

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
        toast({ title: 'Error', description: 'Failed to publish job', variant: 'destructive' })
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
    if (!confirm('Are you sure you want to reject this application?')) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      })

      if (response.ok) {
        fetchJob()
        toast({ title: 'Rejected', description: 'Application rejected', variant: 'default' })
      } else {
        toast({ title: 'Error', description: 'Failed to reject application', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    // Calculate active testers to show in confirmation
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
    
    if (!confirm(confirmMessage)) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/jobs/${params.id}/cancel`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        // Build detailed message for successful cancellation
        let message = data.message
        
        if (data.cancellation?.testerPayouts?.length > 0) {
          const paidTesters = data.cancellation.testerPayouts.filter((p: any) => p.amount > 0)
          if (paidTesters.length > 0) {
            message += `. ${paidTesters.length} tester(s) compensated totaling $${data.cancellation.totalPaidToTesters.toFixed(2)}`
          }
        }
        
        if (data.refund?.issued) {
          message += `. Your refund: $${data.refund.amount.toFixed(2)}`
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
  }

  const handleVerify = async (applicationId: string) => {
    if (!confirm('Confirm that the tester has opted-in to your Google Play test? This will start the 14-day testing period.')) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      })

      if (response.ok) {
        fetchJob()
        toast({ title: 'Verified', description: 'Testing period started. Payment will be processed after 14 days.', variant: 'success' })
      } else {
        toast({ title: 'Error', description: 'Failed to verify application', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
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

  const progressPercentage = (job._count.applications / job.testersNeeded) * 100

  // Group applications by status
  const pendingApplications = job.applications.filter(app => app.status === 'PENDING')
  const approvedApplications = job.applications.filter(app => app.status === 'APPROVED')
  const activeApplications = job.applications.filter(app => 
    ['OPTED_IN', 'VERIFIED', 'TESTING'].includes(app.status)
  )
  const completedApplications = job.applications.filter(app => app.status === 'COMPLETED')
  const rejectedApplications = job.applications.filter(app => app.status === 'REJECTED')

  return (
    <div className="space-y-6">
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
            </div>
            <p className="text-gray-600 mt-1">Job ID: {job.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
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
          {job.status !== 'CANCELLED' && job.status !== 'COMPLETED' && (
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={actionLoading}
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Job
            </Button>
          )}
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Applications
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {job._count.applications} / {job.testersNeeded}
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
              Per Tester
            </CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${job.paymentPerTester}</div>
            <p className="text-xs text-gray-500 mt-1">Payment amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Budget
            </CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(job.totalBudget + job.platformFee).toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Including fees</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="applications" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="applications">
                All ({job.applications.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingApplications.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({activeApplications.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedApplications.length})
              </TabsTrigger>
              <TabsTrigger value="report">
                Report
              </TabsTrigger>
              <TabsTrigger value="production">
                Production
              </TabsTrigger>
            </TabsList>

            <TabsContent value="applications" className="space-y-4">
              {job.applications.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="font-medium">No applications yet</p>
                      <p className="text-sm mt-1">
                        {job.status === 'DRAFT' 
                          ? 'Publish your job to start receiving applications'
                          : 'Testers will appear here once they apply'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                job.applications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onVerify={handleVerify}
                    loading={actionLoading}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {pendingApplications.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium">No pending applications</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                pendingApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    loading={actionLoading}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              {activeApplications.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium">No active tests</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                activeApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onVerify={handleVerify}
                    loading={actionLoading}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedApplications.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium">No completed tests</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                completedApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="report" className="space-y-4">
              <TestingReportViewer jobId={job.id} />
            </TabsContent>

            <TabsContent value="production" className="space-y-4">
              <ProductionQuestionnaire jobId={job.id} />
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
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tester payments</span>
                <span className="font-medium">${job.totalBudget.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Platform fee (15%)</span>
                <span className="font-medium">${job.platformFee.toFixed(2)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">
                    ${(job.totalBudget + job.platformFee).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {job.status === 'DRAFT' && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-sm text-blue-900 mb-4">
                  Your job is in draft mode. Publish it to make it visible to testers.
                </p>
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