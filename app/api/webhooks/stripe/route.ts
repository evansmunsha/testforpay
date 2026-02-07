// app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import prisma from '@/lib/prisma'
import { sendNotification, NotificationTemplates } from '@/lib/notifications'
import Stripe from 'stripe'
import { formatEurFromCents } from '@/lib/currency'

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
    // NOTE: Stripe's event type union can lag behind actual event strings.
    // Cast to string to avoid TS blocking valid webhook types like transfer.failed.
    switch (event.type as string) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        console.log('💳 Checkout completed:', session.id)

        if (session.payment_status !== 'paid') {
          console.warn('Checkout session completed but not paid:', session.id, session.payment_status)
          break
        }
        
        if (session.metadata?.jobId) {
          const updated = await prisma.testingJob.updateMany({
            where: { id: session.metadata.jobId, stripeSessionId: null },
            data: {
              status: 'ACTIVE',
              publishedAt: new Date(),
              stripeSessionId: session.id,
              stripePaymentIntent: session.payment_intent as string,
            },
          })

          if (updated.count === 0) {
            console.log('↩️ Duplicate checkout webhook ignored (already processed):', session.id, session.metadata?.jobId)
            break
          }

          const job = await prisma.testingJob.findUnique({
            where: { id: session.metadata.jobId },
            include: {
              developer: true,
            },
          })

          if (!job) {
            break
          }

          console.log('✅ Job activated:', session.metadata.jobId, 'PaymentIntent:', session.payment_intent)
          
          // Notify developer that job is active
          try {
            await sendNotification({
              userId: job.developerId,
              title: 'Job Published! 🚀',
              body: `Your testing job "${job.appName}" is now live and testers can apply.`,
              url: `/dashboard/jobs/${job.id}`,
              type: 'job_published',
            })
          } catch (notifyError) {
            console.error('Failed to notify developer of job activation:', notifyError)
          }
          
          // Notify all testers of new job opportunity
          void (async () => {
            try {
              const testers = await prisma.user.findMany({
                where: { role: 'TESTER' },
                select: { id: true },
              })
              
              const notifyPromises = testers.map(tester =>
                sendNotification({
                  userId: tester.id,
                  title: 'New Job Available! 📱',
                  body: `New testing opportunity: "${job.appName}" - ${formatEurFromCents(job.paymentPerTester)} per tester`,
                  url: `/dashboard/browse?jobId=${job.id}`,
                  type: 'new_job_posted',
                }).catch(err => console.error(`Failed to notify tester ${tester.id}:`, err))
              )
              
              await Promise.allSettled(notifyPromises)
              console.log('✅ Notified', testers.length, 'testers of new job')
            } catch (error) {
              console.error('Failed to notify testers of new job:', error)
            }
          })()
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
              transferId: null,
              status: 'PROCESSING',
            },
            data: {
              transferId: transfer.id,
            },
          })

          console.log('✅ Transfer recorded (pending completion):', transfer.metadata.applicationId)
        }
        break
      }

      case 'transfer.failed': {
        const transfer = event.data.object as Stripe.Transfer
        console.error('❌ Transfer failed:', transfer.id)

        if (transfer.metadata?.applicationId) {
          await prisma.payment.updateMany({
            where: {
              applicationId: transfer.metadata.applicationId,
            },
            data: {
              status: 'FAILED',
              failedAt: new Date(),
            },
          })
        }
        break
      }

      case 'transfer.reversed': {
        const transfer = event.data.object as Stripe.Transfer
        console.error('❌ Transfer reversed:', transfer.id)

        if (transfer.metadata?.applicationId) {
          await prisma.payment.updateMany({
            where: {
              applicationId: transfer.metadata.applicationId,
            },
            data: {
              status: 'REFUNDED',
              failedAt: new Date(),
              completedAt: null,
            },
          })
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
