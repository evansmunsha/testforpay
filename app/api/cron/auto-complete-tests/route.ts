import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { processPaymentById } from '@/lib/payouts'
import { sendJobCompletedEmail } from '@/lib/email'

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
    const isProduction = process.env.NODE_ENV === 'production'

    // SECURITY: In production, require a cron secret unconditionally.
    // This prevents public triggering if the env var is missing or misconfigured.
    if (isProduction && !cronSecret) {
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
    }
    if (isProduction) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.log('❌ Cron auth failed - invalid or missing token')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Preserve current non-production behavior (only enforce when set)
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

        // Auto-complete the application (guard against double runs)
        const updated = await prisma.application.updateMany({
          where: { id: application.id, status: 'TESTING' },
          data: {
            status: 'COMPLETED',
          },
        })

        const alreadyCompleted = updated.count === 0

        // Ensure Payment record exists and is in PROCESSING status (ready for payout)
        let payment = await prisma.payment.findUnique({
          where: { applicationId: application.id },
        })

        if (payment && payment.status === 'ESCROWED' && !payment.transferId) {
          const moved = await prisma.payment.updateMany({
            where: {
              id: payment.id,
              status: 'ESCROWED',
              transferId: null,
            },
            data: { status: 'PROCESSING' },
          })
          if (moved.count === 0) {
            const fresh = await prisma.payment.findUnique({
              where: { id: payment.id },
              select: { status: true, transferId: true },
            })
            console.warn('⚠️ Payment not moved to PROCESSING:', {
              paymentId: payment.id,
              status: fresh?.status,
              transferId: fresh?.transferId,
            })
          }
          payment = await prisma.payment.findUnique({
            where: { applicationId: application.id },
          })
        }

        if (payment && payment.status === 'PROCESSING' && !payment.transferId) {
          // Payment now in correct status, ready for cron/process-payouts
          console.log(`✅ Application auto-completed and payment ready for payout: ${application.id}`)
        } else if (!payment) {
          // Create payment record if it doesn't exist (shouldn't happen normally)
          const job = application.job
          const platformFeePerTester = Math.round(job.platformFee / job.testersNeeded)
          const totalPaymentAmount = job.paymentPerTester + platformFeePerTester

          payment = await prisma.payment.create({
            data: {
              applicationId: application.id,
              jobId: application.jobId,
              amount: job.paymentPerTester,
              platformFee: platformFeePerTester,
              totalAmount: totalPaymentAmount,
              status: 'PROCESSING', // Ready for payout
            },
          })
          console.log(`✅ Auto-completed and created payment: ${application.id}`)
        }

        if (payment?.status === 'PROCESSING' && !payment.transferId) {
          try {
            const payoutResult = await processPaymentById(payment.id)
            if (payoutResult?.status === 'failed') {
              console.warn('⚠️ Auto-complete payout failed:', payoutResult.error)
            }
          } catch (payoutError) {
            console.error('⚠️ Auto-complete payout threw an error:', payoutError)
          }
        } else if (payment) {
          console.log('ℹ️ Skipping payout - payment not payout-ready:', {
            applicationId: application.id,
            paymentId: payment.id,
            status: payment.status,
            transferId: payment.transferId,
            alreadyCompleted,
          })
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

        // Check if ALL testing applications for this job are now complete
        // and send the developer a "ready to publish" email (once per job)
        try {
          const remainingTesting = await prisma.application.count({
            where: { jobId: application.jobId, status: 'TESTING' },
          })
          if (remainingTesting === 0) {
            const completedCount = await prisma.application.count({
              where: { jobId: application.jobId, status: 'COMPLETED' },
            })
            const job = await prisma.testingJob.findUnique({
              where: { id: application.jobId },
              include: { developer: { select: { email: true, name: true } } },
            })
            if (job && job.developer) {
              await sendJobCompletedEmail(job.developer.email, {
                developerName: job.developer.name,
                appName: job.appName,
                completedTesters: completedCount,
                jobId: job.id,
              })
            }
          }
        } catch (emailErr) {
          console.error('Failed to send job completed email:', emailErr)
        }
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

