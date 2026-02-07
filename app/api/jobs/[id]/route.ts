import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { refundPaymentIntent, stripe } from '@/lib/stripe'
import { formatEurFromCents, toCents } from '@/lib/currency'

// GET - Get single job
export async function GET(
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

    const job = await prisma.testingJob.findUnique({
      where: { id },
      include: {
        developer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        applications: {
          include: {
            tester: {
              select: {
                id: true,
                name: true,
                email: true,
                muteDeveloperReplies: true,
                deviceInfo: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // SECURITY: Only the job owner or an admin can access full job details.
    // This prevents public access to tester PII (email/device info) via this endpoint.
    if (currentUser.role !== 'ADMIN' && job.developerId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, job })
  } catch (error) {
    console.error('Get job error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}

// PATCH - Update job
export async function PATCH(
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
    const body = await request.json()

    // Check if user owns this job
    const existingJob = await prisma.testingJob.findUnique({
      where: { id },
    })

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    if (existingJob.developerId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    // SECURITY: Whitelist fields to prevent mass assignment of sensitive data.
    // Only allow the fields that are editable from the UI.
    const updateData: Record<string, any> = {}
    const allowedStringFields = [
      'appName',
      'appDescription',
      'packageName',
      'googlePlayLink',
      'appCategory',
      'minAndroidVersion',
    ]

    for (const field of allowedStringFields) {
      if (field in body) {
        if (typeof body[field] !== 'string') {
          return NextResponse.json(
            { error: `Invalid ${field}` },
            { status: 400 }
          )
        }
        updateData[field] = body[field]
      }
    }

    if ('testersNeeded' in body) {
      if (typeof body.testersNeeded !== 'number' || !Number.isFinite(body.testersNeeded)) {
        return NextResponse.json(
          { error: 'Invalid testersNeeded' },
          { status: 400 }
        )
      }
      updateData.testersNeeded = Math.max(1, Math.round(body.testersNeeded))
    }

    if ('testDuration' in body) {
      if (typeof body.testDuration !== 'number' || !Number.isFinite(body.testDuration)) {
        return NextResponse.json(
          { error: 'Invalid testDuration' },
          { status: 400 }
        )
      }
      updateData.testDuration = Math.max(1, Math.round(body.testDuration))
    }

    if ('paymentPerTester' in body) {
      if (typeof body.paymentPerTester !== 'number' || !Number.isFinite(body.paymentPerTester)) {
        return NextResponse.json(
          { error: 'Invalid paymentPerTester' },
          { status: 400 }
        )
      }
      // CURRENCY: Client sends euros; store as integer cents to avoid float rounding.
      updateData.paymentPerTester = toCents(body.paymentPerTester)
    }

    if ('status' in body) {
      const allowedStatuses = ['DRAFT', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
      if (!allowedStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        )
      }
      updateData.status = body.status
    }

    if ('publishedAt' in body) {
      if (typeof body.publishedAt !== 'string') {
        return NextResponse.json(
          { error: 'Invalid publishedAt' },
          { status: 400 }
        )
      }
      updateData.publishedAt = body.publishedAt
    }

    // SECURITY: Prevent activating unpaid jobs in production.
    // Rationale: Developers must not be able to publish without a verified Stripe payment.
    if (body.status === 'ACTIVE' && existingJob.status === 'DRAFT') {
      if (process.env.NODE_ENV === 'production') {
        if (!existingJob.stripePaymentIntent) {
          return NextResponse.json(
            { error: 'Payment not verified for this job' },
            { status: 402 }
          )
        }

        try {
          const intent = await stripe.paymentIntents.retrieve(
            existingJob.stripePaymentIntent
          )

          if (intent.status !== 'succeeded') {
            return NextResponse.json(
              { error: 'Payment not verified for this job' },
              { status: 402 }
            )
          }
        } catch (error) {
          console.error('Failed to verify payment intent:', error)
          return NextResponse.json(
            { error: 'Payment verification failed' },
            { status: 502 }
          )
        }
      }
    }

    // Handle job cancellation with partial refunds based on testing progress
    if (body.status === 'CANCELLED' && existingJob.status !== 'CANCELLED') {
      // Compensation percentages based on testing progress
      const compensationRates: Record<string, number> = {
        COMPLETED: 1.0,   // 100%
        TESTING: 0.75,    // 75%
        VERIFIED: 0.5,    // 50%
        OPTED_IN: 0.25,   // 25%
        APPROVED: 0,      // 0%
        PENDING: 0,       // 0%
      }

      // Get all applications by status
      const applicationsByStatus = await prisma.application.findMany({
        where: { jobId: id },
        include: { tester: true },
      })

      // Calculate payouts per tester
      let totalTesterPayouts = 0
      const payoutDetails: Array<{
        applicationId: string
        testerId: string
        status: string
        basePayment: number
        compensation: number
      }> = []

      for (const app of applicationsByStatus) {
        const rate = compensationRates[app.status] || 0
        const compensation = Math.round(existingJob.paymentPerTester * rate)

        if (compensation > 0) {
          totalTesterPayouts += compensation
          payoutDetails.push({
            applicationId: app.id,
            testerId: app.testerId,
            status: app.status,
            basePayment: existingJob.paymentPerTester,
            compensation,
          })
        }
      }

      // Calculate platform fee on actual payouts (not full budget)
      const platformFeeOnPayouts = Math.round(totalTesterPayouts * 0.15)

      // Calculate developer refund
      const totalBudgetPaid = existingJob.totalBudget + existingJob.platformFee
      const developerRefund = Math.round(totalBudgetPaid - totalTesterPayouts - platformFeeOnPayouts)

      // Create Payment records for testers who earned compensation
      for (const detail of payoutDetails) {
        try {
          // Find existing application payment or create new one
          const existingPayment = await prisma.payment.findUnique({
            where: { applicationId: detail.applicationId },
          })

          if (existingPayment) {
            // Update existing payment to REFUNDED status instead of deleting
            await prisma.payment.update({
              where: { id: existingPayment.id },
              data: {
                amount: detail.compensation,
                platformFee: Math.round(detail.compensation * 0.15),
                totalAmount: detail.compensation + Math.round(detail.compensation * 0.15),
                status: 'REFUNDED', // Mark as refunded for audit trail
                completedAt: new Date(),
              },
            })
          } else {
            // Create new payment record for this tester with REFUNDED status
            await prisma.payment.create({
              data: {
                applicationId: detail.applicationId,
                jobId: id,
                amount: detail.compensation,
                platformFee: Math.round(detail.compensation * 0.15),
                totalAmount: detail.compensation + Math.round(detail.compensation * 0.15),
                status: 'REFUNDED',
                escrowedAt: new Date(),
                completedAt: new Date(),
              },
            })
          }
        } catch (paymentError) {
          console.error('Failed to create/update payment for tester:', detail.testerId, paymentError)
        }
      }

      // Refund developer to their Stripe account
      if (existingJob.stripePaymentIntent) {
        try {
          const refund = await refundPaymentIntent(
            existingJob.stripePaymentIntent,
            developerRefund // Refund only the unused amount
          )
          console.log('💰 Developer refund processed:', refund.id, 'Amount:', formatEurFromCents(developerRefund))
        } catch (refundError) {
          console.error('Failed to refund developer:', refundError)
          // Log but don't fail the cancellation
        }
      }

      // Mark PENDING applications as rejected (not paid)
      await prisma.application.updateMany({
        where: {
          jobId: id,
          status: 'PENDING',
        },
        data: {
          status: 'REJECTED',
        },
      })

      console.log(`📋 Job cancelled with partial refunds:
        - Total tester payouts: ${formatEurFromCents(totalTesterPayouts)}
        - Platform fee (15%): ${formatEurFromCents(platformFeeOnPayouts)}
        - Developer refund: ${formatEurFromCents(developerRefund)}
        - Testers paid: ${payoutDetails.length}
      `)

      // Return cancellation breakdown for UI
      return NextResponse.json({
        success: true,
        cancelled: true,
        message: 'Job cancelled with partial refunds processed',
        breakdown: {
          totalBudgetPaid,
          totalTesterPayouts,
          platformFeeOnPayouts,
          developerRefund,
          payoutDetails,
        },
      })
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update job (only if not cancelled - cancellation returns above)
    const updatedJob = await prisma.testingJob.update({
      where: { id },
      data: {
        ...updateData,
        // Recalculate if payment or testers changed
        ...((typeof updateData.paymentPerTester === 'number' || typeof updateData.testersNeeded === 'number')
          ? {
              totalBudget: (updateData.paymentPerTester ?? existingJob.paymentPerTester) * 
                          (updateData.testersNeeded ?? existingJob.testersNeeded),
              platformFee: Math.round(
                (updateData.paymentPerTester ?? existingJob.paymentPerTester) * 
                (updateData.testersNeeded ?? existingJob.testersNeeded) * 0.15
              ),
            }
          : {}),
      },
    })

    return NextResponse.json({
      success: true,
      job: updatedJob,
      message: 'Job updated successfully',
    })
  } catch (error) {
    console.error('Update job error:', error)
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
  }
}

// DELETE - Delete job
export async function DELETE(
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

    // Check if user owns this job
    const existingJob = await prisma.testingJob.findUnique({
      where: { id },
    })

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    if (existingJob.developerId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    // Delete job
    await prisma.testingJob.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully',
    })
  } catch (error) {
    console.error('Delete job error:', error)
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    )
  }
}



