'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/components/ui/toast-provider'

export function useFollowTester(testerId: string) {
  const { toast } = useToast()
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  const checkFollowStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/testers/${testerId}/follow`)
      const data = await res.json()
      setIsFollowing(data.isFollowing)
    } catch (error) {
      console.error('Failed to check follow status:', error)
    }
  }, [testerId])

  const toggleFollow = useCallback(async () => {
    setLoading(true)
    try {
      const method = isFollowing ? 'DELETE' : 'POST'
      const res = await fetch(`/api/testers/${testerId}/follow`, { method })
      const data = await res.json()

      if (res.ok) {
        setIsFollowing(!isFollowing)
        toast({
          title: 'Success',
          description: isFollowing ? 'Bookmark removed' : 'Tester bookmarked',
          variant: 'success',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update bookmark',
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
  }, [testerId, isFollowing, toast])

  return {
    isFollowing,
    loading,
    toggleFollow,
    checkFollowStatus,
  }
}
