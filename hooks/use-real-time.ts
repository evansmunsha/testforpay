// hooks/use-real-time.ts
'use client'

import { Application } from '@/types/application'
import { Job } from '@/types/job'
import { useEffect, useState, useCallback, useRef } from 'react'

interface UseRealTimeOptions {
  interval?: number
  enabled?: boolean
  onError?: (error: Error) => void
}

export function useRealTime<T>(
  fetchFn: () => Promise<T>,
  options: UseRealTimeOptions & { initialData: T }
) {
  const { interval = 5000, enabled = true, onError, initialData } = options
  const [data, setData] = useState<T>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

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

  useEffect(() => {
    executeRefresh()
  }, [executeRefresh])

  useEffect(() => {
    if (!enabled) return

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(executeRefresh, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [executeRefresh, enabled, interval])

  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

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

export function useRealtimeNotifications(interval: number = 3000) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const lastCountRef = useRef(0)

  const fetchNotifications = useCallback(async () => {
    const response = await fetch('/api/notifications?unreadOnly=true')
    if (!response.ok) return

    const data = await response.json()
    const list = Array.isArray(data.notifications) ? data.notifications : []
    const count = list.length

    const prev = lastCountRef.current
    if (count !== prev) {
      lastCountRef.current = count
      setUnreadCount(count)
      setNotifications(list)

      if (count > prev) {
        const latest = list[0]
        if (latest && Notification.permission === 'granted') {
          new Notification(latest.title, {
            body: latest.body,
            icon: '/icon-192x192.png',
          })
        }
      }
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, interval)
    return () => clearInterval(id)
  }, [fetchNotifications, interval])

  return { unreadCount, notifications, refresh: fetchNotifications }
}

/**
 * Hook for real-time job updates
 * ✅ FIXED: Properly handles API response format
 */
export function useRealtimeJobs(developerId?: string, interval: number = 5000) {
  const fetchJobs = useCallback(async () => {
    const url = developerId
      ? `/api/jobs?developerId=${developerId}`
      : '/api/jobs?status=ACTIVE'

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch jobs: ${response.status}`)
    }
    
    const data = await response.json()
    
    // ✅ Your API returns { jobs: [...] }
    if (data.jobs && Array.isArray(data.jobs)) {
      return data.jobs
    }
    
    // Fallback: if API returns array directly
    if (Array.isArray(data)) {
      return data
    }

    console.error('Unexpected API response format:', data)
    return []
  }, [developerId])

  return useRealTime<Job[]>(fetchJobs, {
    interval,
    initialData: [],
  })
}

/**
 * Hook for real-time application updates
 * ✅ FIXED: Properly handles API response format
 */
export function useRealtimeApplications(jobId?: string, interval: number = 4000) {
  const fetchApplications = useCallback(async () => {
    const url = jobId ? `/api/jobs/${jobId}/applications` : '/api/applications'
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch applications: ${response.status}`)
    }
    
    const data = await response.json()

    // Handle { applications: [...] } format
    if (data.applications && Array.isArray(data.applications)) {
      return data.applications
    }
    
    // Fallback: if API returns array directly
    if (Array.isArray(data)) {
      return data
    }

    console.error('Unexpected API response format:', data)
    return []
  }, [jobId])

  return useRealTime<Application[]>(fetchApplications, {
    interval,
    initialData: [],
  })
}

export function useRealtimePayments(interval: number = 6000) {
  const fetchPayments = useCallback(async () => {
    const response = await fetch('/api/user/transactions')
    if (!response.ok) throw new Error('Failed to fetch payments')
    const data = await response.json()
    return data.transactions || []
  }, [])

  return useRealTime(fetchPayments, {
    interval,
    initialData: [],
  })
}

export function useRealtimeStats(interval: number = 8000) {
  const fetchStats = useCallback(async () => {
    const response = await fetch('/api/admin/stats')
    if (!response.ok) throw new Error('Failed to fetch stats')
    const data = await response.json()
    return data.stats || {}
  }, [])

  return useRealTime(fetchStats, {
    interval,
    initialData: {},
  })
}