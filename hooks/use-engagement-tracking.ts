'use client'

import { useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

interface UseEngagementTrackingOptions {
  applicationId: string
  autoLog?: boolean // Auto-log app launch on mount
}

export function useEngagementTracking({ applicationId, autoLog = true }: UseEngagementTrackingOptions) {
  const { toast } = useToast()

  const logEvent = useCallback(
    async (eventType: 'APP_LAUNCH' | 'FEATURE_USED' | 'FEEDBACK_SUBMITTED' | 'SESSION_END', options?: {
      featureName?: string
      sessionDuration?: number
      silent?: boolean
    }) => {
      try {
        const res = await fetch(`/api/applications/${applicationId}/usage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType,
            featureName: options?.featureName || null,
            sessionDuration: options?.sessionDuration || null,
          }),
        })

        if (!res.ok) {
          const error = await res.json()
          if (!options?.silent) {
            console.error('Failed to log engagement:', error)
          }
          return false
        }

        return true
      } catch (error) {
        if (!options?.silent) {
          console.error('Engagement tracking error:', error)
        }
        return false
      }
    },
    [applicationId]
  )

  const logAppLaunch = useCallback(() => {
    return logEvent('APP_LAUNCH', { silent: true })
  }, [logEvent])

  const logFeatureUsed = useCallback((featureName: string) => {
    return logEvent('FEATURE_USED', { featureName, silent: true })
  }, [logEvent])

  const logFeedbackSubmitted = useCallback(() => {
    return logEvent('FEEDBACK_SUBMITTED', { silent: true })
  }, [logEvent])

  const logSessionEnd = useCallback((durationSeconds: number) => {
    return logEvent('SESSION_END', { sessionDuration: durationSeconds, silent: true })
  }, [logEvent])

  return {
    logEvent,
    logAppLaunch,
    logFeatureUsed,
    logFeedbackSubmitted,
    logSessionEnd,
  }
}
