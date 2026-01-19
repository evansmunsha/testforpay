import prisma from './prisma'
import { transferToTester } from './stripe'

export async function processCompletedTests() {
  const now = new Date()

  // Find all applications that are in TESTING status and have reached their end date
  const dueApplications = await prisma.application.findMany({
    where: {
      status: 'TESTING',
      testingEndDate: {
        lte: now,
      },
    },
    include: {
      job: true,
      tester: {
        select: {
          stripeAccountId: true,
        },
      },
      payment: true,
    },
  })

  const results = []

  for (const app of dueApplications) {
    try {
      if (!app.tester.stripeAccountId) {
        throw new Error(`Tester ${app.testerId} has no Stripe account linked`)
      }

      if (!app.payment) {
        throw new Error(`Application ${app.id} has no payment record`)
      }

      // 1. Mark application as COMPLETED
      await prisma.application.update({
        where: { id: app.id },
        data: { status: 'COMPLETED' },
      })

      // 2. Trigger Stripe Transfer
      const transfer = await transferToTester(
        app.job.paymentPerTester,
        app.tester.stripeAccountId,
        app.id
      )

      // 3. Update Payment record (this will also be updated by webhook, but we do it here for immediacy)
      await prisma.payment.update({
        where: { id: app.payment.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          transferId: transfer.id,
        },
      })

      results.push({ id: app.id, success: true })
    } catch (error: any) {
      console.error(`Failed to process payout for application ${app.id}:`, error.message)
      results.push({ id: app.id, success: false, error: error.message })
    }
  }

  return results
}
