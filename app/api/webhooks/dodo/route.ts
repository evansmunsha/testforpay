import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyDodoWebhook } from '@/lib/dodo-webhook'
import { activateJobAfterPayment } from '@/lib/job-activation'

export const runtime = 'nodejs'

interface DodoEvent {
  type?: string
  data?: {
    payment_id?: string
    metadata?: Record<string, string> | null
  }
}

export async function POST(request: Request) {
  try {
    // The exact text received is needed to check the signature, so it is never re-built from JSON.
    const rawBody = await request.text()

    const verified = verifyDodoWebhook({
      rawBody,
      webhookId: request.headers.get('webhook-id'),
      webhookTimestamp: request.headers.get('webhook-timestamp'),
      webhookSignature: request.headers.get('webhook-signature'),
      secret: process.env.DODO_PAYMENTS_WEBHOOK_SECRET,
    })
    if (!verified.ok) {
      console.error('Dodo webhook rejected:', verified.reason)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    let event: DodoEvent
    try {
      event = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    // Dodo repeats a message until it gets an answer; the same webhook-id is handled once.
    try {
      await prisma.processedWebhook.create({ data: { id: `dodo:${verified.webhookId}`, provider: 'DODO' } })
    } catch {
      return NextResponse.json({ received: true, duplicate: true })
    }

    const metadata = event.data?.metadata ?? {}
    const reference = metadata.reference

    try {
      if (event.type === 'payment.succeeded' && reference && metadata.jobId) {
        const transaction = await prisma.paymentTransaction.findUnique({ where: { reference } })
        // Only a payment we started ourselves, for the same job and developer, can open a job.
        if (
          transaction &&
          transaction.provider === 'DODO' &&
          transaction.jobId === metadata.jobId &&
          transaction.developerId === metadata.developerId
        ) {
          await prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: { status: 'PAID', paidAt: new Date(), providerReference: event.data?.payment_id ?? transaction.providerReference },
          })
          await activateJobAfterPayment(transaction.jobId, `dodo:${event.data?.payment_id ?? transaction.reference}`)
        } else {
          console.error('Dodo payment does not match any of our checkouts:', reference)
        }
      } else if (event.type === 'payment.failed' && reference) {
        await prisma.paymentTransaction.updateMany({
          where: { reference, provider: 'DODO', status: 'PENDING' },
          data: { status: 'FAILED' },
        })
      }
    } catch (processError) {
      // Let Dodo's retry run this message again.
      await prisma.processedWebhook.deleteMany({ where: { id: `dodo:${verified.webhookId}` } })
      throw processError
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Dodo webhook error:', error)
    // A 500 makes Dodo try again later.
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
