import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification } from '@/lib/notifications'

const ALLOWED_REASONS = [
  'harassment',
  'spam',
  'unsafe',
  'other',
]

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
    const { reason, details } = body

    if (!reason || !ALLOWED_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid reason' },
        { status: 400 }
      )
    }

    if (details && details.length > 1000) {
      return NextResponse.json(
        { error: 'Details must be 1000 characters or less' },
        { status: 400 }
      )
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: { select: { id: true, appName: true, developerId: true } },
        tester: { select: { id: true } },
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
        { error: 'Nothing to report yet' },
        { status: 400 }
      )
    }

    const existing = await prisma.feedbackReport.findFirst({
      where: {
        applicationId: id,
        reporterId: currentUser.userId,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Report already submitted' },
        { status: 409 }
      )
    }

    const report = await prisma.feedbackReport.create({
      data: {
        applicationId: id,
        reporterId: currentUser.userId,
        reason,
        details: details?.trim() || null,
      },
    })

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    })

    await Promise.allSettled(
      admins.map((admin) =>
        sendNotification({
          userId: admin.id,
          title: 'Feedback reply reported',
          body: `A tester reported a developer reply on "${application.job.appName}".`,
          url: '/dashboard/admin',
          type: 'feedback_reported',
        })
      )
    )

    return NextResponse.json({
      success: true,
      report,
    })
  } catch (error) {
    console.error('Feedback report error:', error)
    return NextResponse.json(
      { error: 'Failed to submit report' },
      { status: 500 }
    )
  }
}
