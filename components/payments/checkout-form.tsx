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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Lock } from 'lucide-react'
import { formatEurFromCents } from '@/lib/currency'
import type { Cents } from '@/types/money'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CheckoutFormProps {
  jobId: string
  /** Total job cost stored in integer EUR cents, charged to developers in EUR. */
  amountEurCents: Cents
  onSuccess?: () => void
}

function CheckoutFormContent({ jobId, amountEurCents }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      <PaymentElement />

      <Button 
        type="submit" 
        disabled={!stripe || loading} 
        className="w-full"
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
          </>
        )}
      </Button>

      <p className="text-xs text-center text-gray-500">
        Your payment is secured by Stripe. Funds will be held in escrow until testers complete the 14-day testing period.
      </p>
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
      <Card>
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
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-red-600">
            Failed to initialize payment. Please try again.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>
          Complete your EUR payment to publish the job
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800 mb-4">
          <p className="font-semibold">Developer payment</p>
          <p>
            Pay {formatEurFromCents(amountEurCents)} now. This will be charged in EUR.
          </p>
        </div>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
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
