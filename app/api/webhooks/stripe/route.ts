// app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import prisma from '@/lib/prisma'
import Stripe from 'stripe'

// This is CRITICAL for Stripe webhooks
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    // Get raw body as Buffer (NOT text!)
    const rawBody = await request.arrayBuffer()
    const body = Buffer.from(rawBody).toString('utf8')
    
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('❌ No signature found')
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      )
    }

    if (!body) {
      console.error('❌ Empty body received')
      return NextResponse.json(
        { error: 'Empty body' },
        { status: 400 }
      )
    }

    console.log('📦 Body length:', body.length)

    let event: Stripe.Event

    try {
      // Verify webhook signature with raw body
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
      console.log('✅ Webhook verified:', event.type)
    } catch (err: any) {
      console.error('❌ Signature verification failed:', err.message)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        console.log('💳 Checkout completed:', session.id)
        
        if (session.metadata?.jobId) {
          const job = await prisma.testingJob.update({
            where: { id: session.metadata.jobId },
            data: {
              status: 'ACTIVE',
              publishedAt: new Date(),
            },
          })

          // Create payment records for each tester spot? 
          // Actually, we usually create them when testers apply.
          // But we can record the developer's main payment here if we want.

          console.log('✅ Job activated:', session.metadata.jobId)
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('💰 Payment intent succeeded:', paymentIntent.id)
        // We handle activation in checkout.session.completed if using checkout,
        // but if we use custom flow, we'd handle it here.
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.error('❌ Payment failed:', paymentIntent.id)
        break
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer
        console.log('💸 Transfer created:', transfer.id)
        
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

          console.log('✅ Tester payout completed:', transfer.metadata.applicationId)
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        console.log('👤 Account updated:', account.id)
        
        if (account.metadata?.testerId) {
          await prisma.user.update({
            where: { id: account.metadata.testerId },
            data: {
              stripeAccountId: account.id,
            },
          })

          console.log('✅ Tester account linked:', account.metadata.testerId)
        }
        break
      }

      default:
        console.log('ℹ️ Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
    
  } catch (error: any) {
    console.error('❌ Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}