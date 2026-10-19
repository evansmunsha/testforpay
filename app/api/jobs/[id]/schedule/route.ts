import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification } from '@/lib/notifications'
import { passesDeclaredJobScreening } from '@/lib/tester-eligibility'
import { z } from 'zod'

const scheduleSchema = z.object({
  scheduledStartAt: z.string().datetime(),
  resumePausedApplications: z.boolean().optional(),
  resumeReason: z.string().trim().min(10).max(1000).optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const parsed = scheduleSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid schedule' }, { status: 400 })
    }
    const { scheduledStartAt: scheduleValue, resumePausedApplications, resumeReason } = parsed.data
    const scheduledStartAt = new Date(scheduleValue)
    if (!Number.isFinite(scheduledStartAt.getTime()) || scheduledStartAt <= new Date()) {
      return NextResponse.json({ error: 'Choose a future start date and time' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "TestingJob" WHERE id = ${id} FOR UPDATE`
      await tx.$executeRaw`SELECT id FROM "Application" WHERE "jobId" = ${id} AND "cohortSelected" = true ORDER BY id FOR UPDATE`
      const job = await tx.testingJob.findUnique({
        where: { id },
        select: {
          id: true,
          developerId: true,
          appName: true,
          testersNeeded: true,
          testDuration: true,
          status: true,
          scheduledStartAt: true,
          supportedCountries: true,
          minAndroidVersion: true,
          applications: {
            where: {
              cohortSelected: true,
              OR: [
                { status: { in: ['VERIFIED', 'SCHEDULED'] } },
                { status: 'TESTING', testingPausedAt: { not: null } },
              ],
            },
            select: {
              id: true,
              testerId: true,
              status: true,
              optInVerified: true,
              testingPausedAt: true,
              testingStartDate: true,
              testingEndDate: true,
              tester: {
                select: {
                  countryCode: true,
                  deviceInfo: { select: { androidVersion: true } },
                },
              },
              issueReports: {
                where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
                select: { id: true },
              },
              pauseHistory: {
                where: { resumedAt: null },
                select: { id: true },
              },
              payment: { select: { status: true, transferId: true } },
            },
          },
        },
      })
      if (!job) throw new Error('JOB_NOT_FOUND')
      if (user.role !== 'ADMIN' && job.developerId !== user.userId) throw new Error('FORBIDDEN')
      if (!['ACTIVE', 'IN_PROGRESS'].includes(job.status)) throw new Error('JOB_NOT_ACTIVE')
      const pausedApplications = job.applications.filter((application) => application.testingPausedAt !== null)
      const activeTestingCount = await tx.application.count({
        where: { jobId: id, status: 'TESTING', testingPausedAt: null },
      })
      if (activeTestingCount > 0) throw new Error('ACTIVE_TESTERS_MUST_BE_PAUSED')
      const completedSelectedCount = await tx.application.count({
        where: { jobId: id, cohortSelected: true, status: 'COMPLETED' },
      })
      if (completedSelectedCount > 0) throw new Error('COMPLETED_COHORT_RECONCILIATION_REQUIRED')
      if (job.status === 'IN_PROGRESS' && pausedApplications.length === 0) {
        throw new Error('NO_PAUSED_TESTER')
      }
      if (pausedApplications.length > 0 && (!resumePausedApplications || !resumeReason)) {
        throw new Error('RESUME_DECISION_REQUIRED')
      }
      if (job.supportedCountries.length === 0) throw new Error('COUNTRIES_REQUIRED')
      if (job.applications.length !== job.testersNeeded) throw new Error('COHORT_INCOMPLETE')
      if (job.applications.some((application) =>
        application.payment?.status !== 'ESCROWED' ||
        application.payment.transferId !== null
      )) {
        throw new Error('COHORT_PAYMENT_NOT_ESCROWED')
      }
      const cohortReady = job.applications.every((application) =>
        (
          ['VERIFIED', 'SCHEDULED'].includes(application.status) ||
          (application.status === 'TESTING' && application.testingPausedAt !== null)
        ) &&
        application.optInVerified &&
        application.issueReports.length === 0 &&
        (application.status !== 'TESTING' || application.pauseHistory.length === 1) &&
        passesDeclaredJobScreening({
          testerCountryCode: application.tester.countryCode,
          testerAndroidVersion: application.tester.deviceInfo?.androidVersion,
          supportedCountries: job.supportedCountries,
          minimumAndroidVersion: job.minAndroidVersion,
        })
      )
      if (!cohortReady) throw new Error('COHORT_NOT_VERIFIED')

      const endAt = new Date(scheduledStartAt.getTime() + job.testDuration * 24 * 60 * 60 * 1000)
      await tx.testingJob.update({
        where: { id },
        data: { scheduledStartAt },
      })
      await tx.application.updateMany({
        where: {
          jobId: id,
          cohortSelected: true,
          status: { in: ['VERIFIED', 'SCHEDULED'] },
          testingPausedAt: null,
        },
        data: {
          status: 'SCHEDULED',
          testingStartDate: scheduledStartAt,
          testingEndDate: endAt,
        },
      })
      for (const application of pausedApplications) {
        const updatedPause = await tx.applicationPause.updateMany({
          where: { id: application.pauseHistory[0].id, resumedAt: null },
          data: {
            resumeScheduledAt: scheduledStartAt,
            resumeReason,
            resumeInitiatedById: user.userId,
          },
        })
        if (updatedPause.count !== 1) throw new Error('PAUSE_STATE_CHANGED')
      }
      return {
        appName: job.appName,
        testDuration: job.testDuration,
        testerIds: job.applications.map((application) => application.testerId),
        resumesPausedTesters: pausedApplications.length > 0,
      }
    })

    const startText = scheduledStartAt.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'
    const notificationResults = await Promise.allSettled(result.testerIds.map((userId) =>
      sendNotification({
        userId,
        title: 'Testing start scheduled',
        body: result.resumesPausedTesters
          ? `Testing "${result.appName}" starts ${startText}. Your saved progress is preserved; the previously paused tester resumes only their remaining duration.`
          : `Testing "${result.appName}" starts ${startText}. Your ${result.testDuration}-day testing period begins then.`,
        url: '/dashboard/applications',
        type: 'testing_scheduled',
      })
    ))
    notificationResults.forEach((notificationResult) => {
      if (notificationResult.status === 'rejected') {
        console.error('Failed to notify tester about scheduled start:', notificationResult.reason)
      }
    })
    return NextResponse.json({ success: true, scheduledStartAt, message: 'Testing start scheduled for the selected cohort.' })
  } catch (error) {
    if (error instanceof Error) {
      const known: Record<string, { status: number; message: string }> = {
        JOB_NOT_FOUND: { status: 404, message: 'Job not found' },
        FORBIDDEN: { status: 403, message: 'Forbidden' },
        JOB_NOT_ACTIVE: { status: 409, message: 'This job is no longer accepting a schedule' },
        ACTIVE_TESTERS_MUST_BE_PAUSED: { status: 409, message: 'Pause every currently active tester before rescheduling a synchronized cohort start' },
        COMPLETED_COHORT_RECONCILIATION_REQUIRED: {
          status: 409,
          message: 'A selected tester has already completed testing. Reconcile the completed tester and payment before scheduling another cohort; no payment was changed.',
        },
        NO_PAUSED_TESTER: { status: 409, message: 'An in-progress job can only schedule a replacement cohort while a selected tester is paused' },
        RESUME_DECISION_REQUIRED: { status: 400, message: 'Explicitly authorize resuming the paused tester with saved remaining duration and provide a reason' },
        PAUSE_STATE_CHANGED: { status: 409, message: 'The pause state changed; refresh and schedule again' },
        COUNTRIES_REQUIRED: { status: 400, message: 'Declare supported country codes before scheduling' },
        COHORT_INCOMPLETE: { status: 409, message: 'Release a complete tester cohort before scheduling' },
        COHORT_NOT_VERIFIED: { status: 409, message: 'Every selected tester must have verified opt-in proof and pass checks before scheduling' },
        COHORT_PAYMENT_NOT_ESCROWED: { status: 409, message: 'Every selected tester must have an intact escrowed payment with no transfer before scheduling' },
      }
      if (known[error.message]) {
        return NextResponse.json({ error: known[error.message].message }, { status: known[error.message].status })
      }
    }
    console.error('Schedule testing start error:', error)
    return NextResponse.json({ error: 'Failed to schedule testing start' }, { status: 500 })
  }
}
