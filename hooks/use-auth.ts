'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  IDLE_SESSION_TIMEOUT_MS,
  IDLE_SESSION_WARNING_MS,
} from '@/lib/session-constants'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  emailVerified: boolean
  createdAt: string
  stripeAccountId: string | null
  muteDeveloperReplies?: boolean
}

const HEARTBEAT_INTERVAL_MS = 30 * 1000

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInactivityWarning, setShowInactivityWarning] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.round(IDLE_SESSION_WARNING_MS / 1000)
  )
  const [connectionIssue, setConnectionIssue] = useState(false)
  const router = useRouter()

  const warningTimerRef = useRef<number | null>(null)
  const logoutTimerRef = useRef<number | null>(null)
  const lastHeartbeatAtRef = useRef(0)

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }

    if (logoutTimerRef.current) {
      window.clearInterval(logoutTimerRef.current)
      logoutTimerRef.current = null
    }

    setShowInactivityWarning(false)
    setSecondsRemaining(Math.round(IDLE_SESSION_WARNING_MS / 1000))
  }, [])

  const logout = useCallback(
    async (reason: 'manual' | 'inactivity' = 'manual') => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
      } catch (error) {
        console.error('Logout failed:', error)
      }

      setUser(null)
      if (reason === 'inactivity') {
        router.replace('/login?reason=inactivity')
      } else {
        router.push('/login')
      }
    },
    [router]
  )

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setConnectionIssue(false)
      } else if (response.status === 401) {
        // Server confirmed user is not authenticated.
        setUser(null)
        setConnectionIssue(false)
      } else if (response.status === 503) {
        // Database or infra error; do not change user state, let next poll retry.
        console.error('Session API returned 503 (infra issue); will retry')
        setConnectionIssue(true)
      } else {
        // Other 4xx/5xx: treat as transient, do not force logout.
        console.error('Session API returned', response.status, 'will retry')
        setConnectionIssue(true)
      }
    } catch (error) {
      console.error('Failed to fetch user (network):', error)
      setConnectionIssue(true)
      // Network error is transient; do not force logout.
    } finally {
      setLoading(false)
    }
  }, [])

  const sendHeartbeat = useCallback(async () => {
    if (!user) return

    const now = Date.now()
    if (now - lastHeartbeatAtRef.current < HEARTBEAT_INTERVAL_MS) {
      return
    }

    lastHeartbeatAtRef.current = now

    try {
      const response = await fetch('/api/auth/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      })

      // Only treat a 401 as an explicit unauthenticated / idle signal.
      // Treat 5xx/503 (infra)/network issues as transient and retry later.
      if (response.status === 401) {
        setUser(null)
        setConnectionIssue(false)
        router.replace('/login?reason=inactivity')
      } else if (response.ok) {
        setConnectionIssue(false)
      } else if (response.status === 503) {
        console.error('Heartbeat returned 503 (infra issue); will retry')
        setConnectionIssue(true)
        // Database error; do not log the user out.
      } else {
        console.error('Heartbeat returned non-OK status', response.status, '; will retry')
        setConnectionIssue(true)
        // Other errors treated as transient; next heartbeat will retry.
      }
    } catch (error) {
      console.error('Heartbeat failed (network):', error)
      setConnectionIssue(true)
      // Network or fetch failure: transient, do not log the user out here.
    }
  }, [router, user])

  const startIdleTimer = useCallback(() => {
    if (!user) {
      return
    }

    clearTimers()

    warningTimerRef.current = window.setTimeout(() => {
      setShowInactivityWarning(true)
      setSecondsRemaining(Math.round(IDLE_SESSION_WARNING_MS / 1000))

      logoutTimerRef.current = window.setInterval(() => {
        setSecondsRemaining((current) => {
          if (current <= 1) {
            if (logoutTimerRef.current) {
              window.clearInterval(logoutTimerRef.current)
            }
            logoutTimerRef.current = null
            void logout('inactivity')
            return 0
          }

          return current - 1
        })
      }, 1000)
    }, IDLE_SESSION_TIMEOUT_MS)
  }, [clearTimers, logout, user])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (!user) {
      clearTimers()
      return
    }

    const handleActivity = () => {
      void sendHeartbeat()
      startIdleTimer()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleActivity()
      }
    }

    void sendHeartbeat()
    startIdleTimer()

    window.addEventListener('click', handleActivity, { passive: true })
    window.addEventListener('keydown', handleActivity, { passive: true })
    window.addEventListener('mousemove', handleActivity, { passive: true })
    window.addEventListener('scroll', handleActivity, { passive: true })
    window.addEventListener('touchstart', handleActivity, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimers()
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('scroll', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [clearTimers, logout, sendHeartbeat, startIdleTimer, user])

  const extendSession = () => {
    setShowInactivityWarning(false)

    if (logoutTimerRef.current) {
      clearInterval(logoutTimerRef.current)
      logoutTimerRef.current = null
    }

    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }

    void sendHeartbeat()
    startIdleTimer()
  }

  return {
    user,
    loading,
    logout,
    showInactivityWarning,
    secondsRemaining,
    extendSession,
    connectionIssue,
    isAuthenticated: !!user,
    isDeveloper: user?.role === 'DEVELOPER',
    isTester: user?.role === 'TESTER',
    isAdmin: user?.role === 'ADMIN',
  }
}
