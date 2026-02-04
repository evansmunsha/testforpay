import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { processPaymentById } from '@/lib/payouts'

// This endpoint should be called by a cron service (e.g., Vercel Cron)
// Runs daily to auto-complete testing applications after testing period expires
// Vercel Cron: Add to vercel.json crons configuration
// Example: { "path": "/api/cron/auto-complete-tests", "schedule": "0 1 * * *" }

export const runtime = 'nodejs'

interface AutoCompleteResult {
  applicationId: string
  testerId: string
  daysExpired: number
  status: 'success' | 'failed'
  error?: string
}

export async function GET(request: Request) {
  try {
    // Verify the request is from a valid cron service
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ Cron auth failed - invalid or missing token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('⏰ Starting auto-completion of expired tests...')

    const results: AutoCompleteResult[] = []
    const now = new Date()

    // Find all applications currently in TESTING status where testingEndDate has passed
    const expiredApplications = await prisma.application.findMany({
      where: {
        status: 'TESTING',
        testingEndDate: {
          lte: now, // Testing period has ended
        },
      },
      include: {
        tester: true,
        job: true,
      },
    })

    console.log(`📋 Found ${expiredApplications.length} expired testing applications`)

    for (const application of expiredApplications) {
      try {
        const daysExpired = Math.floor(
          (now.getTime() - application.testingEndDate!.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Auto-complete the application
        await prisma.application.update({
          where: { id: application.id },
          data: {
            status: 'COMPLETED',
          },
        })

        // Ensure Payment record exists and is in PROCESSING status (ready for payout)
        let payment = await prisma.payment.findUnique({
          where: { applicationId: application.id },
        })

        if (payment && payment.status === 'PROCESSING') {
          // Payment already in correct status, ready for cron/process-payouts
          console.log(`✅ Application auto-completed and payment ready for payout: ${application.id}`)
        } else if (!payment) {
          // Create payment record if it doesn't exist (shouldn't happen normally)
          const job = application.job
          const platformFeePerTester = job.platformFee / job.testersNeeded
          const totalPaymentAmount = job.paymentPerTester + platformFeePerTester

          payment = await prisma.payment.create({
            data: {
              applicationId: application.id,
              jobId: application.jobId,
              amount: job.paymentPerTester,
              platformFee: platformFeePerTester,
              totalAmount: totalPaymentAmount,
              status: 'PROCESSING', // Ready for payout
              escrowedAt: new Date(),
            },
          })
          console.log(`✅ Auto-completed and created payment: ${application.id}`)
        }

        if (payment?.status === 'PROCESSING') {
          try {
            const payoutResult = await processPaymentById(payment.id)
            if (payoutResult?.status === 'failed') {
              console.warn('⚠️ Auto-complete payout failed:', payoutResult.error)
            }
          } catch (payoutError) {
            console.error('⚠️ Auto-complete payout threw an error:', payoutError)
          }
        }

        // Update tester reputation stats based on their completed applications
        try {
          const completedApps = await prisma.application.findMany({
            where: {
              testerId: application.testerId,
              status: 'COMPLETED',
            },
            include: {
              payment: true,
            },
          })

          const totalTestsCompleted = completedApps.length
          const totalEarnings = completedApps.reduce((sum, app) => sum + (app.payment?.amount || 0), 0)
          const avgEngagementScore =
            totalTestsCompleted > 0
              ? completedApps.reduce((sum, app) => sum + (app.engagementScore || 0), 0) / totalTestsCompleted
              : 0

          const withRatings = completedApps.filter(app => app.rating && app.rating > 0)
          const avgRating =
            withRatings.length > 0
              ? withRatings.reduce((sum, app) => sum + (app.rating || 0), 0) / withRatings.length
              : 0

          await prisma.user.update({
            where: { id: application.testerId },
            data: {
              totalTestsCompleted,
              totalEarnings,
              averageEngagementScore: Math.round(avgEngagementScore * 100) / 100,
              averageRating: Math.round(avgRating * 100) / 100,
            },
          })
        } catch (repError) {
          console.error('⚠️ Failed to update tester reputation for', application.testerId, ':', repError)
        }

        results.push({
          applicationId: application.id,
          testerId: application.testerId,
          daysExpired,
          status: 'success',
        })
      } catch (error: any) {
        console.error(`❌ Failed to auto-complete application ${application.id}:`, error)

        results.push({
          applicationId: application.id,
          testerId: application.testerId,
          daysExpired: Math.floor(
            (now.getTime() - application.testingEndDate!.getTime()) / (1000 * 60 * 60 * 24)
          ),
          status: 'failed',
          error: error.message || 'Unknown error',
        })
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length
    const failCount = results.filter((r) => r.status === 'failed').length

    console.log(`✅ Auto-completion done: ${successCount} success, ${failCount} failed`)

    return NextResponse.json({
      success: true,
      message: `Auto-completed ${results.length} expired testing applications`,
      successCount,
      failCount,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('❌ Cron auto-completion error:', error)
    return NextResponse.json(
      {
        error: 'Failed to auto-complete tests',
        message: error.message,
      },
      { status: 500 }
    )
  }
}

// Also support POST for webhook-style calls
export async function POST(request: Request) {
  return GET(request)
}
