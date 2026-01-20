'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { VerificationUploader } from '@/components/applications/verification-uploader'
import { FileText, DollarSign, Clock, Calendar, ExternalLink, Upload, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { FeedbackForm } from '@/components/applications/feedback-form'

interface Application {
  id: string
  status: string
  createdAt: string
  testingStartDate: string | null
  testingEndDate: string | null
  optInVerified: boolean
  verificationImage: string | null
  feedback: string | null
  rating: number | null
  job: {
    id: string
    appName: string
    appDescription: string
    googlePlayLink: string
    paymentPerTester: number
    testDuration: number
    developer: {
      name: string | null
      email: string
    }
  }
  payment: {
    amount: number
    status: string
  } | null
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications')
      const data = await response.json()
      if (response.ok) {
        setApplications(data.applications)
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenUpload = (applicationId: string) => {
    setSelectedApplicationId(applicationId)
    setUploadDialogOpen(true)
  }

  const handleUploadComplete = () => {
    setUploadDialogOpen(false)
    setSelectedApplicationId(null)
    fetchApplications()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED': return 'bg-blue-100 text-blue-800'
      case 'OPTED_IN': return 'bg-indigo-100 text-indigo-800'
      case 'VERIFIED': return 'bg-green-100 text-green-800'
      case 'TESTING': return 'bg-purple-100 text-purple-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Waiting for developer approval'
      case 'APPROVED': return 'Approved! Next: Opt-in to Google Play test'
      case 'OPTED_IN': return 'Verification submitted. Waiting for developer review'
      case 'VERIFIED': return 'Verified! Testing period will start soon'
      case 'TESTING': return 'Testing in progress'
      case 'COMPLETED': return 'Testing completed! Payment processing'
      case 'REJECTED': return 'Application was not approved'
      default: return ''
    }
  }

  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">My Applications</h2>
        <p className="text-gray-600 mt-1">Track your testing applications and earnings</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{applications.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {applications.filter(app => app.status === 'TESTING').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {applications.filter(app => app.status === 'COMPLETED').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${applications
                .filter(app => app.status === 'COMPLETED')
                .reduce((sum, app) => sum + (app.payment?.amount || 0), 0)
                .toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="font-medium mb-2">No applications yet</p>
              <p className="text-sm mb-4">Apply to testing jobs to see them here</p>
              <Link href="/dashboard/browse">
                <Button>Browse Jobs</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{app.job.appName}</CardTitle>
                      <Badge className={getStatusColor(app.status)}>
                        {app.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardDescription>{getStatusMessage(app.status)}</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${app.job.paymentPerTester}
                    </p>
                    <p className="text-xs text-gray-500">Payment</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Application Info */}
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    Applied {new Date(app.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    {app.job.testDuration} day testing period
                  </div>
                  {app.testingEndDate && app.status === 'TESTING' && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      {calculateDaysRemaining(app.testingEndDate)} days remaining
                    </div>
                  )}
                </div>

                {/* Action Steps */}
                {app.status === 'PENDING' && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⏳ Your application is being reviewed by the developer. You'll be notified once approved.
                    </p>
                  </div>
                )}

                {app.status === 'APPROVED' && !app.verificationImage && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-3">
                    <p className="text-sm text-blue-800 font-medium">
                      ✅ Congratulations! Your application was approved.
                    </p>
                    <div className="bg-white border border-blue-100 rounded-lg p-3">
                      <p className="text-sm text-blue-900 font-semibold mb-2">Next steps:</p>
                      <ol className="text-sm text-blue-800 space-y-2">
                        <li className="flex gap-2">
                          <span className="font-bold">1.</span>
                          <span>Click the link below to open the app in Google Play Store</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold">2.</span>
                          <span>Take a <strong>screenshot of the Play Store page</strong> showing the app</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold">3.</span>
                          <span>Install the app on your phone</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold">4.</span>
                          <span>Take a <strong>screenshot of the app on your home screen</strong></span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold">5.</span>
                          <span>Upload your screenshot(s) below</span>
                        </li>
                      </ol>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button asChild size="sm" className="flex-1">
                        <a 
                          href={app.job.googlePlayLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in Play Store
                        </a>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleOpenUpload(app.id)}
                        className="flex-1"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Screenshot
                      </Button>
                    </div>
                  </div>
                )}

                {app.status === 'OPTED_IN' && (
                  <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg space-y-3">
                    <p className="text-sm text-indigo-800 font-medium">
                      📸 Verification screenshot submitted
                    </p>
                    <p className="text-sm text-indigo-800">
                      The developer is reviewing your screenshot. Testing will start once verified.
                    </p>
                    {app.verificationImage && (
                      <img 
                        src={app.verificationImage} 
                        alt="Verification" 
                        className="max-w-xs rounded border"
                      />
                    )}
                  </div>
                )}

                {app.status === 'TESTING' && app.testingStartDate && app.testingEndDate && (
                  <div className="space-y-4">
                    <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                      <div className="space-y-2">
                        <p className="text-sm text-purple-800 font-medium">
                          🎯 Testing in progress
                        </p>
                        <div className="flex justify-between text-sm text-purple-700">
                          <span>Started: {new Date(app.testingStartDate).toLocaleDateString()}</span>
                          <span>Ends: {new Date(app.testingEndDate).toLocaleDateString()}</span>
                        </div>
                        <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all"
                            style={{ 
                              width: `${Math.min(
                                ((new Date().getTime() - new Date(app.testingStartDate).getTime()) / 
                                (new Date(app.testingEndDate).getTime() - new Date(app.testingStartDate).getTime())) * 100,
                                100
                              )}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Feedback Form for Testing */}
                    <FeedbackForm
                      applicationId={app.id}
                      appName={app.job.appName}
                      existingFeedback={app.feedback || undefined}
                      existingRating={app.rating || undefined}
                      onSubmit={fetchApplications}
                    />
                  </div>
                )}

                {app.status === 'COMPLETED' && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <p className="text-sm text-green-800 font-medium">
                        🎉 Testing completed! Payment of ${app.payment?.amount || 0} is being processed.
                      </p>
                    </div>
                    
                    {/* Feedback Form for Completed - can still submit if not done */}
                    <FeedbackForm
                      applicationId={app.id}
                      appName={app.job.appName}
                      existingFeedback={app.feedback || undefined}
                      existingRating={app.rating || undefined}
                      onSubmit={fetchApplications}
                    />
                  </div>
                )}

                {app.status === 'REJECTED' && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <p className="text-sm text-red-800">
                      Your application was not approved by the developer.
                    </p>
                  </div>
                )}

                {/* Developer Info */}
                <div className="pt-3 border-t text-xs text-gray-500">
                  Developer: {app.job.developer.name || app.job.developer.email}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verify Your Test Participation</DialogTitle>
            <DialogDescription>
              Upload a screenshot from Google Play showing you've joined the closed test
            </DialogDescription>
          </DialogHeader>
          {selectedApplicationId && (
            <VerificationUploader
              applicationId={selectedApplicationId}
              onUploadComplete={handleUploadComplete}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}