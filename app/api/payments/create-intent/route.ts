import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createJobPaymentIntent, stripe } from '@/lib/stripe'
import prisma from '@/lib/prisma'

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

    // SECURITY: Require verified email for payment initiation.
    const developer = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { emailVerified: true },
    })

    if (!developer?.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email to make payments' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { jobId } = body

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      )
    }

    // SECURITY: Always compute the amount server-side to prevent underpayment.
    const job = await prisma.testingJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        developerId: true,
        status: true,
        totalBudget: true,
        platformFee: true,
        stripePaymentIntent: true,
      },
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    if (job.developerId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    if (job.status === 'ACTIVE' || job.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Job already active/paid' },
        { status: 409 }
      )
    }

    // SECURITY: Ensure integer minor units (cents) for Stripe.
    // Our amounts are stored in cents, but we still round to guard against any float input.
    const amount = Math.round(job.totalBudget + job.platformFee)
    const expectedCurrency = 'eur'

    // SECURITY: Prevent creating multiple PaymentIntents for the same job.
    // If a PaymentIntent already exists, reuse it unless it's canceled or succeeded.
    if (job.stripePaymentIntent) {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(
          job.stripePaymentIntent
        )

        if (existingIntent.status === 'succeeded') {
          return NextResponse.json(
            { error: 'Payment already completed for this job' },
            { status: 409 }
          )
        }

        const amountMismatch = existingIntent.amount !== amount
        const currencyMismatch = existingIntent.currency !== expectedCurrency

        if (amountMismatch || currencyMismatch) {
          // Amount/currency changed (or stale intent). Cancel and create a new one.
          if (existingIntent.status !== 'canceled') {
            try {
              await stripe.paymentIntents.cancel(existingIntent.id)
            } catch (cancelError) {
              console.warn('Failed to cancel mismatched PaymentIntent:', cancelError)
            }
          }

          // Clear the saved intent only if it still matches this job.
          await prisma.testingJob.updateMany({
            where: { id: jobId, stripePaymentIntent: existingIntent.id },
            data: { stripePaymentIntent: null },
          })
        } else if (existingIntent.status !== 'canceled') {
          return NextResponse.json({
            success: true,
            clientSecret: existingIntent.client_secret,
            paymentIntentId: existingIntent.id,
            reused: true,
          })
        }
      } catch (error) {
        // If retrieval fails, fall through and create a new intent.
        console.warn('Failed to retrieve existing PaymentIntent:', error)
      }
    }

    // Create payment intent
    const paymentIntent = await createJobPaymentIntent(
      amount,
      jobId,
      currentUser.userId
    )

    // Persist the PaymentIntent for idempotency (race-safe).
    const updated = await prisma.testingJob.updateMany({
      where: { id: jobId, stripePaymentIntent: null },
      data: { stripePaymentIntent: paymentIntent.id },
    })

    if (updated.count === 0) {
      // Another request won the race. Cancel this intent and reuse the existing one.
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id)
      } catch (cancelError) {
        console.warn('Failed to cancel raced PaymentIntent:', cancelError)
      }

      const refreshed = await prisma.testingJob.findUnique({
        where: { id: jobId },
        select: { stripePaymentIntent: true },
      })

      if (refreshed?.stripePaymentIntent) {
        const existingIntent = await stripe.paymentIntents.retrieve(
          refreshed.stripePaymentIntent
        )
        if (existingIntent.status === 'succeeded') {
          return NextResponse.json(
            { error: 'Payment already completed for this job' },
            { status: 409 }
          )
        }
        return NextResponse.json({
          success: true,
          clientSecret: existingIntent.client_secret,
          paymentIntentId: existingIntent.id,
          reused: true,
        })
      }
    }

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
