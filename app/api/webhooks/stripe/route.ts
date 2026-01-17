import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import prisma from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Update job status to active and mark as paid
        if (paymentIntent.metadata?.jobId) {
          await prisma.testingJob.update({
            where: { id: paymentIntent.metadata.jobId },
            data: {
              status: 'ACTIVE',
              publishedAt: new Date(),
            },
          })

          console.log('Job payment successful:', paymentIntent.metadata.jobId)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.error('Payment failed:', paymentIntent.id)
        break
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer
        
        // Update payment status to completed
        if (transfer.metadata?.applicationId) {
          await prisma.payment.updateMany({
            where: { 
              applicationId: transfer.metadata.applicationId,
            },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              transferId: transfer.id,
            },
          })

          console.log('Tester payout successful:', transfer.metadata.applicationId)
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        
        // Update user's Stripe account status - Fixed: Check if metadata exists
        if (account.metadata && account.metadata.testerId) {
          await prisma.user.update({
            where: { id: account.metadata.testerId },
            data: {
              stripeAccountId: account.id,
            },
          })

          console.log('Tester Stripe account updated:', account.metadata.testerId)
        }
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}