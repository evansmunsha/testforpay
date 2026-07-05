import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import prisma from '@/lib/prisma'
import { sendJobPostedEmail } from '@/lib/email'

// This is CRITICAL for Stripe webhooks
export const runtime = 'nodejs'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown webhook error'
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.arrayBuffer()
    const body = Buffer.from(rawBody).toString('utf8')

    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('No Stripe signature found')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    if (!body) {
      console.error('Empty Stripe webhook body received')
      return NextResponse.json({ error: 'Empty body' }, { status: 400 })
    }

    console.log('Stripe webhook body length:', body.length)

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
      console.log('Stripe webhook verified:', event.type)
    } catch (error) {
      console.error(
        'Stripe signature verification failed:',
        getErrorMessage(error)
      )
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    switch (event.type as string) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment intent succeeded:', paymentIntent.id)

        // Activate the job and send confirmation email to developer
        if (paymentIntent.metadata?.jobId) {
          try {
            const job = await prisma.testingJob.update({
              where: { id: paymentIntent.metadata.jobId },
              data: { status: 'ACTIVE', publishedAt: new Date(), stripePaymentIntent: paymentIntent.id },
              include: { developer: { select: { email: true, name: true } } },
            })

            await sendJobPostedEmail(job.developer.email, {
              developerName: job.developer.name,
              appName: job.appName,
              testersNeeded: job.testersNeeded,
              paymentPerTesterCents: job.paymentPerTester,
              jobId: job.id,
            })
          } catch (e) {
            console.error('Failed to activate job or send confirmation email:', e)
          }
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
        console.log('Transfer created:', transfer.id)

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

          console.log(
            'Transfer recorded pending completion:',
            transfer.metadata.applicationId
          )
        }
        break
      }

      case 'transfer.failed': {
        const transfer = event.data.object as Stripe.Transfer
        console.error('Transfer failed:', transfer.id)

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
        console.error('Transfer reversed:', transfer.id)

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
        console.log('Account updated:', account.id)

        if (account.metadata?.testerId) {
          await prisma.user.update({
            where: { id: account.metadata.testerId },
            data: {
              stripeAccountId: account.id,
            },
          })

          console.log('Tester account linked:', account.metadata.testerId)
        }
        break
      }

      default:
        console.log('Unhandled Stripe event type:', event.type)
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
