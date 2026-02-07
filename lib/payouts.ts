import prisma from './prisma'
import { stripe } from './stripe'
import type { Prisma } from '@/generated/prisma/client'
import { sendNotification } from './notifications'

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
    // SECURITY: Pre-check platform balance to avoid balance_insufficient failures.
    // Stripe expects integer minor units; compare against available EUR balance.
    try {
      const balance = await stripe.balance.retrieve()
      const eurAvailable =
        balance.available.find((b) => b.currency.toLowerCase() === 'eur')?.amount || 0

      if (eurAvailable < payment.amount) {
        return {
          applicationId: application.id,
          testerId: tester.id,
          amount: payment.amount,
          status: 'failed',
          // Retryable: leave status unchanged so cron/admin retry can re-attempt later.
          error: 'Insufficient platform balance for payout',
        }
      }
    } catch (balanceError) {
      // If balance check fails, fall through and attempt transfer (will be handled by Stripe).
      console.warn('Failed to pre-check Stripe balance:', balanceError)
    }

    const account = await stripe.accounts.retrieve(tester.stripeAccountId)

    // Use Stripe account flags/requirements for payout readiness (more reliable than external account currency).
    const payoutsEnabled = account.payouts_enabled === true
    const hasBlockingRequirements =
      Array.isArray(account.requirements?.currently_due) &&
      account.requirements.currently_due.length > 0

    if (!payoutsEnabled || hasBlockingRequirements) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
        },
      })
      try {
        await sendNotification({
          userId: tester.id,
          title: 'Payout Setup Required',
          body: 'We couldn’t send your payout because your Stripe account isn’t fully set up for payouts yet. Please finish the Stripe setup to continue.',
          url: '/dashboard/settings',
          type: 'payout_setup_required',
        })
      } catch (notifyError) {
        console.error('Failed to notify tester about payout setup:', notifyError)
      }
      return {
        applicationId: application.id,
        testerId: tester.id,
        amount: payment.amount,
        status: 'failed',
        error: `Tester payout account not enabled for payouts (country: ${account.country || 'unknown'})`,
      }
    }

    // Create a transfer to the tester's connected account
    const transfer = await stripe.transfers.create(
      {
        // Amount is stored/handled in cents.
        amount: payment.amount,
        currency: 'eur',
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

    // Persist transferId but keep status PROCESSING.
    // Webhook will finalize to COMPLETED or FAILED.
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PROCESSING',
        transferId: transfer.id,
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
  if (payment.status !== 'PROCESSING' || payment.transferId) {
    return {
      applicationId: payment.applicationId,
      testerId: payment.application.testerId,
      amount: payment.amount,
      status: 'failed',
      error: 'Payment already initiated or not in payout-ready state',
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
      transferId: null, // Only payments that haven't initiated a transfer yet
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

// Reconcile payouts that have a transferId but are still PROCESSING.
// Minimal heuristic: after a short delay, assume transfer is final unless reversed.
export async function reconcileProcessingTransfers(minAgeMinutes = 60 * 24) {
  const cutoff = new Date(Date.now() - minAgeMinutes * 60 * 1000)

  const candidates = await prisma.payment.findMany({
    where: {
      status: 'PROCESSING',
      transferId: { not: null },
      updatedAt: { lte: cutoff },
    },
    select: {
      id: true,
      transferId: true,
    },
  })

  let completed = 0
  let refunded = 0
  let failed = 0

  for (const payment of candidates) {
    try {
      const transfer = await stripe.transfers.retrieve(payment.transferId as string)
      const isReversed =
        (transfer as any).reversed === true ||
        ((transfer as any).amount_reversed ?? 0) > 0

      if (isReversed) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'REFUNDED',
            failedAt: new Date(),
          },
        })
        refunded += 1
      } else {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        })
        completed += 1
      }
    } catch (error) {
      console.error('Failed to reconcile transfer for payment:', payment.id, error)
      failed += 1
    }
  }

  return {
    checked: candidates.length,
    completed,
    refunded,
    failed,
  }
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
