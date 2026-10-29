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
    const { verificationImageUrl, verificationImageUrl2 } = body

    // Proof of the Install button is required; a second screenshot (app installed) is optional.
    if (typeof verificationImageUrl !== 'string' || !verificationImageUrl.trim()) {
      return NextResponse.json(
        { error: 'A screenshot showing the Install button is required' },
        { status: 400 }
      )
    }

    // Get the application
    const application = await prisma.application.findUnique({
      where: { id },
      include: { job: { select: { appName: true, developerId: true, id: true } } },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Only the tester themselves can upload their verification
    if (application.testerId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    // Tester can upload as soon as they are APPROVED — no cohort-release gate
    if (application.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Screenshots can only be uploaded once your application has been approved' },
        { status: 409 }
      )
    }

    // Update application with verification images and advance to OPTED_IN
    const updatedApplication = await prisma.application.update({
      where: { id },
      data: {
        status: 'OPTED_IN',
        verificationImage: verificationImageUrl,
        verificationImage2: typeof verificationImageUrl2 === 'string' && verificationImageUrl2.trim()
          ? verificationImageUrl2
          : null,
      },
    })

    // Notify the developer so they can review the screenshot
    try {
      await sendNotification({
        userId: application.job.developerId,
        title: 'Screenshot uploaded — ready to review',
        body: `A tester uploaded their opt-in screenshot for "${application.job.appName}". Review it to verify their access.`,
        url: `/dashboard/jobs/${application.job.id}`,
        type: 'screenshot_uploaded',
      })
    } catch (notifyError) {
      console.error('Failed to notify developer of screenshot upload:', notifyError)
    }

    return NextResponse.json({
      success: true,
      application: updatedApplication,
      message: 'Screenshots submitted successfully. The developer will review them shortly.',
    })
  } catch (error) {
    console.error('Upload verification error:', error)
    return NextResponse.json(
      { error: 'Failed to upload verification' },
      { status: 500 }
    )
  }
}
