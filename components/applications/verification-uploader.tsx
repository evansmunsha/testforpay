'use client'

import { useState } from 'react'
import { UploadButton } from '@uploadthing/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, CheckCircle, X, Image as ImageIcon, RefreshCw } from 'lucide-react'
import type { OurFileRouter } from '@/app/api/uploadthing/core'

interface VerificationUploaderProps {
  applicationId: string
  onUploadComplete?: () => void
}

export function VerificationUploader({ 
  applicationId, 
  onUploadComplete 
}: VerificationUploaderProps) {
  const [uploading, setUploading] = useState<number | null>(null) // 1 or 2 for which image
  const [uploadedUrls, setUploadedUrls] = useState<[string | null, string | null]>([null, null])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleUploadComplete = (res: any, imageNumber: 1 | 2) => {
    if (res && res[0]) {
      setUploadedUrls(prev => {
        const newUrls: [string | null, string | null] = [...prev] as [string | null, string | null]
        newUrls[imageNumber - 1] = res[0].url
        return newUrls
      })
      setUploading(null)
    }
  }

  const handleSubmit = async () => {
    if (!uploadedUrls[0] || !uploadedUrls[1]) return

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/applications/${applicationId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          verificationImageUrl: uploadedUrls[0],
          verificationImageUrl2: uploadedUrls[1]
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
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

  const removeImage = (imageNumber: 1 | 2) => {
    setUploadedUrls(prev => {
      const newUrls: [string | null, string | null] = [...prev] as [string | null, string | null]
      newUrls[imageNumber - 1] = null
      return newUrls
    })
  }

  return (
    <Card className="h-screen flex flex-col max-h-screen">
      <CardContent className="pt-6 flex flex-col h-full overflow-hidden">
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto pr-4">
          <div className="text-center pb-4">
            <div className="bg-indigo-50 rounded-lg p-6 mb-4">
              <ImageIcon className="h-12 w-12 text-indigo-600 mx-auto mb-3" />
              <h3 className="font-semibold text-indigo-900 mb-2">
                Upload Verification Screenshots
              </h3>
              <p className="text-sm text-indigo-700">
                Upload two screenshots proving you can access the app on Google Play.
              </p>
            </div>

            {/* Step-by-step guide */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm font-semibold text-blue-900 mb-3">What to screenshot (upload 2):</p>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>Play Store page</strong> showing the app with Install button</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>Home screen</strong> showing the app installed on your phone</span>
                </li>
              </ul>
              <p className="text-xs text-blue-600 mt-3">
                Upload both screenshots to verify access to the closed test.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
                <p className="text-red-600 font-medium mb-2">{error}</p>
                <p className="text-sm text-red-500 mb-3">Please refresh the page and try again.</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                  <CheckCircle className="h-5 w-5" />
                  Screenshots uploaded successfully!
                </div>
                <p className="text-sm text-green-600">The developer will review your verification shortly.</p>
              </div>
            )}

            {/* Image 1 Upload/Display */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Screenshot 1</h4>
              {!uploadedUrls[0] ? (
                <UploadButton<OurFileRouter, "verificationImage">
                  endpoint="verificationImage"
                  onClientUploadComplete={(res) => handleUploadComplete(res, 1)}
                  onUploadError={(error: Error) => {
                    setError(error.message)
                    setUploading(null)
                  }}
                  onUploadBegin={() => setUploading(1)}
                  appearance={{
                    button: 
                      "bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium",
                    allowedContent: "text-sm text-gray-600 mt-2",
                  }}
                />
              ) : (
                <div className="relative inline-block w-full max-w-sm">
                  <img 
                    src={uploadedUrls[0]} 
                    alt="Verification screenshot 1" 
                    className="max-w-full h-auto rounded-lg border-2 border-green-200"
                  />
                  <button
                    onClick={() => removeImage(1)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Image 2 Upload/Display */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Screenshot 2</h4>
              {!uploadedUrls[1] ? (
                <UploadButton<OurFileRouter, "verificationImage">
                  endpoint="verificationImage"
                  onClientUploadComplete={(res) => handleUploadComplete(res, 2)}
                  onUploadError={(error: Error) => {
                    setError(error.message)
                    setUploading(null)
                  }}
                  onUploadBegin={() => setUploading(2)}
                  appearance={{
                    button: 
                      "bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium",
                    allowedContent: "text-sm text-gray-600 mt-2",
                  }}
                />
              ) : (
                <div className="relative inline-block w-full max-w-sm">
                  <img 
                    src={uploadedUrls[1]} 
                    alt="Verification screenshot 2" 
                    className="max-w-full h-auto rounded-lg border-2 border-green-200"
                  />
                  <button
                    onClick={() => removeImage(2)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-700 font-medium mb-2">Good screenshot examples:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Play Store page with the app name and Install button visible</li>
                <li>• Your phone home screen showing the app icon</li>
                <li>• The app's info page showing it's installed</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Fixed submit button at bottom - always visible */}
        {uploadedUrls[0] && uploadedUrls[1] && (
          <div className="mt-4 pt-4 border-t border-gray-200 shrink-0">
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
        {(!uploadedUrls[0] || !uploadedUrls[1]) && (
          <div className="mt-4 pt-4 border-t border-gray-200 shrink-0">
            <p className="text-center text-sm text-gray-500">
              Upload both screenshots to submit
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}