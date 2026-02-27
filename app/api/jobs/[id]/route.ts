import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { toCents } from '@/lib/currency'

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
    const updateData: Record<string, unknown> = {}
    const allowedStringFields = [
      'appName',
      'appDescription',
      'packageName',
      'googlePlayLink',
      'appCategory',
      'minAndroidVersion',
    ] as const

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
      if (
        typeof body.testersNeeded !== 'number' ||
        !Number.isFinite(body.testersNeeded)
      ) {
        return NextResponse.json(
          { error: 'Invalid testersNeeded' },
          { status: 400 }
        )
      }
      updateData.testersNeeded = Math.max(1, Math.round(body.testersNeeded))
    }

    if ('testDuration' in body) {
      if (
        typeof body.testDuration !== 'number' ||
        !Number.isFinite(body.testDuration)
      ) {
        return NextResponse.json(
          { error: 'Invalid testDuration' },
          { status: 400 }
        )
      }
      updateData.testDuration = Math.max(1, Math.round(body.testDuration))
    }

    if ('paymentPerTester' in body) {
      if (
        typeof body.paymentPerTester !== 'number' ||
        !Number.isFinite(body.paymentPerTester)
      ) {
        return NextResponse.json(
          { error: 'Invalid paymentPerTester' },
          { status: 400 }
        )
      }
      // CURRENCY: Client sends euros; store as integer cents.
      updateData.paymentPerTester = toCents(body.paymentPerTester)
    }

    if ('status' in body) {
      const allowedStatuses = [
        'DRAFT',
        'ACTIVE',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
      ]
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

    // Keep all cancellation/refund logic on the dedicated endpoint.
    if (body.status === 'CANCELLED' && existingJob.status !== 'CANCELLED') {
      return NextResponse.json(
        { error: 'Use the dedicated cancellation endpoint for job cancellations' },
        { status: 400 }
      )
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const nextPaymentPerTester =
      typeof updateData.paymentPerTester === 'number'
        ? updateData.paymentPerTester
        : existingJob.paymentPerTester
    const nextTestersNeeded =
      typeof updateData.testersNeeded === 'number'
        ? updateData.testersNeeded
        : existingJob.testersNeeded

    const updatedJob = await prisma.testingJob.update({
      where: { id },
      data: {
        ...updateData,
        ...(typeof updateData.paymentPerTester === 'number' ||
        typeof updateData.testersNeeded === 'number'
          ? {
              totalBudget: nextPaymentPerTester * nextTestersNeeded,
              platformFee: Math.round(
                nextPaymentPerTester * nextTestersNeeded * 0.15
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
