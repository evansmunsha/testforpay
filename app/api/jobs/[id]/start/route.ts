import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification } from '@/lib/notifications'
import { COHORT_BLOCKER_MESSAGES, evaluateCohortReadiness, type CohortBlocker } from '@/lib/cohort-readiness'
import {
  extendTestingEndDate,
  getPauseDurationMs,
  getTestingEndForStartDay,
  isTomorrowOrLater,
  parseTestingStartDate,
  TESTING_DAY_TIMEZONE,
} from '@/lib/mission-clock'

const DAY_IN_MS = 24 * 60 * 60 * 1000

const startSchema = z.object({
  startDate: z.string().optional(),
  resumePausedApplications: z.boolean().optional(),
  reason: z.string().trim().min(10).max(1000).optional(),
})

class CohortNotReadyError extends Error {
  constructor(public blockers: CohortBlocker[]) {
    super('COHORT_NOT_READY')
  }
}

/**
 * POST /api/jobs/[id]/start
 *
 * Starts testing now for the whole verified tester group at once.
 * Approving, opening the Play Store link, uploading proof, or verifying never starts a clock;
 * only this action does, and only when the required number of testers is ready.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rawBody = await request.text()
    let json: unknown = {}
    if (rawBody.trim()) {
      try {
        json = JSON.parse(rawBody)
      } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
      }
    }
    const parsed = startSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'A reason of at least 10 characters is required' }, { status: 400 })
    }
    const { resumePausedApplications, reason } = parsed.data

    // Normal path: pick a start date (tomorrow or later). Starting immediately is only kept for resuming paused testers.
    let startDay: Date | null = null
    if (parsed.data.startDate !== undefined) {
      startDay = parseTestingStartDate(parsed.data.startDate)
      if (!startDay) {
        return NextResponse.json({ error: 'Start date must look like YYYY-MM-DD' }, { status: 400 })
      }
      if (!isTomorrowOrLater(startDay)) {
        return NextResponse.json(
          { error: `The start date must be tomorrow or later (days change at midnight ${TESTING_DAY_TIMEZONE})` },
          { status: 400 }
        )
      }
    } else if (!resumePausedApplications) {
      return NextResponse.json({ error: 'Pick a start date (tomorrow or later)' }, { status: 400 })
    }

    const { id } = await params

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
          startedAt: true,
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
            orderBy: [{ verifiedAt: 'asc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              testerId: true,
              status: true,
              cohortSelected: true,
              optInVerified: true,
              testingPausedAt: true,
              testingEndDate: true,
              tester: {
                select: {
                  countryCode: true,
                  deviceInfo: { select: { androidVersion: true } },
                },
              },
              issueReports: {
                where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'INCOMPATIBLE'] } },
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

      const activeTestingCount = await tx.application.count({
        where: { jobId: id, status: 'TESTING', testingPausedAt: null },
      })
      const completedSelectedCount = await tx.application.count({
        where: { jobId: id, cohortSelected: true, status: 'COMPLETED' },
      })

      const hasPausedTester = job.applications.some((application) => application.testingPausedAt !== null)
      if (job.status !== 'ACTIVE' && !(job.status === 'IN_PROGRESS' && hasPausedTester)) {
        throw new Error('JOB_NOT_ACTIVE')
      }

      const readiness = evaluateCohortReadiness({
        testersNeeded: job.testersNeeded,
        supportedCountries: job.supportedCountries,
        minAndroidVersion: job.minAndroidVersion,
        activeTestingCount,
        completedSelectedCount,
        applications: job.applications.map((application) => ({
          id: application.id,
          status: application.status,
          cohortSelected: application.cohortSelected,
          optInVerified: application.optInVerified,
          testingPausedAt: application.testingPausedAt,
          openIssueCount: application.issueReports.length,
          payment: application.payment,
          tester: {
            countryCode: application.tester.countryCode,
            androidVersion: application.tester.deviceInfo?.androidVersion,
          },
        })),
      })
      if (!readiness.canStart) throw new CohortNotReadyError(readiness.blockers)

      if (startDay && readiness.pausedIds.length > 0) throw new Error('PAUSED_CANNOT_BE_SCHEDULED')
      if (!startDay && readiness.pausedIds.length === 0) throw new Error('START_DATE_REQUIRED')
      if (readiness.pausedIds.length > 0 && (!resumePausedApplications || !reason)) {
        throw new Error('RESUME_DECISION_REQUIRED')
      }
      if (user.role === 'ADMIN' && !reason) throw new Error('ADMIN_REASON_REQUIRED')

      if (startDay) {
        // Day 1 is the chosen date and the last day ends at midnight, so every tester shares the same days.
        const scheduledEnd = getTestingEndForStartDay(startDay, job.testDuration)
        const scheduled = await tx.application.updateMany({
          where: { id: { in: readiness.startingIds }, status: { in: ['VERIFIED', 'SCHEDULED'] } },
          data: { status: 'SCHEDULED', testingStartDate: startDay, testingEndDate: scheduledEnd, testingPausedAt: null },
        })
        if (scheduled.count !== readiness.startingIds.length) throw new Error('START_STATE_CHANGED')

        await tx.application.updateMany({
          where: { jobId: id, status: 'SCHEDULED', id: { notIn: readiness.startingIds } },
          data: { status: 'VERIFIED', testingStartDate: null, testingEndDate: null },
        })
        await tx.testingJob.update({ where: { id }, data: { scheduledStartAt: startDay } })

        if (user.role === 'ADMIN') {
          await tx.$executeRaw`
            INSERT INTO "AdminAuditLog" ("id", "actorId", "actorEmail", "action", "targetType", "targetId", "reason")
            VALUES (${randomUUID()}, ${user.userId}, ${user.email}, ${'schedule_testing'}, ${'job'}, ${id}, ${reason ?? ''})
          `
        }

        return {
          scheduled: true as const,
          appName: job.appName,
          testDuration: job.testDuration,
          startedAt: startDay,
          resumedIds: new Set<string>(),
          testers: job.applications
            .filter((application) => readiness.startingIds.includes(application.id))
            .map((application) => ({ id: application.id, testerId: application.testerId })),
        }
      }

      const now = new Date()
      const endAt = new Date(now.getTime() + job.testDuration * DAY_IN_MS)
      const startingApplications = job.applications.filter((application) => readiness.startingIds.includes(application.id))
      const newStartIds = startingApplications
        .filter((application) => application.status !== 'TESTING')
        .map((application) => application.id)

      const started = await tx.application.updateMany({
        where: { id: { in: newStartIds }, status: { in: ['VERIFIED', 'SCHEDULED'] } },
        data: { status: 'TESTING', testingStartDate: now, testingEndDate: endAt, testingPausedAt: null },
      })
      if (started.count !== newStartIds.length) throw new Error('START_STATE_CHANGED')

      // Resume paused testers with only their saved remaining time.
      for (const application of startingApplications.filter((item) => item.status === 'TESTING')) {
        if (!application.testingPausedAt || !application.testingEndDate || application.pauseHistory.length !== 1) {
          throw new Error('START_STATE_CHANGED')
        }
        const pausedDurationMs = getPauseDurationMs(application.testingPausedAt, now)
        const extendedEnd = pausedDurationMs === null
          ? null
          : extendTestingEndDate(application.testingEndDate, pausedDurationMs)
        if (pausedDurationMs === null || !extendedEnd) throw new Error('START_STATE_CHANGED')

        const resumed = await tx.application.updateMany({
          where: { id: application.id, status: 'TESTING', testingPausedAt: application.testingPausedAt },
          data: {
            testingPausedAt: null,
            testingPausedDurationMs: { increment: pausedDurationMs },
            testingEndDate: extendedEnd,
          },
        })
        const pauseClosed = await tx.applicationPause.updateMany({
          where: { id: application.pauseHistory[0].id, resumedAt: null },
          data: { resumedAt: now, resumeReason: reason, resumeInitiatedById: user.userId },
        })
        if (resumed.count !== 1 || pauseClosed.count !== 1) throw new Error('START_STATE_CHANGED')
      }

      // Anyone left on an older future-dated schedule goes back to the verified waiting list.
      await tx.application.updateMany({
        where: { jobId: id, status: 'SCHEDULED', id: { notIn: readiness.startingIds } },
        data: { status: 'VERIFIED', testingStartDate: null, testingEndDate: null },
      })

      await tx.testingJob.update({
        where: { id },
        data: { status: 'IN_PROGRESS', startedAt: job.startedAt ?? now, scheduledStartAt: null },
      })

      if (user.role === 'ADMIN') {
        await tx.$executeRaw`
          INSERT INTO "AdminAuditLog" ("id", "actorId", "actorEmail", "action", "targetType", "targetId", "reason")
          VALUES (${randomUUID()}, ${user.userId}, ${user.email}, ${'start_testing'}, ${'job'}, ${id}, ${reason ?? ''})
        `
      }

      return {
        scheduled: false as const,
        appName: job.appName,
        testDuration: job.testDuration,
        startedAt: now,
        resumedIds: new Set(readiness.pausedIds),
        testers: startingApplications.map((application) => ({ id: application.id, testerId: application.testerId })),
      }
    })

    const dateLabel = result.startedAt.toISOString().slice(0, 10)
    const notifications = await Promise.allSettled(result.testers.map((tester) =>
      sendNotification({
        userId: tester.testerId,
        title: result.scheduled ? 'Testing date set' : 'Testing has started!',
        body: result.scheduled
          ? `Testing for "${result.appName}" starts on ${dateLabel} (${TESTING_DAY_TIMEZONE}). Day 1 is that date and you can start any time that day. Open the app and report every calendar day for ${result.testDuration} days.`
          : result.resumedIds.has(tester.id)
          ? `Testing for "${result.appName}" has resumed. Your earlier progress is kept and only your saved remaining time continues.`
          : `Testing for "${result.appName}" has started. Your ${result.testDuration}-day testing period begins now. Open your daily mission.`,
        url: '/dashboard/applications',
        type: result.scheduled ? 'testing_scheduled' : 'testing_started',
      })
    ))
    notifications.forEach((notification) => {
      if (notification.status === 'rejected') {
        console.error('Failed to notify tester about testing start:', notification.reason)
      }
    })

    try {
      const groupMessage = result.scheduled
        ? `📅 Testing is scheduled for ${dateLabel} (${TESTING_DAY_TIMEZONE}).`
        : `🚀 Testing has started today (${dateLabel}).`
      await prisma.jobGroupMessage.create({
        data: {
          jobId: id,
          authorId: user.userId,
          authorRole: user.role,
          body: groupMessage,
        },
      })
    } catch (groupError) {
      console.error('Failed to post start update to group chat:', groupError)
    }

    return NextResponse.json({
      success: true,
      scheduled: result.scheduled,
      startedAt: result.startedAt,
      started: result.testers.length,
      message: result.scheduled
        ? `Testing is scheduled for ${dateLabel} (${TESTING_DAY_TIMEZONE}). ${result.testers.length} verified testers were told.`
        : `Testing started for ${result.testers.length} testers. Their ${result.testDuration}-day clocks are running.`,
    })
  } catch (error) {
    if (error instanceof CohortNotReadyError) {
      return NextResponse.json(
        {
          error: COHORT_BLOCKER_MESSAGES[error.blockers[0]] ?? 'The tester group is not ready to start',
          blockers: error.blockers,
        },
        { status: 409 }
      )
    }
    if (error instanceof Error) {
      const known: Record<string, { status: number; message: string }> = {
        JOB_NOT_FOUND: { status: 404, message: 'Job not found' },
        FORBIDDEN: { status: 403, message: 'Forbidden' },
        JOB_NOT_ACTIVE: { status: 409, message: 'This job is not in a state where testing can start' },
        RESUME_DECISION_REQUIRED: {
          status: 400,
          message: 'Some testers are paused. Explicitly confirm resuming them and give a reason of at least 10 characters.',
        },
        ADMIN_REASON_REQUIRED: { status: 400, message: 'Admins must provide a reason of at least 10 characters' },
        PAUSED_CANNOT_BE_SCHEDULED: { status: 409, message: 'Some testers are paused. Paused testers must be resumed (not scheduled) so their saved time is kept.' },
        START_DATE_REQUIRED: { status: 400, message: 'Pick a start date (tomorrow or later)' },
        START_STATE_CHANGED: { status: 409, message: 'The tester states changed while starting. Refresh and try again; nothing was started.' },
      }
      if (known[error.message]) {
        return NextResponse.json({ error: known[error.message].message }, { status: known[error.message].status })
      }
    }
    console.error('Start testing error:', error)
    return NextResponse.json({ error: 'Failed to start testing' }, { status: 500 })
  }
}
