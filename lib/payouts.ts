import prisma from './prisma'
import { stripe } from './stripe'

interface PayoutResult {
  applicationId: string
  testerId: string
  amount: number
  status: 'success' | 'failed'
  error?: string
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
    const { application } = payment
    const tester = application.tester

    // Skip if tester doesn't have a Stripe account
    if (!tester.stripeAccountId) {
      results.push({
        applicationId: application.id,
        testerId: tester.id,
        amount: payment.amount,
        status: 'failed',
        error: 'Tester has no connected Stripe account',
      })
      continue
    }

    try {
      // Create a transfer to the tester's connected account
      const transfer = await stripe.transfers.create({
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
      })

      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          transferId: transfer.id,
          completedAt: new Date(),
        },
      })

      results.push({
        applicationId: application.id,
        testerId: tester.id,
        amount: payment.amount,
        status: 'success',
      })
    } catch (error: any) {
      console.error(`Payout failed for application ${application.id}:`, error)

      // Mark payment as failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
        },
      })

      results.push({
        applicationId: application.id,
        testerId: tester.id,
        amount: payment.amount,
        status: 'failed',
        error: error.message || 'Transfer failed',
      })
    }
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
