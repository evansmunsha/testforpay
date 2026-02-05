import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { refundPaymentIntent } from '@/lib/stripe'

// GET - Get single job
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // If status is being updated to ACTIVE, ensure it's paid or create checkout
    if (body.status === 'ACTIVE' && existingJob.status === 'DRAFT') {
      // Logic for manual publishing would go here
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
        const compensation = Math.round(existingJob.paymentPerTester * rate * 100) / 100

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
      const platformFeeOnPayouts = Math.round(totalTesterPayouts * 0.15 * 100) / 100

      // Calculate developer refund
      const totalBudgetPaid = existingJob.totalBudget + existingJob.platformFee
      const developerRefund = Math.round((totalBudgetPaid - totalTesterPayouts - platformFeeOnPayouts) * 100) / 100

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
                platformFee: Math.round(detail.compensation * 0.15 * 100) / 100,
                totalAmount: detail.compensation + Math.round(detail.compensation * 0.15 * 100) / 100,
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
                platformFee: Math.round(detail.compensation * 0.15 * 100) / 100,
                totalAmount: detail.compensation + Math.round(detail.compensation * 0.15 * 100) / 100,
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
          console.log('💰 Developer refund processed:', refund.id, 'Amount: €' + developerRefund)
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
        - Total tester payouts: €${totalTesterPayouts}
        - Platform fee (15%): €${platformFeeOnPayouts}
        - Developer refund: €${developerRefund}
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

    // Update job (only if not cancelled - cancellation returns above)
    const updatedJob = await prisma.testingJob.update({
      where: { id },
      data: {
        ...body,
        // Recalculate if payment or testers changed
        ...(body.paymentPerTester || body.testersNeeded
          ? {
              totalBudget: (body.paymentPerTester || existingJob.paymentPerTester) * 
                          (body.testersNeeded || existingJob.testersNeeded),
              platformFee: (body.paymentPerTester || existingJob.paymentPerTester) * 
                          (body.testersNeeded || existingJob.testersNeeded) * 0.15,
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



