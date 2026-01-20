import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { stripe } from '@/lib/stripe'

// POST - Cancel a job
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

    // Get the job with applications
    const job = await prisma.testingJob.findUnique({
      where: { id },
      include: {
        applications: {
          where: {
            status: {
              in: ['APPROVED', 'OPTED_IN', 'VERIFIED', 'TESTING', 'COMPLETED'],
            },
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

    // Check if there are any approved/testing applications
    const hasActiveTesters = job.applications.length > 0

    if (hasActiveTesters) {
      return NextResponse.json(
        { 
          error: 'Cannot cancel job with active testers. Wait for testing to complete or contact support.',
          activeTesters: job.applications.length,
        },
        { status: 400 }
      )
    }

    // Process refund if job was paid (ACTIVE status)
    let refundIssued = false
    let refundAmount = 0
    let refundId: string | null = null

    if (job.status === 'ACTIVE') {
      refundAmount = job.totalBudget + job.platformFee
      
      // Get payment intent from job record
      const paymentIntentId = (job as any).stripePaymentIntent
      
      if (paymentIntentId) {
        try {
          // Create actual Stripe refund
          const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: 'requested_by_customer',
          })
          
          refundIssued = true
          refundId = refund.id
          console.log(`Refund created for job ${id}: ${refund.id}, amount: $${(refund.amount / 100).toFixed(2)}`)
        } catch (stripeError: any) {
          console.error('Stripe refund error:', stripeError.message)
          // If refund fails, still cancel but flag for manual review
          return NextResponse.json(
            { 
              error: 'Job cancelled but automatic refund failed. Our team will process your refund manually within 5-10 business days.',
              jobCancelled: true,
              refundError: stripeError.message,
            },
            { status: 500 }
          )
        }
      } else {
        // No payment intent stored (legacy job or payment issue)
        console.log(`No payment intent found for job ${id}, flagging for manual refund`)
      }
    }

    // Update job status to CANCELLED
    const cancelledJob = await prisma.testingJob.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    })

    // Reject any pending applications
    await prisma.application.updateMany({
      where: {
        jobId: id,
        status: 'PENDING',
      },
      data: {
        status: 'REJECTED',
      },
    })

    return NextResponse.json({
      success: true,
      job: cancelledJob,
      refund: {
        issued: refundIssued,
        amount: refundAmount > 0 ? refundAmount : null,
        refundId: refundId,
        message: refundIssued 
          ? `Refund of $${refundAmount.toFixed(2)} has been processed. It will appear on your statement within 5-10 business days.`
          : job.status === 'DRAFT' 
            ? 'No refund needed - job was not yet paid'
            : 'Refund flagged for manual processing',
      },
      message: 'Job cancelled successfully',
    })
  } catch (error) {
    console.error('Cancel job error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    )
  }
}
