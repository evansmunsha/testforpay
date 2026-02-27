'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

type VerifyState = 'idle' | 'loading' | 'success' | 'error'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') || ''
  const email = searchParams?.get('email') || ''
  const sent = searchParams?.get('sent') === '1'

  const [state, setState] = useState<VerifyState>(token ? 'loading' : 'idle')
  const [message, setMessage] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!token) return

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
        const data = await response.json()

        if (response.ok) {
          setState('success')
          setMessage(data.message || 'Email verified successfully.')
        } else {
          setState('error')
          setMessage(data.error || 'Verification failed.')
        }
      } catch {
        setState('error')
        setMessage('Verification failed. Please try again.')
      }
    }

    void verifyEmail()
  }, [token])

  const heading = useMemo(() => {
    if (state === 'success') return 'Email verified'
    if (state === 'error') return 'Verification failed'
    if (token) return 'Verifying email'
    return 'Check your email'
  }, [state, token])

  const description = useMemo(() => {
    if (state === 'success') {
      return 'Your account is now ready for job creation, applications, and payouts.'
    }
    if (state === 'error') {
      return 'The link may be expired or invalid. You can request a new one below.'
    }
    if (sent) {
      return `We sent a verification link to ${email || 'your email address'}.`
    }
    return 'Verify your email address to unlock the main product flows.'
  }, [email, sent, state])

  const handleResend = async () => {
    setResending(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(email ? { email } : {}),
      })
      const data = await response.json()

      if (response.ok) {
        setState('idle')
        setMessage(data.message || 'Verification email sent.')
      } else {
        setState('error')
        setMessage(data.error || 'Could not resend verification email.')
      }
    } catch {
      setState('error')
      setMessage('Could not resend verification email.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>{heading}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div
              className={`rounded-md p-3 text-sm ${
                state === 'success'
                  ? 'bg-green-50 text-green-700'
                  : state === 'error'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-blue-50 text-blue-700'
              }`}
            >
              {message}
            </div>
          )}
          {(!token || state === 'error') && (
            <Button onClick={handleResend} disabled={resending} className="w-full">
              {resending ? 'Sending...' : 'Resend verification email'}
            </Button>
          )}
          {token && state === 'loading' && (
            <div className="text-sm text-gray-600">Please wait while we verify your email.</div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full">
              Back to login
            </Button>
          </Link>
          <Link href="/dashboard" className="w-full">
            <Button variant="ghost" className="w-full">
              Go to dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle>Loading</CardTitle>
              <CardDescription>Preparing verification page.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
