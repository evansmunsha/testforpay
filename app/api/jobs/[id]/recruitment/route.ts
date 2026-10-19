import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { passesDeclaredJobScreening } from '@/lib/tester-eligibility'
import { sendApplicationApprovedEmail } from '@/lib/email'
import { sendNotification } from '@/lib/notifications'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const job = await prisma.testingJob.findUnique({
      where: { id },
      select: {
        developerId: true,
        testersNeeded: true,
        supportedCountries: true,
        minAndroidVersion: true,
        scheduledStartAt: true,
        applications: {
          where: {
            OR: [
              { status: { in: ['APPROVED', 'OPTED_IN', 'VERIFIED', 'SCHEDULED'] } },
              { status: 'TESTING', testingPausedAt: { not: null }, cohortSelected: true },
            ],
          },
          select: {
            id: true,
            status: true,
            cohortSelected: true,
            contactReleasedAt: true,
            testingPausedAt: true,
            payment: { select: { status: true, transferId: true } },
            tester: {
              select: {
                id: true,
                name: true,
                email: true,
                countryCode: true,
                deviceInfo: { select: { androidVersion: true } },
              },
            },
            issueReports: {
              where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
              select: { id: true },
            },
          },
        },
      },
    })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    if (user.role !== 'ADMIN' && job.developerId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const eligible = job.applications.filter((application) =>
      application.issueReports.length === 0 &&
      (!application.payment || (application.payment.status === 'ESCROWED' && !application.payment.transferId)) &&
      (application.status !== 'TESTING' || (application.testingPausedAt !== null && application.cohortSelected)) &&
      passesDeclaredJobScreening({
        testerCountryCode: application.tester.countryCode,
        testerAndroidVersion: application.tester.deviceInfo?.androidVersion,
        supportedCountries: job.supportedCountries,
        minimumAndroidVersion: job.minAndroidVersion,
      })
    )
    return NextResponse.json({
      required: job.testersNeeded,
      eligible: eligible.length,
      selected: eligible.filter((application) => application.cohortSelected).length,
      paused: eligible.filter((application) => application.status === 'TESTING' && application.testingPausedAt !== null).length,
      contactReleased: eligible.some((application) => application.contactReleasedAt !== null),
      canSchedule: eligible.length >= job.testersNeeded &&
        eligible.filter((application) => application.cohortSelected).length >= job.testersNeeded &&
        eligible.filter((application) =>
          application.cohortSelected &&
          (application.status === 'VERIFIED' || (application.status === 'TESTING' && application.testingPausedAt !== null))
        ).length >= job.testersNeeded,
      supportedCountries: job.supportedCountries,
      scheduledStartAt: job.scheduledStartAt,
    })
  } catch (error) {
    console.error('Get recruitment progress error:', error)
    return NextResponse.json({ error: 'Failed to load recruitment progress' }, { status: 500 })
  }
}

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "TestingJob" WHERE id = ${id} FOR UPDATE`
      const job = await tx.testingJob.findUnique({
        where: { id },
        select: {
          developerId: true,
          status: true,
          appName: true,
          googlePlayLink: true,
          testersNeeded: true,
          paymentPerTester: true,
          platformFee: true,
          supportedCountries: true,
          minAndroidVersion: true,
          scheduledStartAt: true,
          applications: {
            where: {
              OR: [
                { status: { in: ['APPROVED', 'OPTED_IN', 'VERIFIED', 'SCHEDULED'] } },
                { status: 'TESTING', testingPausedAt: { not: null }, cohortSelected: true },
              ],
            },
            orderBy: [
              { cohortSelected: 'desc' },
              { screeningPassedAt: { sort: 'asc', nulls: 'last' } },
              { createdAt: 'asc' },
            ],
            select: {
              id: true,
              status: true,
              cohortSelected: true,
              screeningPassedAt: true,
              testingPausedAt: true,
              payment: { select: { status: true, transferId: true } },
              tester: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  countryCode: true,
                  deviceInfo: { select: { androidVersion: true } },
                },
              },
              issueReports: {
                where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
                select: { id: true },
              },
            },
          },
        },
      })
      if (!job) throw new Error('JOB_NOT_FOUND')
      if (user.role !== 'ADMIN' && job.developerId !== user.userId) throw new Error('FORBIDDEN')
      const pausedSelected = job.applications.filter((application) =>
        application.status === 'TESTING' &&
        application.testingPausedAt !== null &&
        application.cohortSelected
      )
      if (job.status !== 'ACTIVE' && !(job.status === 'IN_PROGRESS' && pausedSelected.length > 0)) {
        throw new Error('JOB_NOT_ACTIVE')
      }
      const activeTestingCount = await tx.application.count({
        where: { jobId: id, status: 'TESTING', testingPausedAt: null },
      })
      if (activeTestingCount > 0) throw new Error('ACTIVE_TESTERS_MUST_BE_PAUSED')
      const completedSelectedCount = await tx.application.count({
        where: { jobId: id, cohortSelected: true, status: 'COMPLETED' },
      })
      if (completedSelectedCount > 0) throw new Error('COMPLETED_COHORT_RECONCILIATION_REQUIRED')
      const reportedIssues = await tx.applicationIssueReport.count({
        where: { jobId: id, status: { in: ['OPEN', 'UNDER_REVIEW', 'INCOMPATIBLE'] } },
      })
      if (job.scheduledStartAt && job.scheduledStartAt > new Date() && reportedIssues === 0) {
        throw new Error('ALREADY_SCHEDULED')
      }
      if (job.supportedCountries.length === 0) throw new Error('COUNTRIES_REQUIRED')

      const eligible = job.applications.filter((application) =>
        application.issueReports.length === 0 &&
        (!application.payment || (application.payment.status === 'ESCROWED' && !application.payment.transferId)) &&
        (application.status !== 'TESTING' || (application.testingPausedAt !== null && application.cohortSelected)) &&
        passesDeclaredJobScreening({
          testerCountryCode: application.tester.countryCode,
          testerAndroidVersion: application.tester.deviceInfo?.androidVersion,
          supportedCountries: job.supportedCountries,
          minimumAndroidVersion: job.minAndroidVersion,
        })
      )
      if (eligible.length < job.testersNeeded) {
        return {
          eligible: eligible.length,
          required: job.testersNeeded,
          selected: [] as Array<{ id: string; name: string | null; email: string; testerId: string; status: string }>,
          appName: job.appName,
          googlePlayLink: job.googlePlayLink,
          paymentPerTester: job.paymentPerTester,
        }
      }

      const preservedPaused = eligible.filter((application) =>
        application.status === 'TESTING' &&
        application.testingPausedAt !== null &&
        application.cohortSelected
      )
      const selectable = eligible.filter((application) => application.status !== 'TESTING')
      const selectedApplications = [
        ...preservedPaused,
        ...selectable.slice(0, Math.max(0, job.testersNeeded - preservedPaused.length)),
      ]
      if (selectedApplications.length < job.testersNeeded) {
        return {
          eligible: eligible.length,
          required: job.testersNeeded,
          selected: [] as Array<{ id: string; name: string | null; email: string; testerId: string; status: string }>,
          appName: job.appName,
          googlePlayLink: job.googlePlayLink,
          paymentPerTester: job.paymentPerTester,
        }
      }
      const selected = selectedApplications.map((application) => application.id)
      const now = new Date()
      if (job.scheduledStartAt) {
        await tx.application.updateMany({
          where: { jobId: id, cohortSelected: true, status: 'SCHEDULED' },
          data: { status: 'VERIFIED', testingStartDate: null, testingEndDate: null },
        })
        await tx.testingJob.update({
          where: { id },
          data: { scheduledStartAt: null },
        })
      }
      const previousSelected = await tx.application.findMany({
        where: {
          jobId: id,
          cohortSelected: true,
          id: { notIn: selected },
          status: { notIn: ['TESTING', 'COMPLETED'] },
        },
        select: {
          id: true,
          payment: { select: { status: true } },
        },
      })
      if (previousSelected.some((application) => application.payment && application.payment.status !== 'REFUNDED')) {
        throw new Error('COHORT_PAYMENT_RECONCILIATION_REQUIRED')
      }
      const vacantEscrowSlots = await tx.payment.findMany({
        where: {
          jobId: id,
          status: 'ESCROWED',
          transferId: null,
          application: {
            status: 'INELIGIBLE',
            cohortSelected: false,
            issueReports: { some: { status: 'INCOMPATIBLE' } },
          },
        },
        select: {
          id: true,
          applicationId: true,
          application: {
            select: {
              issueReports: {
                where: { status: 'INCOMPATIBLE' },
                orderBy: { resolvedAt: 'desc' },
                take: 1,
                select: { id: true, category: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      })
      await tx.application.updateMany({
        where: {
          jobId: id,
          cohortSelected: true,
          id: { notIn: selected },
          status: { notIn: ['TESTING', 'COMPLETED'] },
        },
        data: {
          cohortSelected: false,
          ...(job.scheduledStartAt ? { status: 'VERIFIED', testingStartDate: null, testingEndDate: null } : {}),
        },
      })
      if (job.scheduledStartAt) {
        await tx.testingJob.update({ where: { id }, data: { scheduledStartAt: null } })
      }
      await tx.application.updateMany({
        where: { id: { in: selected } },
        data: {
          cohortSelected: true,
          contactReleasedAt: now,
        },
      })
      const platformFeePerTester = Math.round(job.platformFee / job.testersNeeded)
      let vacantSlotIndex = 0
      for (const application of selectedApplications) {
        const existingPayment = await tx.payment.findUnique({
          where: { applicationId: application.id },
          select: { id: true, status: true, transferId: true },
        })
        if (!existingPayment) {
          const vacantSlot = vacantEscrowSlots[vacantSlotIndex]
          if (vacantSlot) {
            const issue = vacantSlot.application.issueReports[0]
            const reassigned = await tx.payment.updateMany({
              where: {
                id: vacantSlot.id,
                applicationId: vacantSlot.applicationId,
                jobId: id,
                status: 'ESCROWED',
                transferId: null,
              },
              data: { applicationId: application.id },
            })
            if (reassigned.count !== 1 || !issue) throw new Error('ESCROW_SLOT_CHANGED')
            await tx.paymentAllocationHistory.create({
              data: {
                paymentId: vacantSlot.id,
                jobId: id,
                fromApplicationId: vacantSlot.applicationId,
                toApplicationId: application.id,
                actorId: user.userId,
                reason: `Reassigned the escrowed tester slot after confirmed ${issue.category.toLowerCase().replaceAll('_', ' ')} (issue report ${issue.id}).`,
              },
            })
            vacantSlotIndex += 1
          } else {
            await tx.payment.create({
              data: {
                applicationId: application.id,
                jobId: id,
                amount: job.paymentPerTester,
                platformFee: platformFeePerTester,
                totalAmount: job.paymentPerTester + platformFeePerTester,
                status: 'ESCROWED',
                escrowedAt: now,
              },
            })
          }
        }
      }
      return {
        eligible: eligible.length,
        required: job.testersNeeded,
        selected: selectedApplications.map((application) => ({
          id: application.id,
          name: application.tester.name,
          email: application.tester.email,
          testerId: application.tester.id,
          status: application.status,
        })),
        appName: job.appName,
        googlePlayLink: job.googlePlayLink,
        paymentPerTester: job.paymentPerTester,
      }
    })

    if (result.selected.length > 0) {
      const releaseResults = await Promise.allSettled(result.selected.map(async (tester) => {
        if (tester.status === 'APPROVED') {
          await sendApplicationApprovedEmail(tester.email, {
            testerName: tester.name || 'Tester',
            appName: result.appName,
            googlePlayLink: result.googlePlayLink,
            paymentCents: result.paymentPerTester,
          })
        }
        await sendNotification({
          userId: tester.testerId,
          title: 'You are selected for the testing cohort',
          body: `You are selected to test "${result.appName}". Join the Google Play closed test and upload your opt-in proof from your dashboard.`,
          url: '/dashboard/applications',
          type: 'cohort_selected',
        })
      }))
      releaseResults.forEach((releaseResult) => {
        if (releaseResult.status === 'rejected') console.error('Failed to notify selected tester:', releaseResult.reason)
      })
      const failedDeliveries = releaseResults.filter((releaseResult) => releaseResult.status === 'rejected').length
      return NextResponse.json({
        success: true,
        eligible: result.eligible,
        required: result.required,
        selected: result.selected.length,
        message: failedDeliveries === 0
          ? 'The selected tester contact emails are now available in the job dashboard, and testers have been notified.'
          : `The cohort is selected and contacts are available. ${failedDeliveries} tester notification(s) failed; check server logs.`,
      })
    }
    return NextResponse.json({
      success: true,
      eligible: result.eligible,
      required: result.required,
      selected: 0,
      message: 'The required eligible cohort has not been assembled. No tester contact emails were released.',
    })
  } catch (error) {
    if (error instanceof Error) {
      const known: Record<string, { status: number; message: string }> = {
        JOB_NOT_FOUND: { status: 404, message: 'Job not found' },
        FORBIDDEN: { status: 403, message: 'Forbidden' },
        JOB_NOT_ACTIVE: { status: 409, message: 'This job is no longer recruiting' },
        ACTIVE_TESTERS_MUST_BE_PAUSED: { status: 409, message: 'Pause all currently active testers before replacing or rescheduling the cohort' },
        COMPLETED_COHORT_RECONCILIATION_REQUIRED: {
          status: 409,
          message: 'A selected tester has already completed testing. Reconcile the completed tester and payment before recruiting a replacement; no payment was changed.',
        },
        ALREADY_SCHEDULED: { status: 409, message: 'Recruitment is closed after scheduling begins' },
        COUNTRIES_REQUIRED: { status: 400, message: 'Declare supported country codes before releasing tester contacts' },
        COHORT_PAYMENT_RECONCILIATION_REQUIRED: {
          status: 409,
          message: 'A previously selected tester has an existing payment record. Resolve that payment explicitly before replacing the cohort; no payment was changed.',
        },
        ESCROW_SLOT_CHANGED: { status: 409, message: 'The escrowed replacement slot changed during cohort selection; refresh and try again.' },
      }
      if (known[error.message]) {
        return NextResponse.json({ error: known[error.message].message }, { status: known[error.message].status })
      }
    }
    console.error('Assemble tester cohort error:', error)
    return NextResponse.json({ error: 'Failed to assemble tester cohort' }, { status: 500 })
  }
}
