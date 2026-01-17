'use client'

import { useState } from 'react'
import { UploadButton } from '@uploadthing/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, CheckCircle, X, Image as ImageIcon } from 'lucide-react'
import type { OurFileRouter } from '@/app/api/uploadthing/core'

interface VerificationUploaderProps {
  applicationId: string
  onUploadComplete?: () => void
}

export function VerificationUploader({ 
  applicationId, 
  onUploadComplete 
}: VerificationUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleUploadComplete = (res: any) => {
    if (res && res[0]) {
      setUploadedUrl(res[0].url)
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!uploadedUrl) return

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/applications/${applicationId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationImageUrl: uploadedUrl }),
      })

      const data = await response.json()

      if (response.ok) {
        alert('Verification screenshot uploaded successfully! Developer will review it shortly.')
        onUploadComplete?.()
      } else {
        setError(data.error || 'Failed to upload verification')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="text-center">
          <div className="bg-indigo-50 rounded-lg p-6 mb-4">
            <ImageIcon className="h-12 w-12 text-indigo-600 mx-auto mb-3" />
            <h3 className="font-semibold text-indigo-900 mb-2">
              Upload Verification Screenshot
            </h3>
            <p className="text-sm text-indigo-700">
              Take a screenshot showing that you've opted-in to the Google Play closed test. 
              Make sure your email or confirmation is visible.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {!uploadedUrl ? (
            <UploadButton<OurFileRouter, "verificationImage">
              endpoint="verificationImage"
              onClientUploadComplete={handleUploadComplete}
              onUploadError={(error: Error) => {
                setError(error.message)
                setUploading(false)
              }}
              onUploadBegin={() => setUploading(true)}
              appearance={{
                button: 
                  "bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium",
                allowedContent: "text-sm text-gray-600 mt-2",
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img 
                  src={uploadedUrl} 
                  alt="Verification screenshot" 
                  className="max-w-full h-auto rounded-lg border-2 border-green-200"
                />
                <button
                  onClick={() => setUploadedUrl(null)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <Button 
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? (
                  <>Processing...</>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Verification
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs text-gray-700 font-medium mb-2">Tips for a good screenshot:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Make sure the Google Play opt-in confirmation is visible</li>
            <li>• Include your email or account name in the screenshot</li>
            <li>• Ensure the screenshot is clear and readable</li>
            <li>• Don't edit or crop important information</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}