'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  User, 
  Mail, 
  Calendar, 
  Smartphone, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react'

interface ApplicationCardProps {
  application: {
    id: string
    status: string
    createdAt: string
    testingStartDate: string | null
    testingEndDate: string | null
    optInVerified: boolean
    verificationImage: string | null
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
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onVerify?: (id: string) => void
  loading?: boolean
}

export function ApplicationCard({ 
  application, 
  onApprove, 
  onReject, 
  onVerify,
  loading = false 
}: ApplicationCardProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false)

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

  const accountAge = Math.floor(
    (new Date().getTime() - new Date(application.tester.createdAt).getTime()) / 
    (1000 * 60 * 60 * 24)
  )

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {application.tester.name || 'Anonymous Tester'}
                </CardTitle>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {application.tester.email}
                </p>
              </div>
            </div>
            <Badge className={getStatusColor(application.status)}>
              {application.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Key Info */}
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Applied {new Date(application.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Account age: {accountAge} days</span>
            </div>
          </div>

          {/* Device Info */}
          {application.tester.deviceInfo ? (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Device Information
              </p>
              <div className="grid md:grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Model:</span>
                  <p className="font-medium">{application.tester.deviceInfo.deviceModel}</p>
                </div>
                <div>
                  <span className="text-gray-600">Android:</span>
                  <p className="font-medium">{application.tester.deviceInfo.androidVersion}</p>
                </div>
                <div>
                  <span className="text-gray-600">Screen:</span>
                  <p className="font-medium">
                    {application.tester.deviceInfo.screenSize || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                No device information provided
              </p>
            </div>
          )}

          {/* Verification Image */}
          {application.verificationImage && (
            <div className="bg-indigo-50 p-3 rounded-lg">
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-indigo-600" />
                Verification Screenshot
              </p>
              <div 
                onClick={() => setImageDialogOpen(true)}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              >
                <img 
                  src={application.verificationImage} 
                  alt="Verification" 
                  className="max-w-full h-auto rounded border border-indigo-200"
                />
              </div>
              <p className="text-xs text-indigo-700 mt-2">
                Click to view full size
              </p>
            </div>
          )}

          {/* Testing Period Info */}
          {application.testingStartDate && application.testingEndDate && (
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-sm font-semibold mb-2">Testing Period</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Started: {new Date(application.testingStartDate).toLocaleDateString()}
                </span>
                <span className="text-gray-600">
                  Ends: {new Date(application.testingEndDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {application.status === 'PENDING' && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => onApprove?.(application.id)}
                disabled={loading}
                className="flex-1"
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => onReject?.(application.id)}
                disabled={loading}
                variant="destructive"
                className="flex-1"
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {application.status === 'APPROVED' && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                ✅ Approved - Waiting for tester to opt-in to Google Play test
              </p>
            </div>
          )}

          {application.status === 'OPTED_IN' && (
            <div className="space-y-2">
              {application.verificationImage ? (
                <>
                  <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
                    <p className="text-sm text-indigo-800">
                      📸 Tester has submitted verification screenshot. Review it above and verify to start testing.
                    </p>
                  </div>
                  <Button
                    onClick={() => onVerify?.(application.id)}
                    disabled={loading}
                    size="sm"
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify & Start Testing Period
                  </Button>
                </>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⏳ Waiting for tester to upload verification screenshot
                  </p>
                </div>
              )}
            </div>
          )}

          {application.status === 'TESTING' && (
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
              <p className="text-sm text-purple-800 font-medium">
                🎯 Testing in progress
              </p>
              <p className="text-xs text-purple-700 mt-1">
                Will automatically complete on {new Date(application.testingEndDate!).toLocaleDateString()}
              </p>
            </div>
          )}

          {application.status === 'COMPLETED' && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                🎉 Testing completed successfully
              </p>
            </div>
          )}

          {application.status === 'REJECTED' && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <p className="text-sm text-red-800">
                ❌ Application was rejected
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Verification Screenshot</DialogTitle>
          </DialogHeader>
          {application.verificationImage && (
            <img 
              src={application.verificationImage} 
              alt="Verification" 
              className="w-full h-auto rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}