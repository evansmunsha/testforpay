import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification } from '@/lib/notifications'
import { processPaymentById } from '@/lib/payouts'
import { formatEurFromCents } from '@/lib/currency'
import { recordAdminAction } from '@/lib/admin-audit'
import { passesDeclaredJobScreening } from '@/lib/tester-eligibility'

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

    const isTesterSelf = application.tester.id === currentUser.userId

    if (currentUser.role === 'ADMIN') {
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

    if (application.job.developerId === currentUser.userId) {
      const developerView = await prisma.application.findUnique({
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
              createdAt: true,
              deviceInfo: true,
            },
          },
          payment: true,
        },
      })

      return NextResponse.json({ success: true, application: developerView })
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
    const auditedAdminActions = ['approve', 'reject', 'verify', 'complete']
    let auditReason = ''
    if (currentUser.role === 'ADMIN' && auditedAdminActions.includes(body.action)) {
      auditReason = typeof body.reason === 'string' ? body.reason.trim() : ''
      if (auditReason.length < 10) {
        return NextResponse.json({ error: 'Provide an admin reason of at least 10 characters' }, { status: 400 })
      }
    }

    // Get the application with job details
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: true,
        tester: {
          include: { deviceInfo: true },
        },
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
      const hasOpenIssue = await prisma.applicationIssueReport.findFirst({
        where: { applicationId: id, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
        select: { id: true },
      })
      const eligibleAtApproval = !hasOpenIssue && passesDeclaredJobScreening({
        testerCountryCode: application.tester.countryCode,
        testerAndroidVersion: application.tester.deviceInfo?.androidVersion,
        supportedCountries: application.job.supportedCountries,
        minimumAndroidVersion: application.job.minAndroidVersion,
      })
      const approvedAt = new Date()
      const updatedApplication = await prisma.application.update({
        where: { id },
        data: {
          status: 'APPROVED',
          screeningPassedAt: eligibleAtApproval ? approvedAt : null,
        },
        include: {
          tester: {
            select: {
              name: true,
            },
          },
          job: true,
        },
      })
      if (currentUser.role === 'ADMIN') {
        await recordAdminAction({ actorId: currentUser.userId, actorEmail: currentUser.email, action: 'approve_application', targetType: 'application', targetId: id, reason: auditReason })
      }
      // Send push notification to tester
      try {
        await sendNotification({
          userId: application.testerId,
          title: 'Application Approved! 🎉',
          body: `Your application to test "${application.job.appName}" has been approved. Wait for the developer to release the selected tester group before joining the Play test.`,
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
            },
          },
          job: true,
          payment: true,
        },
      })
      if (currentUser.role === 'ADMIN') {
        await recordAdminAction({ actorId: currentUser.userId, actorEmail: currentUser.email, action: 'reject_application', targetType: 'application', targetId: id, reason: auditReason })
      }

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

      const updatedApplication = await prisma.application.update({
        where: { id },
        data: {
          status: 'VERIFIED',
          optInVerified: true,
          verifiedAt: now,
        },
        include: {
          tester: {
            select: {
              name: true,
            },
          },
          job: true,
          payment: true,
        },
      })
      if (currentUser.role === 'ADMIN') {
        await recordAdminAction({ actorId: currentUser.userId, actorEmail: currentUser.email, action: 'verify_application', targetType: 'application', targetId: id, reason: auditReason })
      }

      // Verification is complete, but the testing clock waits for the job schedule.
      try {
        await sendNotification({
          userId: application.testerId,
          title: 'Opt-in verified',
          body: `Your screenshot for "${application.job.appName}" has been verified. The developer will schedule the testing start.`,
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
          body: `${application.tester.name || 'A tester'} completed opt-in verification for "${application.job.appName}".`,
          url: `/dashboard/jobs/${application.job.id}`,
          type: 'tester_verified',
        })
      } catch (notifyError) {
        console.error('Failed to notify developer of verification:', notifyError)
      }

      return NextResponse.json({
        success: true,
        application: updatedApplication,
        message: 'Opt-in verified. Testing will start at the scheduled time.',
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
      if (application.testingPausedAt) {
        return NextResponse.json(
          { error: 'A paused testing application cannot be completed' },
          { status: 409 }
        )
      }

      const completed = await prisma.application.updateMany({
        where: { id, status: 'TESTING', testingPausedAt: null },
        data: { status: 'COMPLETED' },
      })
      if (completed.count !== 1) {
        return NextResponse.json(
          { error: 'The application changed state or is paused; refresh before completing it' },
          { status: 409 }
        )
      }
      const updatedApplication = await prisma.application.findUnique({
        where: { id },
        include: {
          tester: { select: { name: true } },
          job: true,
          payment: true,
        },
      })
      if (!updatedApplication) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      if (currentUser.role === 'ADMIN') {
        await recordAdminAction({ actorId: currentUser.userId, actorEmail: currentUser.email, action: 'complete_application', targetType: 'application', targetId: id, reason: auditReason })
      }

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
