'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface UseRealTimeOptions {
  interval?: number // milliseconds between refreshes (default: 5000ms = 5s)
  enabled?: boolean // whether to enable polling (default: true)
  onError?: (error: Error) => void
}

/**
 * Custom hook for real-time data polling
 * Automatically refreshes data at specified intervals
 * Useful for: notifications, job updates, application status, payments
 */
export function useRealTime<T>(
  fetchFn: () => Promise<T>,
  options: UseRealTimeOptions = {}
) {
  const { interval = 5000, enabled = true, onError } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  // Execute fetch
  const executeRefresh = useCallback(async () => {
    if (!enabled) return

    try {
      setLoading(true)
      const result = await fetchFn()
      if (mountedRef.current) {
        setData(result)
        setError(null)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      if (mountedRef.current) {
        setError(error)
        onError?.(error)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [fetchFn, enabled, onError])

  // Initial fetch on mount
  useEffect(() => {
    executeRefresh()
  }, [executeRefresh])

  // Set up polling interval
  useEffect(() => {
    if (!enabled) return

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Set up new interval
    intervalRef.current = setInterval(executeRefresh, interval)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [executeRefresh, enabled, interval])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Manual refresh trigger
  const refresh = useCallback(() => {
    executeRefresh()
  }, [executeRefresh])

  return {
    data,
    loading,
    error,
    refresh,
  }
}

/**
 * Hook for real-time notifications
 * Polls notifications endpoint and triggers callbacks
 */
export function useRealtimeNotifications(interval: number = 3000) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const lastCountRef = useRef(0)

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?unreadOnly=true')
      if (response.ok) {
        const data = await response.json()
        const count = data.notifications?.length || 0
        
        // Only update state if count changed (avoid unnecessary re-renders)
        if (count !== lastCountRef.current) {
          lastCountRef.current = count
          setUnreadCount(count)
          setNotifications(data.notifications || [])
          
          // Trigger browser notification for new notifications
          if (count > lastCountRef.current) {
            const latest = data.notifications?.[0]
            if (latest && Notification.permission === 'granted') {
              new Notification(latest.title, {
                body: latest.body,
                icon: '/icon-192x192.png',
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }, [])

  const { refresh } = useRealTime(fetchNotifications, {
    interval,
    enabled: true,
  })

  return {
    unreadCount,
    notifications,
    refresh,
  }
}

/**
 * Hook for real-time job updates
 * Perfect for browse/jobs pages
 */
export function useRealtimeJobs(developerId?: string, interval: number = 5000) {
  const fetchJobs = useCallback(async () => {
    const url = developerId ? `/api/jobs?developerId=${developerId}` : '/api/jobs?status=ACTIVE'
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch jobs')
    const data = await response.json()
    return data.jobs
  }, [developerId])

  return useRealTime(fetchJobs, { interval })
}

/**
 * Hook for real-time application updates
 * Perfect for applications/jobs pages
 */
export function useRealtimeApplications(jobId?: string, interval: number = 4000) {
  const fetchApplications = useCallback(async () => {
    const url = jobId ? `/api/jobs/${jobId}/applications` : '/api/applications'
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch applications')
    const data = await response.json()
    return data.applications
  }, [jobId])

  return useRealTime(fetchApplications, { interval })
}

/**
 * Hook for real-time payment updates
 * Perfect for payments page
 */
export function useRealtimePayments(interval: number = 6000) {
  const fetchPayments = useCallback(async () => {
    const response = await fetch('/api/user/transactions')
    if (!response.ok) throw new Error('Failed to fetch payments')
    const data = await response.json()
    return data.transactions
  }, [])

  return useRealTime(fetchPayments, { interval })
}

/**
 * Hook for real-time stats
 * Perfect for admin/dashboard
 */
export function useRealtimeStats(interval: number = 8000) {
  const fetchStats = useCallback(async () => {
    const response = await fetch('/api/admin/stats')
    if (!response.ok) throw new Error('Failed to fetch stats')
    const data = await response.json()
    return data.stats
  }, [])

  return useRealTime(fetchStats, { interval })
}
