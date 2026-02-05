import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification } from '@/lib/notifications'

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
    const { reply } = body

    if (!reply || reply.trim().length < 5) {
      return NextResponse.json(
        { error: 'Reply must be at least 5 characters' },
        { status: 400 }
      )
    }

    if (reply.trim().length > 500) {
      return NextResponse.json(
        { error: 'Reply must be 500 characters or less' },
        { status: 400 }
      )
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            id: true,
            appName: true,
            developerId: true,
          },
        },
      },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    if (application.testerId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    if (!application.developerReply) {
      return NextResponse.json(
        { error: 'Cannot reply before the developer responds' },
        { status: 400 }
      )
    }

    if (application.testerFollowupReply) {
      return NextResponse.json(
        { error: 'Follow-up reply already sent' },
        { status: 409 }
      )
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        testerFollowupReply: reply.trim(),
        testerFollowupAt: new Date(),
      },
    })

    try {
      await sendNotification({
        userId: application.job.developerId,
        title: 'Tester replied to your feedback',
        body: `A tester replied to your feedback on "${application.job.appName}".`,
        url: `/dashboard/jobs/${application.jobId}`,
        type: 'feedback_followup',
      })
    } catch (notifyError) {
      console.error('Failed to notify developer about follow-up:', notifyError)
    }

    return NextResponse.json({
      success: true,
      application: updated,
    })
  } catch (error) {
    console.error('Feedback follow-up error:', error)
    return NextResponse.json(
      { error: 'Failed to submit follow-up' },
      { status: 500 }
    )
  }
}
