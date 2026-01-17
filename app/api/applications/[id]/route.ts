import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { 
  sendApplicationApprovedEmail, 
  sendTestingStartedEmail 
} from '@/lib/email'

// GET - Get single application
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            developer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        tester: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            deviceInfo: true,
          },
        },
        payment: true,
      },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, application })
  } catch (error) {
    console.error('Get application error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    )
  }
}

// PATCH - Update application (approve/reject, verify, etc.)
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

    // Get the application with job details
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: true,
        tester: true,
      },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Check if user is the developer of this job
    if (application.job.developerId !== currentUser.userId && currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    // Handle approval
    if (body.action === 'approve') {
      const updatedApplication = await prisma.application.update({
        where: { id },
        data: {
          status: 'APPROVED',
        },
        include: {
          tester: {
            select: {
              name: true,
              email: true,
            },
          },
          job: true,
        },
      })

      // Send approval email
      try {
        await sendApplicationApprovedEmail(
          application.tester.email,
          {
            testerName: application.tester.name || 'Tester',
            appName: application.job.appName,
            googlePlayLink: application.job.googlePlayLink,
            payment: application.job.paymentPerTester,
          }
        )
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError)
      }

      return NextResponse.json({
        success: true,
        application: updatedApplication,
        message: 'Application approved successfully',
      })
    }

    // Handle rejection
    if (body.action === 'reject') {
      const updatedApplication = await prisma.application.update({
        where: { id },
        data: {
          status: 'REJECTED',
        },
        include: {
          tester: {
            select: {
              name: true,
              email: true,
            },
          },
          job: true,
        },
      })

      return NextResponse.json({
        success: true,
        application: updatedApplication,
        message: 'Application rejected',
      })
    }

    // Handle verification
    if (body.action === 'verify') {
      const now = new Date()
      const testingEndDate = new Date(now)
      testingEndDate.setDate(testingEndDate.getDate() + application.job.testDuration)

      const updatedApplication = await prisma.application.update({
        where: { id },
        data: {
          status: 'TESTING',
          optInVerified: true,
          verifiedAt: now,
          testingStartDate: now,
          testingEndDate,
        },
        include: {
          tester: {
            select: {
              name: true,
              email: true,
            },
          },
          job: true,
        },
      })

      // Send testing started email
      try {
        await sendTestingStartedEmail(
          application.tester.email,
          {
            testerName: application.tester.name || 'Tester',
            appName: application.job.appName,
            endDate: testingEndDate.toLocaleDateString(),
            payment: application.job.paymentPerTester,
          }
        )
      } catch (emailError) {
        console.error('Failed to send testing started email:', emailError)
      }

      return NextResponse.json({
        success: true,
        application: updatedApplication,
        message: 'Opt-in verified. Testing period started.',
      })
    }

    // Handle general updates
    const updatedApplication = await prisma.application.update({
      where: { id },
      data: body,
      include: {
        tester: {
          select: {
            name: true,
            email: true,
          },
        },
        job: true,
      },
    })

    return NextResponse.json({
      success: true,
      application: updatedApplication,
      message: 'Application updated successfully',
    })
  } catch (error) {
    console.error('Update application error:', error)
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    )
  }
}

// DELETE - Delete application
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

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: true,
      },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Check if user is the developer or the tester
    if (
      application.job.developerId !== currentUser.userId &&
      application.testerId !== currentUser.userId &&
      currentUser.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    await prisma.application.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Application deleted successfully',
    })
  } catch (error) {
    console.error('Delete application error:', error)
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    )
  }
}