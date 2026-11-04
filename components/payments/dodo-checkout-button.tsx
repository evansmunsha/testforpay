'use client'

import { useEffect, useState } from 'react'
import { Loader2, Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatEurFromCents } from '@/lib/currency'
import type { Cents } from '@/types/money'

interface DodoCheckoutButtonProps {
  jobId: string
  amountEurCents: Cents
  /** Called when the payment is confirmed and the job is live. */
  onPaid?: () => void
}

export function DodoCheckoutButton({ jobId, amountEurCents, onPaid }: DodoCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  // After paying, Dodo sends the developer back here. Wait until our server has the payment confirmation.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    if (query.get('payment') !== 'returned') return
    const returnedStatus = (query.get('status') || '').toLowerCase()
    if (['failed', 'cancelled', 'canceled'].includes(returnedStatus)) {
      setError('The payment did not go through, and you were not charged. Click "Pay now" to try again.')
      return
    }
    setConfirming(true)
    let attempts = 0
    const timer = setInterval(async () => {
      attempts += 1
      try {
        const response = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' })
        const data = await response.json()
        if (data?.job?.status && data.job.status !== 'DRAFT') {
          clearInterval(timer)
          setConfirming(false)
          onPaid?.()
          return
        }
      } catch {
        // Try again on the next round.
      }
      if (attempts >= 20) {
        clearInterval(timer)
        setConfirming(false)
        setError('We did not receive a payment. If you did not pay, click "Pay now" to try again. If you paid, wait a few minutes and refresh, or contact us.')
      }
    }, 3000)
    return () => clearInterval(timer)
  }, [jobId, onPaid])

  const startPayment = async () => {
    setLoading(true)
    setError('')
    setConfirming(false)
    try {
      const response = await fetch('/api/payments/dodo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      const data = await response.json()
      if (response.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      setError(data.error || 'The payment page could not open. Check your internet and click "Pay now" again.')
    } catch {
      setError('The payment page could not open. Check your internet and click "Pay now" again.')
    }
    setLoading(false)
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div className="text-center">
          <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Total to pay</p>
          <p className="text-3xl font-bold text-gray-900">{formatEurFromCents(amountEurCents)}</p>
        </div>

        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span>You pay on a safe page. Your card details never come to our site.</span>
          </li>
          <li className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
            <span>After you pay, your job goes live and testers can apply.</span>
          </li>
        </ul>

        {confirming && (
          <p className="flex items-center justify-center gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
            <Loader2 className="h-4 w-4 animate-spin" />
            We are checking your payment. This takes less than a minute. Please wait here.
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button onClick={startPayment} disabled={loading} className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
          Pay {formatEurFromCents(amountEurCents)} now
        </Button>
      </CardContent>
    </Card>
  )
}
