import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification, NotificationTemplates } from '@/lib/notifications'
import { processPaymentById } from '@/lib/payouts'
import { 
  sendApplicationApprovedEmail, 
  sendTestingStartedEmail 
} from '@/lib/email'
import { formatEurFromCents } from '@/lib/currency'

// GET - Get single application
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

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            id: true,
            appName: true,
            developerId: true,
            googlePlayLink: true,
            developer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        tester: {
          select: {
            id: true,
            name: true,
            createdAt: true,
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

    const isOwner =
      currentUser.role === 'ADMIN' ||
      application.tester.id === currentUser.userId ||
      application.job.developerId === currentUser.userId

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const canSeePii =
      currentUser.role === 'ADMIN' ||
      application.job.developerId === currentUser.userId
    const isTesterSelf = application.tester.id === currentUser.userId

    if (canSeePii) {
      const full = await prisma.application.findUnique({
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

      return NextResponse.json({ success: true, application: full })
    }

    if (isTesterSelf) {
      const self = await prisma.application.findUnique({
        where: { id },
        include: {
          job: {
            select: {
              id: true,
              appName: true,
              developerId: true,
              googlePlayLink: true,
              developer: {
                select: {
                  id: true,
                  name: true,
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
            },
          },
          payment: true,
        },
      })

      return NextResponse.json({ success: true, application: self })
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
      if (application.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Only pending applications can be approved' },
          { status: 409 }
        )
      }
      const platformFeePerTester = Math.round(application.job.platformFee / application.job.testersNeeded)
      const totalPaymentAmount = application.job.paymentPerTester + platformFeePerTester
      const updatedApplication = await prisma.$transaction(async (tx) => {
        const updated = await tx.application.update({
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
        const existingPayment = await tx.payment.findUnique({
          where: { applicationId: updated.id },
          select: { id: true },
        })
        if (existingPayment) {
          throw new Error('PAYMENT_ALREADY_EXISTS')
        }
        const payment = await tx.payment.create({
          data: {
            applicationId: updated.id,
            jobId: updated.job.id,
            amount: application.job.paymentPerTester,
            platformFee: platformFeePerTester,
            totalAmount: totalPaymentAmount,
            status: 'ESCROWED',
            escrowedAt: new Date(),
          },
        })
        console.log('Payment record created:', payment.id, 'for application:', id)
        return updated
      })
      // Send approval email
      try {
        const testerPaymentCents = application.job.paymentPerTester
        await sendApplicationApprovedEmail(
          application.tester.email,
          {
            testerName: application.tester.name || 'Tester',
            appName: application.job.appName,
            googlePlayLink: application.job.googlePlayLink,
            paymentCents: testerPaymentCents,
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
          url: '/dashboard/applications',
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
      if (!['PENDING', 'APPROVED'].includes(application.status)) {
        return NextResponse.json(
          { error: 'This application can no longer be rejected' },
          { status: 409 }
        )
      }

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
          url: '/dashboard/applications',
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
      if (application.status !== 'OPTED_IN') {
        return NextResponse.json(
          { error: 'Only opted-in applications can be verified' },
          { status: 409 }
        )
      }

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

      // Send testing started email
      try {
        const testerPaymentCents = application.job.paymentPerTester
        await sendTestingStartedEmail(
          application.tester.email,
          {
            testerName: application.tester.name || 'Tester',
            appName: application.job.appName,
            endDate: testingEndDate.toLocaleDateString(),
            paymentCents: testerPaymentCents,
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
          url: '/dashboard/applications',
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
      if (application.status !== 'TESTING') {
        return NextResponse.json(
          { error: 'Only testing applications can be completed' },
          { status: 409 }
        )
      }

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

      // Move escrowed payment into PROCESSING (ready for payout)
      if (!updatedApplication.payment) {
        console.warn('⚠️ No payment record found for completed application:', id)
      } else {
        try {
          const moved = await prisma.payment.updateMany({
            where: {
              id: updatedApplication.payment.id,
              status: 'ESCROWED',
              transferId: null,
            },
            data: { status: 'PROCESSING' },
          })

          if (moved.count === 0) {
            const fresh = await prisma.payment.findUnique({
              where: { id: updatedApplication.payment.id },
              select: { status: true, transferId: true },
            })
            console.warn('⚠️ Skipping payout transition:', {
              paymentId: updatedApplication.payment.id,
              status: fresh?.status,
              transferId: fresh?.transferId,
            })
          } else {
            const payoutResult = await processPaymentById(updatedApplication.payment.id)
            if (payoutResult?.status === 'failed') {
              console.warn('⚠️ Immediate payout attempt failed:', payoutResult.error)
            }
          }
        } catch (payoutError) {
          console.error('⚠️ Immediate payout attempt threw an error:', payoutError)
        }
      }

      // Update tester reputation stats based on their completed applications
      try {
        const completedApps = await prisma.application.findMany({
          where: {
            testerId: updatedApplication.testerId,
            status: 'COMPLETED',
          },
          include: {
            payment: true,
          },
        })

        const totalTestsCompleted = completedApps.length
        const totalEarnings = completedApps.reduce((sum, app) => sum + (app.payment?.amount || 0), 0)
        const avgEngagementScore =
          totalTestsCompleted > 0
            ? completedApps.reduce((sum, app) => sum + (app.engagementScore || 0), 0) / totalTestsCompleted
            : 0

        const withRatings = completedApps.filter(app => app.rating && app.rating > 0)
        const avgRating =
          withRatings.length > 0
            ? withRatings.reduce((sum, app) => sum + (app.rating || 0), 0) / withRatings.length
            : 0

        await prisma.user.update({
          where: { id: updatedApplication.testerId },
          data: {
            totalTestsCompleted,
            totalEarnings,
            averageEngagementScore: Math.round(avgEngagementScore * 100) / 100,
            averageRating: Math.round(avgRating * 100) / 100,
          },
        })

        console.log(`✅ Updated reputation for tester ${updatedApplication.testerId}: ${totalTestsCompleted} tests, ${formatEurFromCents(totalEarnings)}`)
      } catch (repError) {
        console.error('⚠️ Failed to update tester reputation:', repError)
      }

      return NextResponse.json({
        success: true,
        application: updatedApplication,
        message: 'Application marked as completed. Payment will be processed soon.',
      })
    }
    return NextResponse.json(
      { error: 'Invalid application action' },
      { status: 400 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYMENT_ALREADY_EXISTS') {
      return NextResponse.json(
        { error: 'Payment already exists for this application' },
        { status: 409 }
      )
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Payment already exists for this application' },
        { status: 409 }
      )
    }

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


