'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  PaymentElement,
  Elements,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Lock, ShieldCheck, CreditCard, ArrowRight } from 'lucide-react'
import { formatEurFromCents } from '@/lib/currency'
import type { Cents } from '@/types/money'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Card brand icons
const VisaIcon = () => (
  <svg viewBox="0 0 48 32" className="h-5 w-auto opacity-70">
    <rect width="48" height="32" rx="4" fill="#1A1F71" />
    <path d="M19.5 21.5L21.5 10.5H24.5L22.5 21.5H19.5Z" fill="#F7B600" />
    <path d="M32 10.5C31 10.2 29.5 10 27.8 10C24 10 21.3 12 21.3 14.8C21.3 16.8 23.2 17.9 24.6 18.5C26.1 19.1 26.6 19.5 26.6 20.1C26.6 21 25.5 21.4 24.5 21.4C22.8 21.4 21.8 21.1 20.8 20.7L20.3 20.5L19.8 23.3C20.9 23.7 22.6 24 24.4 24C28.4 24 31 22 31 19C31 17.3 29.8 16.1 27.6 15.2C26.3 14.7 25.5 14.3 25.5 13.6C25.5 13 26.1 12.5 27.3 12.5C28.6 12.5 29.5 12.8 30.2 13.1L30.6 13.3L32 10.5Z" fill="#F7B600" />
    <path d="M36.5 10.5H33.8C33.1 10.5 32.5 10.7 32.2 11.4L27.5 21.5H30.8L31.4 19.8H35.3L35.7 21.5H38.5L36.5 10.5ZM32.3 17.5L33.8 13.5L34.6 17.5H32.3Z" fill="#F7B600" />
    <path d="M15.5 10.5L12.5 18.3L12.2 16.8C11.5 14.5 9.5 12.1 7.3 11L10.3 21.5H13.6L18.3 10.5H15.5Z" fill="#F7B600" />
    <path d="M9.5 10.5H4.8L4.7 10.7C8.3 11.5 10.8 13.8 11.7 16.3L11 11.4C10.8 10.8 10.3 10.5 9.5 10.5Z" fill="#F7B600" />
  </svg>
)

const MastercardIcon = () => (
  <svg viewBox="0 0 48 32" className="h-5 w-auto opacity-70">
    <rect width="48" height="32" rx="4" fill="#F5F5F5" />
    <circle cx="19" cy="16" r="10" fill="#EB001B" />
    <circle cx="29" cy="16" r="10" fill="#F79E1B" />
    <path d="M24 8.8C26.3 10.6 27.8 13.1 27.8 16C27.8 18.9 26.3 21.4 24 23.2C21.7 21.4 20.2 18.9 20.2 16C20.2 13.1 21.7 10.6 24 8.8Z" fill="#FF5F00" />
  </svg>
)

const AmexIcon = () => (
  <svg viewBox="0 0 48 32" className="h-5 w-auto opacity-70">
    <rect width="48" height="32" rx="4" fill="#016FD0" />
    <text x="24" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">AMEX</text>
  </svg>
)

interface CheckoutFormProps {
  jobId: string
  amountEurCents: Cents
  onSuccess?: () => void
}

function CheckoutFormContent({ jobId, amountEurCents, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError('')

    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setError(submitError.message || 'Payment failed')
        setLoading(false)
        return
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/jobs/${jobId}?payment=success`,
        },
      })

      if (confirmError) {
        setError(confirmError.message || 'Payment failed')
        setLoading(false)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Stripe Payment Element */}
      <div className="rounded-lg border border-gray-200 p-4 bg-white">
        <PaymentElement />
      </div>

      {/* Pay Button */}
      <Button 
        type="submit" 
        disabled={!stripe || loading} 
        className="w-full h-12 text-base font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-all"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Pay {formatEurFromCents(amountEurCents)}
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      {/* Trust footer */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Payments encrypted & secured by Stripe</span>
      </div>
    </form>
  )
}

export function CheckoutForm({ jobId, amountEurCents, onSuccess }: CheckoutFormProps) {
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    createPaymentIntent()
  }, [])

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountEurCents, jobId }),
      })

      const data = await response.json()

      if (response.ok) {
        setClientSecret(data.clientSecret)
      } else {
        console.error('Failed to create payment intent:', data.error)
      }
    } catch (error) {
      console.error('Error creating payment intent:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!clientSecret) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="text-center py-12 text-red-600 text-sm">
            Failed to initialize payment. Please refresh and try again.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-semibold text-gray-700">Secure Checkout</h3>
          </div>
          <Badge variant="secondary" className="text-xs font-normal bg-white">
            SSL Encrypted
          </Badge>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Price */}
        <div className="text-center pb-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Total to pay today
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {formatEurFromCents(amountEurCents)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Charged in EUR</p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* What's included */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            What&apos;s included
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2.5 text-sm text-gray-700">
              <ShieldCheck className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Funds held in escrow until your 14-day testing completes</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-gray-700">
              <CreditCard className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <span>Instant access to tester dashboard after payment</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-gray-700">
              <Lock className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
              <span>Approval guarantee — full refund if Google rejects due to testers</span>
            </li>
          </ul>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Card brands */}
        <div className="flex items-center justify-center gap-2">
          <VisaIcon />
          <MastercardIcon />
          <AmexIcon />
        </div>

        {/* Stripe Form */}
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#111827',
                colorBackground: '#ffffff',
                colorText: '#111827',
                colorDanger: '#dc2626',
                borderRadius: '8px',
                spacingUnit: '4px',
              },
            },
          }}
        >
          <CheckoutFormContent 
            jobId={jobId} 
            amountEurCents={amountEurCents} 
            onSuccess={onSuccess} 
          />
        </Elements>
      </CardContent>
    </Card>
  )
}