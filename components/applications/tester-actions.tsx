'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useFollowTester } from '@/hooks/use-follow-tester'
import { useVerifyTester } from '@/hooks/use-verify-tester'
import { useState } from 'react'
import { Bookmark, CheckCircle, AlertCircle } from 'lucide-react'

interface TesterActionsProps {
  testerId: string
  testerName?: string | null
}

export function TesterActions({ testerId, testerName }: TesterActionsProps) {
  const follow = useFollowTester(testerId)
  const verify = useVerifyTester(testerId)
  const [verifyNote, setVerifyNote] = useState('')
  const [showVerifyForm, setShowVerifyForm] = useState(false)

  useEffect(() => {
    follow.checkFollowStatus()
    verify.checkVerificationStatus()
  }, [testerId])

  const handleVerifyClick = () => {
    if (verify.isVerified) {
      verify.toggleVerification()
    } else {
      setShowVerifyForm(true)
    }
  }

  const handleConfirmVerify = () => {
    verify.toggleVerification(verifyNote)
    setShowVerifyForm(false)
    setVerifyNote('')
  }

  return (
    <div className="space-y-4">
      {/* Follow/Bookmark Button */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-blue-900">Bookmark Tester</h4>
            <p className="text-sm text-blue-700 mt-1">
              Save {testerName || 'this tester'} to your list for quick access on future projects
            </p>
          </div>
          <Button
            onClick={follow.toggleFollow}
            disabled={follow.loading}
            variant={follow.isFollowing ? 'default' : 'outline'}
            className="flex gap-2 shrink-0"
          >
            <Bookmark className="w-4 h-4" />
            {follow.isFollowing ? 'Bookmarked' : 'Bookmark'}
          </Button>
        </div>
      </Card>

      {/* Verify Button */}
      <Card className={`p-4 border-2 ${verify.isVerified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-start justify-between">
          <div>
            <h4 className={`font-semibold ${verify.isVerified ? 'text-green-900' : 'text-amber-900'}`}>
              ✓ Verify This Tester
            </h4>
            <p className={`text-sm ${verify.isVerified ? 'text-green-700' : 'text-amber-700'} mt-1`}>
              {verify.isVerified
                ? `You've marked ${testerName || 'this tester'} as verified. ${verify.verificationNote ? `Note: "${verify.verificationNote}"` : ''}`
                : `Mark ${testerName || 'this tester'} as verified for priority consideration in future projects`}
            </p>

            {showVerifyForm && !verify.isVerified && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="Why are you verifying this tester? (e.g., 'Excellent UI feedback', 'Found critical bugs', 'Fast responder')"
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                  className="text-sm"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleConfirmVerify}
                    disabled={verify.loading}
                    size="sm"
                  >
                    Confirm Verification
                  </Button>
                  <Button
                    onClick={() => {
                      setShowVerifyForm(false)
                      setVerifyNote('')
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
          {!showVerifyForm && (
            <Button
              onClick={handleVerifyClick}
              disabled={verify.loading}
              variant={verify.isVerified ? 'default' : 'outline'}
              className="flex gap-2 shrink-0"
            >
              {verify.isVerified ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Verified
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Verify
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
