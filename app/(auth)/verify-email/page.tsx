'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Mail, Loader2, RefreshCw } from 'lucide-react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const status = searchParams?.get('status')       // 'success' | 'error' | null (waiting)
  const email = searchParams?.get('email') || ''
  const sent = searchParams?.get('sent')           // '1' if verification email was sent on signup

  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [resendError, setResendError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Countdown timer after resend
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleResend = async () => {
    setResending(true)
    setResendMessage('')
    setResendError('')
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setResendMessage('Verification email sent! Check your inbox (and spam folder).')
        setCooldown(60)
      } else {
        setResendError(data.error || 'Failed to resend. Please try again.')
      }
    } catch {
      setResendError('Something went wrong. Please try again.')
    } finally {
      setResending(false)
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-green-100 rounded-full p-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Email verified!</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Your account is now fully active. You can log in and start using TestForPay.
            </p>
          </div>
          <Link href="/login">
            <Button className="w-full">Go to Login</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-red-100 rounded-full p-4">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Link expired or invalid</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Verification links expire after 24 hours. Request a new one below.
            </p>
          </div>

          {resendMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg">
              {resendMessage}
            </div>
          )}
          {resendError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
              {resendError}
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="w-full"
            >
              {resending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
              ) : cooldown > 0 ? (
                <><RefreshCw className="h-4 w-4 mr-2" />Resend in {cooldown}s</>
              ) : (
                <><Mail className="h-4 w-4 mr-2" />Send new verification email</>
              )}
            </Button>
            <Link href="/login">
              <Button variant="outline" className="w-full">Back to Login</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Waiting state (just signed up, email sent) ────────────────────────────
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center pt-8">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 rounded-full p-4">
            <Mail className="h-10 w-10 text-blue-600" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
        <CardDescription className="text-sm mt-1">
          {sent === '1'
            ? `We sent a verification link to ${email || 'your email address'}.`
            : `Please verify your email address to activate your account.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8 space-y-5">

        {/* Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-sm text-blue-800">
          <p className="font-semibold">What to do next:</p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Open your email inbox</li>
            <li>Find the email from TestForPay with subject "Verify your email"</li>
            <li>Click the verification link inside</li>
            <li>Come back here and log in</li>
          </ol>
          <p className="text-xs text-blue-600 mt-2">
            Can't find it? Check your spam or junk folder.
          </p>
        </div>

        {/* Resend */}
        <div className="space-y-2">
          <p className="text-xs text-center text-gray-500">Didn't receive it?</p>
          {resendMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg">
              {resendMessage}
            </div>
          )}
          {resendError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
              {resendError}
            </div>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
          >
            {resending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
            ) : cooldown > 0 ? (
              <><RefreshCw className="h-4 w-4 mr-2" />Resend in {cooldown}s</>
            ) : (
              <><Mail className="h-4 w-4 mr-2" />Resend verification email</>
            )}
          </Button>
        </div>

        <div className="text-center">
          <Link href="/login" className="text-sm text-blue-600 hover:underline">
            Already verified? Log in →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Suspense fallback={
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          </CardContent>
        </Card>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}
