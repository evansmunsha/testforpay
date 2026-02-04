import prisma from './prisma'
import { stripe } from './stripe'
import type { Prisma } from '@/generated/prisma/client'

interface PayoutResult {
  applicationId: string
  testerId: string
  amount: number
  status: 'success' | 'failed'
  error?: string
}

type PaymentWithContext = Prisma.PaymentGetPayload<{
  include: {
    application: {
      include: {
        tester: true
        job: true
      }
    }
  }
}>

async function processPaymentForPayout(payment: NonNullable<PaymentWithContext>): Promise<PayoutResult> {
  const { application } = payment
  const tester = application.tester

  // Skip if tester doesn't have a Stripe account
  if (!tester.stripeAccountId) {
    // Mark as failed so it doesn't stay stuck in PROCESSING forever
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
      },
    })
    return {
      applicationId: application.id,
      testerId: tester.id,
      amount: payment.amount,
      status: 'failed',
      error: 'Tester has no connected Stripe account',
    }
  }

  try {
    // Create a transfer to the tester's connected account
    const transfer = await stripe.transfers.create(
      {
        amount: Math.round(payment.amount * 100), // Convert to cents
        currency: 'usd',
        destination: tester.stripeAccountId,
        transfer_group: `job_${application.jobId}`,
        metadata: {
          applicationId: application.id,
          testerId: tester.id,
          jobId: application.jobId,
          appName: application.job.appName,
        },
      },
      {
        idempotencyKey: `payout_${payment.id}`,
      }
    )

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        transferId: transfer.id,
        completedAt: new Date(),
      },
    })

    return {
      applicationId: application.id,
      testerId: tester.id,
      amount: payment.amount,
      status: 'success',
    }
  } catch (error: any) {
    console.error(`Payout failed for application ${application.id}:`, error)

    // Mark payment as failed
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
      },
    })

    return {
      applicationId: application.id,
      testerId: tester.id,
      amount: payment.amount,
      status: 'failed',
      error: error.message || 'Transfer failed',
    }
  }
}

export async function processPaymentById(paymentId: string): Promise<PayoutResult | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      application: {
        include: {
          tester: true,
          job: true,
        },
      },
    },
  })

  if (!payment) return null
  if (payment.transferId || payment.status !== 'PROCESSING') {
    return {
      applicationId: payment.applicationId,
      testerId: payment.application.testerId,
      amount: payment.amount,
      status: 'failed',
      error: 'Payment not ready for payout',
    }
  }
  if (payment.application.status !== 'COMPLETED') {
    return {
      applicationId: payment.applicationId,
      testerId: payment.application.testerId,
      amount: payment.amount,
      status: 'failed',
      error: 'Application not completed',
    }
  }

  return processPaymentForPayout(payment)
}

// Process payouts for all completed tests that haven't been paid
export async function processCompletedTests(): Promise<PayoutResult[]> {
  const results: PayoutResult[] = []

  // Find all applications that are COMPLETED with payment in PROCESSING state (ready for payout)
  const pendingPayments = await prisma.payment.findMany({
    where: {
      status: 'PROCESSING', // Payment must be in PROCESSING status (testing started, not escrowed)
      application: {
        status: 'COMPLETED',
      },
    },
    include: {
      application: {
        include: {
          tester: true,
          job: true,
        },
      },
    },
  })

  for (const payment of pendingPayments) {
    const result = await processPaymentForPayout(payment)
    results.push(result)
  }

  return results
}

// Get pending payouts summary
export async function getPendingPayoutsSummary() {
  const pendingPayments = await prisma.payment.findMany({
    where: {
      status: 'PROCESSING', // Only PROCESSING payments (not ESCROWED, not already COMPLETED)
      application: {
        status: 'COMPLETED',
      },
    },
    include: {
      application: {
        include: {
          tester: {
            select: {
              id: true,
              email: true,
              name: true,
              stripeAccountId: true,
            },
          },
          job: {
            select: {
              id: true,
              appName: true,
            },
          },
        },
      },
    },
  })

  const totalAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0)
  const testersWithStripe = pendingPayments.filter(
    p => p.application.tester.stripeAccountId
  ).length
  const testersWithoutStripe = pendingPayments.length - testersWithStripe

  return {
    count: pendingPayments.length,
    totalAmount,
    testersWithStripe,
    testersWithoutStripe,
    payments: pendingPayments,
  }
}
