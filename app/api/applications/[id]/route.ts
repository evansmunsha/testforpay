import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification, NotificationTemplates } from '@/lib/notifications'
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

      // Create Payment record for escrow
      // Calculate platform fee share for this tester
      const platformFeePerTester = application.job.platformFee / application.job.testersNeeded
      const totalPaymentAmount = application.job.paymentPerTester + platformFeePerTester

      try {
        const payment = await prisma.payment.create({
          data: {
            applicationId: updatedApplication.id,
            jobId: updatedApplication.job.id,
            amount: application.job.paymentPerTester,
            platformFee: platformFeePerTester,
            totalAmount: totalPaymentAmount,
            status: 'ESCROWED', // Funds already escrowed from developer payment
            escrowedAt: new Date(),
          },
        })
        console.log('✅ Payment record created:', payment.id, 'for application:', id)
      } catch (paymentError) {
        console.error('Failed to create payment record:', paymentError)
        // Don't fail the approval if payment record creation fails, but log it
      }

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

      // Send push notification to tester
      try {
        await sendNotification({
          userId: application.testerId,
          title: 'Application Approved! 🎉',
          body: `Your application to test "${application.job.appName}" has been approved. Start testing now!`,
          url: `/dashboard/applications/${id}`,
          type: 'application_approved',
        })
      } catch (notifyError) {
        console.error('Failed to send approval notification:', notifyError)
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
          payment: true,
        },
      })

      // Delete payment record if it exists (refund the escrow by not marking it as PROCESSING)
      if (updatedApplication.payment) {
        try {
          await prisma.payment.delete({
            where: { id: updatedApplication.payment.id },
          })
          console.log('💰 Payment record deleted (refunded) for rejected application:', id)
        } catch (paymentError) {
          console.error('Failed to delete payment record on rejection:', paymentError)
        }
      }

      // Send push notification to tester
      try {
        await sendNotification({
          userId: application.testerId,
          title: 'Application Update',
          body: `Your application to test "${application.job.appName}" was not approved this time.`,
          url: `/dashboard/applications/${id}`,
          type: 'application_rejected',
        })
      } catch (notifyError) {
        console.error('Failed to send rejection notification:', notifyError)
      }

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
          payment: true,
        },
      })

      // Update payment status to PROCESSING (testing has started)
      if (updatedApplication.payment) {
        try {
          await prisma.payment.update({
            where: { id: updatedApplication.payment.id },
            data: {
              status: 'PROCESSING',
            },
          })
          console.log('💰 Payment status updated to PROCESSING for application:', id)
        } catch (paymentError) {
          console.error('Failed to update payment status on verification:', paymentError)
        }
      }

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

      // Send push notification to tester
      try {
        await sendNotification({
          userId: application.testerId,
          title: 'Verification Approved! ✅',
          body: `Your screenshot for "${application.job.appName}" has been verified. Testing period has started!`,
          url: `/dashboard/applications/${id}`,
          type: 'verification_approved',
        })
      } catch (notifyError) {
        console.error('Failed to send verification notification:', notifyError)
      }

      // Send notification to developer that verification is done
      try {
        await sendNotification({
          userId: application.job.developerId,
          title: 'Tester Verified! 🎯',
          body: `${application.tester.name || 'A tester'} verified and started testing "${application.job.appName}".`,
          url: `/dashboard/jobs/${application.job.id}`,
          type: 'tester_verified',
        })
      } catch (notifyError) {
        console.error('Failed to notify developer of verification:', notifyError)
      }

      return NextResponse.json({
        success: true,
        application: updatedApplication,
        message: 'Opt-in verified. Testing period started.',
      })
    }

    // Handle completion (when testing period ends)
    if (body.action === 'complete') {
      const updatedApplication = await prisma.application.update({
        where: { id },
        data: {
          status: 'COMPLETED',
        },
        include: {
          tester: {
            select: {
              name: true,
              email: true,
            },
          },
          job: true,
          payment: true,
        },
      })

      // Payment should already exist and be in PROCESSING status
      // It will be picked up by the cron job for actual payout
      if (!updatedApplication.payment) {
        console.warn('⚠️ No payment record found for completed application:', id)
      }

      return NextResponse.json({
        success: true,
        application: updatedApplication,
        message: 'Application marked as completed. Payment will be processed soon.',
      })
    }
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