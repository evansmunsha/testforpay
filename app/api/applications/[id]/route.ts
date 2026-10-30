import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification } from '@/lib/notifications'
import { processPaymentById } from '@/lib/payouts'
import { formatEurFromCents } from '@/lib/currency'
import { recordAdminAction } from '@/lib/admin-audit'
import { passesDeclaredJobScreening } from '@/lib/tester-eligibility'
import { allocateEscrowSlot, platformFeePerTester } from '@/lib/escrow-allocation'
import { sendApplicationApprovedEmail } from '@/lib/email'
import { awardTrainingPoints, submittedAllMissions } from '@/lib/training-points'

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
      let updatedApplication
      try {
        updatedApplication = await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT id FROM "TestingJob" WHERE id = ${application.jobId} FOR UPDATE`
          await tx.$executeRaw`SELECT id FROM "Application" WHERE id = ${id} FOR UPDATE`
          const lockedJob = await tx.testingJob.findUnique({
            where: { id: application.jobId },
            select: {
              status: true,
              isTraining: true,
              testersNeeded: true,
              paymentPerTester: true,
              platformFee: true,
              applications: {
                where: { status: 'TESTING', testingPausedAt: { not: null }, cohortSelected: true },
                select: { id: true },
                take: 1,
              },
            },
          })
          const lockedApplication = await tx.application.findUnique({
            where: { id },
            select: { status: true },
          })
          if (!lockedJob || lockedApplication?.status !== 'PENDING') throw new Error('APPLICATION_STATE_CHANGED')
          if (lockedJob.status !== 'ACTIVE' && !(lockedJob.status === 'IN_PROGRESS' && lockedJob.applications.length > 0)) {
            throw new Error('JOB_NOT_RECRUITING')
          }

          if (!lockedJob.isTraining) {
            // Each approved tester holds one paid slot; there are never more than testersNeeded.
            await allocateEscrowSlot(tx, {
              jobId: application.jobId,
              applicationId: id,
              actorId: currentUser.userId,
              testersNeeded: lockedJob.testersNeeded,
              paymentPerTester: lockedJob.paymentPerTester,
              platformFee: platformFeePerTester(lockedJob.platformFee, lockedJob.testersNeeded),
              reason: 'Reused an unused escrowed tester slot for a newly approved tester before testing started.',
            })
          }

          return tx.application.update({
            where: { id },
            data: {
              status: 'APPROVED',
              screeningPassedAt: eligibleAtApproval ? approvedAt : null,
              // The developer needs the tester's email now to add them in Play Console.
              contactReleasedAt: approvedAt,
              cohortSelected: true,
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
        })
      } catch (approvalError) {
        const approvalErrors: Record<string, { status: number; message: string }> = {
          APPLICATION_STATE_CHANGED: { status: 409, message: 'This application changed. Refresh and try again.' },
          JOB_NOT_RECRUITING: { status: 409, message: 'This job is not recruiting testers right now.' },
          NO_FREE_ESCROW_SLOT: {
            status: 409,
            message: application.job.isTraining
              ? 'All training tester spots are already taken. Close a blocked tester first, then approve this one.'
              : 'All paid tester spots are already taken. Close an approved tester who cannot install the app first, then approve this one.',
          },
          ESCROW_SLOT_CHANGED: { status: 409, message: 'A paid spot changed while approving. Refresh and try again.' },
          PAYMENT_NOT_ESCROWED: { status: 409, message: 'This tester has a payment that is not safely held. Contact support.' },
        }
        const mapped = approvalError instanceof Error ? approvalErrors[approvalError.message] : undefined
        if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
        throw approvalError
      }
      if (currentUser.role === 'ADMIN') {
        await recordAdminAction({ actorId: currentUser.userId, actorEmail: currentUser.email, action: 'approve_application', targetType: 'application', targetId: id, reason: auditReason })
      }
      // Tell the tester to open the Play Store link and upload a screenshot
      try {
        await sendNotification({
          userId: application.testerId,
          title: application.job.isTraining ? 'Training Request Approved! 🎉' : 'Application Approved! 🎉',
          body: application.job.isTraining
            ? `Your request to join training for "${application.job.appName}" is approved. Open the Play Store link in your dashboard and upload a screenshot showing the Install button.`
            : `Your application to test "${application.job.appName}" has been approved. Open the Play Store link in your dashboard and upload a screenshot showing the Install button.`,
          url: '/dashboard/applications',
          type: 'application_approved',
        })
      } catch (notifyError) {
        console.error('Failed to send approval notification:', notifyError)
      }
      if (!application.job.isTraining) {
        try {
          await sendApplicationApprovedEmail(updatedApplication.tester.email, {
            testerName: updatedApplication.tester.name || 'Tester',
            appName: application.job.appName,
            googlePlayLink: application.job.googlePlayLink,
            paymentCents: application.job.paymentPerTester,
          })
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError)
        }
      }

      return NextResponse.json({
        success: true,
        application: updatedApplication,
        message: 'Application approved successfully',
      })
    }

    // Handle rejection (closing an application before testing starts)
    if (body.action === 'reject') {
      if (!['PENDING', 'APPROVED', 'OPTED_IN', 'VERIFIED', 'SCHEDULED'].includes(application.status)) {
        return NextResponse.json(
          { error: 'This application can no longer be closed' },
          { status: 409 }
        )
      }

      let updatedApplication
      try {
        updatedApplication = await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT id FROM "Application" WHERE id = ${id} FOR UPDATE`
          const current = await tx.application.findUnique({
            where: { id },
            select: { status: true, payment: { select: { status: true, transferId: true } } },
          })
          if (!current || !['PENDING', 'APPROVED', 'OPTED_IN', 'VERIFIED', 'SCHEDULED'].includes(current.status)) {
            throw new Error('APPLICATION_STATE_CHANGED')
          }
          // The escrowed payment stays on record so its paid slot can be reused for another tester.
          if (current.payment && (current.payment.status !== 'ESCROWED' || current.payment.transferId)) {
            throw new Error('PAYMENT_NOT_ESCROWED')
          }
          return tx.application.update({
            where: { id },
            data: { status: 'REJECTED', cohortSelected: false },
            include: {
              tester: { select: { name: true } },
              job: true,
              payment: true,
            },
          })
        })
      } catch (rejectError) {
        if (rejectError instanceof Error && rejectError.message === 'APPLICATION_STATE_CHANGED') {
          return NextResponse.json({ error: 'This application changed. Refresh and try again.' }, { status: 409 })
        }
        if (rejectError instanceof Error && rejectError.message === 'PAYMENT_NOT_ESCROWED') {
          return NextResponse.json({ error: 'This tester has a payment that is not safely held. Contact support.' }, { status: 409 })
        }
        throw rejectError
      }
      if (currentUser.role === 'ADMIN') {
        await recordAdminAction({ actorId: currentUser.userId, actorEmail: currentUser.email, action: 'reject_application', targetType: 'application', targetId: id, reason: auditReason })
      }

      // Send push notification to tester
      try {
        await sendNotification({
          userId: application.testerId,
          title: 'Application Update',
          body: `Your application to test "${application.job.appName}" was closed. If you could not install the app, this does not count against you.`,
          url: '/dashboard/applications',
          type: 'application_rejected',
        })
      } catch (notifyError) {
        console.error('Failed to send rejection notification:', notifyError)
      }

      return NextResponse.json({
        success: true,
        application: updatedApplication,
        message: application.job.isTraining
          ? 'Training request closed. The training spot is free for another tester.'
          : 'Application closed. The paid spot is free for another tester.',
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

      let verifiedPointsAwarded = 0
      const updatedApplication = await prisma.$transaction(async (tx) => {
        const updated = await tx.application.update({
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
        if (updated.job.isTraining) {
          // Training testers start on their own, no cohort and no waiting.
          const startAt = now
          const started = await tx.application.update({
            where: { id },
            data: {
              status: 'TESTING',
              testingStartDate: startAt,
              testingEndDate: new Date(startAt.getTime() + updated.job.testDuration * 24 * 60 * 60 * 1000),
              testingPausedAt: null,
              cohortSelected: true,
            },
            include: { tester: { select: { name: true } }, job: true, payment: true },
          })
          const award = await awardTrainingPoints(tx, {
            userId: application.testerId,
            applicationId: application.id,
            kind: 'VERIFIED',
          })
          verifiedPointsAwarded = award.points
          return started
        }
        return updated
      })
      if (currentUser.role === 'ADMIN') {
        await recordAdminAction({ actorId: currentUser.userId, actorEmail: currentUser.email, action: 'verify_application', targetType: 'application', targetId: id, reason: auditReason })
      }

      // Verification is complete — tester joins the ready list; testing starts when the developer clicks Start.
      try {
        await sendNotification({
          userId: application.testerId,
          title: updatedApplication.job.isTraining ? 'Training started 🚀' : 'Opt-in verified ✅',
          body: updatedApplication.job.isTraining
            ? `You are verified for "${application.job.appName}". Your training starts now. Open your daily mission.`
            : `Your screenshot for "${application.job.appName}" has been verified. You are on the ready list — the developer will start testing once enough testers are verified.`,
          url: updatedApplication.job.isTraining ? '/dashboard/tasks' : '/dashboard/applications',
          type: 'verification_approved',
        })
      } catch (notifyError) {
        console.error('Failed to send verification notification:', notifyError)
      }

      // Tell the tester the group chat is open to them.
      try {
        await sendNotification({
          userId: application.testerId,
          title: 'Join the group chat 💬',
          body: `You are verified for "${application.job.appName}". Tap to join the group chat with the developer and other testers.`,
          url: `/dashboard/group/${application.job.id}`,
          type: 'group_chat_invite',
        })
      } catch (notifyError) {
        console.error('Failed to send group chat invite:', notifyError)
      }

      // Notify developer that one more tester is verified
      try {
        await sendNotification({
          userId: application.job.developerId,
          title: 'Tester Verified! 🎯',
          body: `${application.tester.name || 'A tester'} is verified for "${application.job.appName}". Check if you have enough to start testing.`,
          url: `/dashboard/jobs/${application.job.id}`,
          type: 'tester_verified',
        })
      } catch (notifyError) {
        console.error('Failed to notify developer of verification:', notifyError)
      }

      return NextResponse.json({
        success: true,
        application: updatedApplication,
        message: updatedApplication.job.isTraining && verifiedPointsAwarded > 0
          ? `Opt-in verified. Training started right away and the tester earned ${verifiedPointsAwarded} training points.`
          : 'Opt-in verified. The tester is on the ready list.',
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

      let completedTrainingPoints = 0
      if (updatedApplication.job.isTraining) {
        try {
          const award = await prisma.$transaction(async (tx) => {
            const allDone = await submittedAllMissions(tx, {
              jobId: updatedApplication.jobId,
              testerId: updatedApplication.testerId,
              testDuration: updatedApplication.job.testDuration,
            })
            if (!allDone) return { awarded: false, points: 0 }
            return awardTrainingPoints(tx, {
              userId: updatedApplication.testerId,
              applicationId: updatedApplication.id,
              kind: 'COMPLETED',
            })
          })
          completedTrainingPoints = award.points
        } catch (trainingError) {
          console.error('⚠️ Failed to award training points on completion:', trainingError)
        }
      } else if (!updatedApplication.payment) {
        console.warn('⚠️ No payment record found for completed application:', id)
      } else {
        // Move escrowed payment into PROCESSING (ready for payout)
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
        message: updatedApplication.job.isTraining
          ? completedTrainingPoints > 0
            ? `Training completed. ${completedTrainingPoints} training points awarded.`
            : 'Training completed. No completion points because some daily missions were not submitted.'
          : 'Application marked as completed. Payment will be processed soon.',
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
