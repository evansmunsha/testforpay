import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { stripe } from '@/lib/stripe'

// POST - Cancel a job with flexible partial refund policy
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get the job with all applications and their payments
    const job = await prisma.testingJob.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
            tester: {
              select: {
                id: true,
                email: true,
                name: true,
                stripeAccountId: true,
              },
            },
            payment: true,
          },
        },
        payments: true,
      },
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (job.developerId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'Not authorized to cancel this job' },
        { status: 403 }
      )
    }

    // Check if job is already cancelled or completed
    if (job.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Job is already cancelled' },
        { status: 400 }
      )
    }

    if (job.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed job' },
        { status: 400 }
      )
    }

    // Categorize applications by status for partial refund calculation
    const completedTesters = job.applications.filter(app => app.status === 'COMPLETED')
    const testingTesters = job.applications.filter(app => app.status === 'TESTING')
    const verifiedTesters = job.applications.filter(app => app.status === 'VERIFIED')
    const optedInTesters = job.applications.filter(app => app.status === 'OPTED_IN')
    const approvedTesters = job.applications.filter(app => app.status === 'APPROVED')
    const pendingTesters = job.applications.filter(app => app.status === 'PENDING')

    // Calculate payouts and refunds
    const paymentPerTester = job.paymentPerTester
    
    // Payout percentages based on progress:
    // - COMPLETED: 100% (full payment)
    // - TESTING: 75% (significant work done)
    // - VERIFIED: 50% (opt-in verified, ready to test)
    // - OPTED_IN: 25% (joined testing program)
    // - APPROVED: 0% (just approved, no work yet)
    
    let totalPayoutToTesters = 0
    const testerPayouts: Array<{
      testerId: string
      email: string
      status: string
      amount: number
      percentage: number
    }> = []

    // Calculate payouts for each category
    for (const app of completedTesters) {
      const amount = paymentPerTester * 1.0 // 100%
      totalPayoutToTesters += amount
      testerPayouts.push({
        testerId: app.testerId,
        email: app.tester.email,
        status: 'COMPLETED',
        amount,
        percentage: 100,
      })
    }

    for (const app of testingTesters) {
      const amount = paymentPerTester * 0.75 // 75%
      totalPayoutToTesters += amount
      testerPayouts.push({
        testerId: app.testerId,
        email: app.tester.email,
        status: 'TESTING',
        amount,
        percentage: 75,
      })
    }

    for (const app of verifiedTesters) {
      const amount = paymentPerTester * 0.50 // 50%
      totalPayoutToTesters += amount
      testerPayouts.push({
        testerId: app.testerId,
        email: app.tester.email,
        status: 'VERIFIED',
        amount,
        percentage: 50,
      })
    }

    for (const app of optedInTesters) {
      const amount = paymentPerTester * 0.25 // 25%
      totalPayoutToTesters += amount
      testerPayouts.push({
        testerId: app.testerId,
        email: app.tester.email,
        status: 'OPTED_IN',
        amount,
        percentage: 25,
      })
    }

    // APPROVED testers get 0% - no work done yet
    for (const app of approvedTesters) {
      testerPayouts.push({
        testerId: app.testerId,
        email: app.tester.email,
        status: 'APPROVED',
        amount: 0,
        percentage: 0,
      })
    }

    // Calculate developer refund
    const totalJobBudget = job.totalBudget + job.platformFee
    const platformFeeOnPayouts = totalPayoutToTesters * 0.15 // Platform keeps 15% of payouts
    const developerRefund = totalJobBudget - totalPayoutToTesters - platformFeeOnPayouts

    // Process payments and refunds
    let refundIssued = false
    let refundId: string | null = null
    const payoutResults: Array<{ testerId: string; success: boolean; error?: string }> = []

    if (job.status === 'ACTIVE') {
      const paymentIntentId = job.stripePaymentIntent

      // First, process payouts to testers who earned money
      for (const payout of testerPayouts.filter(p => p.amount > 0)) {
        const testerApp = job.applications.find(a => a.testerId === payout.testerId)
        const stripeAccountId = testerApp?.tester.stripeAccountId

        if (stripeAccountId && payout.amount > 0) {
          try {
            // Create Stripe transfer to tester
            const transfer = await stripe.transfers.create({
              amount: Math.round(payout.amount * 100), // Convert to cents
              currency: 'usd',
              destination: stripeAccountId,
              metadata: {
                jobId: job.id,
                testerId: payout.testerId,
                reason: 'job_cancellation_partial_payment',
                originalStatus: payout.status,
                percentage: payout.percentage.toString(),
              },
            })

            // Update payment record
            if (testerApp?.payment) {
              await prisma.payment.update({
                where: { id: testerApp.payment.id },
                data: {
                  amount: payout.amount,
                  status: 'COMPLETED',
                  transferId: transfer.id,
                  completedAt: new Date(),
                },
              })
            }

            payoutResults.push({ testerId: payout.testerId, success: true })
            console.log(`Partial payout to tester ${payout.testerId}: $${payout.amount.toFixed(2)} (${payout.percentage}%)`)
          } catch (error: any) {
            console.error(`Failed to pay tester ${payout.testerId}:`, error.message)
            payoutResults.push({ testerId: payout.testerId, success: false, error: error.message })
          }
        } else if (payout.amount > 0) {
          // Tester doesn't have Stripe connected - flag for manual payout
          payoutResults.push({ 
            testerId: payout.testerId, 
            success: false, 
            error: 'No Stripe account connected - manual payout required' 
          })
        }
      }

      // Then process partial refund to developer
      if (developerRefund > 0 && paymentIntentId) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: Math.round(developerRefund * 100), // Partial refund in cents
            reason: 'requested_by_customer',
            metadata: {
              jobId: job.id,
              type: 'partial_cancellation_refund',
              testersCompensated: testerPayouts.filter(p => p.amount > 0).length.toString(),
            },
          })

          refundIssued = true
          refundId = refund.id
          console.log(`Partial refund to developer: $${developerRefund.toFixed(2)}`)
        } catch (stripeError: any) {
          console.error('Stripe refund error:', stripeError.message)
        }
      } else if (developerRefund <= 0) {
        // All budget used for tester payouts - no refund to developer
        refundIssued = false
        console.log('No refund to developer - all budget allocated to tester compensation')
      }
    }

    // Update job status to CANCELLED
    const cancelledJob = await prisma.testingJob.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    })

    // Update all non-completed applications to REJECTED
    await prisma.application.updateMany({
      where: {
        jobId: id,
        status: {
          in: ['PENDING', 'APPROVED', 'OPTED_IN', 'VERIFIED', 'TESTING'],
        },
      },
      data: {
        status: 'REJECTED',
      },
    })

    // Build response summary
    const activeTestersCount = completedTesters.length + testingTesters.length + 
                               verifiedTesters.length + optedInTesters.length + approvedTesters.length

    return NextResponse.json({
      success: true,
      job: cancelledJob,
      cancellation: {
        activeTesters: activeTestersCount,
        pendingRejected: pendingTesters.length,
        testerPayouts: testerPayouts.map(p => ({
          email: p.email,
          status: p.status,
          amount: p.amount,
          percentage: p.percentage,
        })),
        totalPaidToTesters: totalPayoutToTesters,
        platformFee: platformFeeOnPayouts,
        developerRefund: developerRefund > 0 ? developerRefund : 0,
      },
      refund: {
        issued: refundIssued,
        amount: developerRefund > 0 ? developerRefund : 0,
        refundId: refundId,
        message: refundIssued
          ? `Partial refund of $${developerRefund.toFixed(2)} has been processed.`
          : developerRefund <= 0
            ? 'No refund - all budget used for tester compensation'
            : job.status === 'DRAFT'
              ? 'No refund needed - job was not yet paid'
              : 'Refund flagged for manual processing',
      },
      payoutResults,
      message: activeTestersCount > 0
        ? `Job cancelled. ${testerPayouts.filter(p => p.amount > 0).length} testers compensated based on progress.`
        : 'Job cancelled successfully',
    })
  } catch (error) {
    console.error('Cancel job error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    )
  }
}
