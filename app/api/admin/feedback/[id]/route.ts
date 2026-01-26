import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { approved } = body

    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'Approved field must be a boolean' },
        { status: 400 }
      )
    }

    // Get the feedback
    const feedback = await prisma.feedback.findUnique({
      where: { id },
    })

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Update feedback approval status
    const updated = await prisma.feedback.update({
      where: { id },
      data: {
        approved,
        approvedAt: approved ? new Date() : null,
        approvedBy: approved ? currentUser.userId : null,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: approved ? 'Feedback approved' : 'Feedback unapproved',
      feedback: updated,
    })
  } catch (error) {
    console.error('Update feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const { id } = await params

    await prisma.feedback.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Feedback deleted',
    })
  } catch (error) {
    console.error('Delete feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to delete feedback' },
      { status: 500 }
    )
  }
}
