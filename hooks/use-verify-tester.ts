'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/components/ui/toast-provider'

export function useVerifyTester(testerId: string) {
  const { toast } = useToast()
  const [isVerified, setIsVerified] = useState(false)
  const [verificationNote, setVerificationNote] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const checkVerificationStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/testers/${testerId}/verify`)
      const data = await res.json()
      setIsVerified(data.isVerified)
      setVerificationNote(data.note)
    } catch (error) {
      console.error('Failed to check verification status:', error)
    }
  }, [testerId])

  const toggleVerification = useCallback(
    async (note?: string) => {
      setLoading(true)
      try {
        const method = isVerified ? 'DELETE' : 'POST'
        const body = note ? JSON.stringify({ note }) : undefined

        const res = await fetch(`/api/testers/${testerId}/verify`, {
          method,
          headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
          body,
        })
        const data = await res.json()

        if (res.ok) {
          setIsVerified(!isVerified)
          if (note) setVerificationNote(note)
          toast({
            title: 'Success',
            description: isVerified ? 'Verification removed' : 'Tester verified',
            variant: 'success',
          })
        } else {
          toast({
            title: 'Error',
            description: data.error || 'Failed to update verification',
            variant: 'destructive',
          })
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Something went wrong',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [testerId, isVerified, toast]
  )

  return {
    isVerified,
    verificationNote,
    loading,
    toggleVerification,
    checkVerificationStatus,
  }
}
