import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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

    // Update job
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