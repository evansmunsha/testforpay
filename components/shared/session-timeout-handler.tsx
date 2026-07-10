'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'

export function SessionTimeoutHandler() {
  const { extendSession, secondsRemaining, showInactivityWarning, isAuthenticated } = useAuth()

  if (!isAuthenticated || !showInactivityWarning) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <CardTitle className="text-lg">Session timeout warning</CardTitle>
            <CardDescription>
              You&apos;ll be logged out in {secondsRemaining} seconds because you were inactive for too long.
            </CardDescription>
          </div>

          <div className="flex justify-end">
            <Button onClick={extendSession}>Stay logged in</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
