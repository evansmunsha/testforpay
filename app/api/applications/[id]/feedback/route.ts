import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification, NotificationTemplates } from '@/lib/notifications'

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
    const body = await request.json()
    const { feedback, rating } = body

    if (!feedback || feedback.trim().length < 10) {
      return NextResponse.json(
        { error: 'Feedback must be at least 10 characters' },
        { status: 400 }
      )
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Get the application
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            developer: true,
          },
        },
        tester: true,
      },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Verify the current user is the tester
    if (application.testerId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    // Only allow feedback for testing/completed applications
    if (!['TESTING', 'COMPLETED'].includes(application.status)) {
      return NextResponse.json(
        { error: 'Cannot submit feedback at this stage' },
        { status: 400 }
      )
    }

    // Update application with feedback
    const updatedApplication = await prisma.application.update({
      where: { id },
      data: {
        feedback: feedback.trim(),
        rating,
      },
    })

    // Notify the developer
    try {
      const template = NotificationTemplates.newFeedback(
        application.tester.name || 'A tester',
        application.job.appName
      )
      await sendNotification({
        userId: application.job.developerId,
        ...template,
        url: `/dashboard/jobs/${application.jobId}`,
      })
    } catch (notifError) {
      console.error('Failed to send notification:', notifError)
    }

    return NextResponse.json({
      success: true,
      application: updatedApplication,
      message: 'Feedback submitted successfully',
    })
  } catch (error) {
    console.error('Submit feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}
