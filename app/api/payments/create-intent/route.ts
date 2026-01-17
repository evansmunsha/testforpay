import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createJobPaymentIntent } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    if (currentUser.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Only developers can create payments' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { amount, jobId } = body

    if (!amount || !jobId) {
      return NextResponse.json(
        { error: 'Amount and jobId are required' },
        { status: 400 }
      )
    }

    // Create payment intent
    const paymentIntent = await createJobPaymentIntent(
      amount,
      jobId,
      currentUser.userId
    )

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error('Create payment intent error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}