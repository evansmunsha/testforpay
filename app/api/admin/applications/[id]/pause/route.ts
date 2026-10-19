import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification } from '@/lib/notifications'
import { extendTestingEndDate, getPauseDurationMs } from '@/lib/mission-clock'

const actionSchema = z.object({
  action: z.enum(['pause', 'resume']),
  reason: z.string().trim().min(10).max(1000),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const parsed = actionSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid pause action' },
        { status: 400 }
      )
    }

    const { id } = await params
    const now = new Date()
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Application" WHERE id = ${id} FOR UPDATE`
      const application = await tx.application.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          testingStartDate: true,
          testingEndDate: true,
          testingPausedAt: true,
          testingPausedDurationMs: true,
          job: {
            select: {
              id: true,
              appName: true,
              developerId: true,
              status: true,
              testersNeeded: true,
              scheduledStartAt: true,
            },
          },
          testerId: true,
          tester: { select: { name: true } },
          payment: { select: { status: true, transferId: true } },
        },
      })
      if (!application) throw new Error('APPLICATION_NOT_FOUND')
      if (application.status !== 'TESTING') throw new Error('APPLICATION_NOT_TESTING')
      const writeAdminAudit = async (action: string) => {
        await tx.$executeRaw`
          INSERT INTO "AdminAuditLog" ("id", "actorId", "actorEmail", "action", "targetType", "targetId", "reason")
          VALUES (${randomUUID()}, ${user.userId}, ${user.email}, ${action}, 'application', ${id}, ${parsed.data.reason})
        `
      }

      if (parsed.data.action === 'pause') {
        if (application.testingPausedAt) throw new Error('ALREADY_PAUSED')
        if (application.payment?.transferId || application.payment?.status === 'COMPLETED') {
          throw new Error('PAYOUT_ALREADY_SETTLED')
        }
        if (!application.testingStartDate || !application.testingEndDate) {
          throw new Error('TESTING_DATES_MISSING')
        }
        if (application.testingEndDate <= now) throw new Error('TESTING_PERIOD_EXPIRED')

        const changed = await tx.application.updateMany({
          where: { id, status: 'TESTING', testingPausedAt: null },
          data: { testingPausedAt: now, cohortSelected: true },
        })
        if (changed.count !== 1) throw new Error('STATE_CHANGED')

        await tx.applicationPause.create({
          data: {
            applicationId: id,
            pausedAt: now,
            pauseReason: parsed.data.reason,
            pausedById: user.userId,
          },
        })
        await writeAdminAudit('pause_testing')
        return { application, action: 'pause' as const, effectiveAt: now }
      }

      if (!application.testingPausedAt) throw new Error('NOT_PAUSED')
      const openPause = await tx.applicationPause.findFirst({
        where: { applicationId: id, resumedAt: null },
        orderBy: { pausedAt: 'desc' },
        select: { id: true, resumeScheduledAt: true },
      })
      if (!openPause) throw new Error('PAUSE_AUDIT_MISSING')
      if (openPause.resumeScheduledAt) throw new Error('RESUME_ALREADY_SCHEDULED')
      if (
        application.job.status === 'IN_PROGRESS' &&
        await tx.application.count({
          where: {
            jobId: application.job.id,
            cohortSelected: true,
            status: { in: ['TESTING', 'COMPLETED'] },
          },
        }) < application.job.testersNeeded
      ) {
        throw new Error('COHORT_NOT_READY')
      }
      const pauseDurationMs = getPauseDurationMs(application.testingPausedAt, now)
      if (pauseDurationMs === null) throw new Error('INVALID_PAUSE_TIME')
      const testingEndDate = application.testingEndDate
        ? extendTestingEndDate(application.testingEndDate, pauseDurationMs)
        : null
      if (!testingEndDate) throw new Error('TESTING_DATES_MISSING')

      const changed = await tx.application.updateMany({
        where: {
          id,
          status: 'TESTING',
          testingPausedAt: application.testingPausedAt,
        },
        data: {
          testingPausedAt: null,
          testingPausedDurationMs: { increment: pauseDurationMs },
          testingEndDate,
        },
      })
      if (changed.count !== 1) throw new Error('STATE_CHANGED')

      const auditUpdate = await tx.applicationPause.updateMany({
        where: { id: openPause.id, resumedAt: null },
        data: {
          resumedAt: now,
          resumeReason: parsed.data.reason,
          resumeInitiatedById: user.userId,
        },
      })
      if (auditUpdate.count !== 1) throw new Error('STATE_CHANGED')

      await writeAdminAudit('resume_testing')
      return { application, action: 'resume' as const, effectiveAt: now }
    })

    const notificationText = result.action === 'pause'
      ? 'Testing is paused. Your completed work and payment record are preserved; missions and check-ins are unavailable until an authorized resume.'
      : `Testing resumed. The pause time was excluded, and your saved remaining testing duration continues from the previous progress.`
    const notifications = await Promise.allSettled([
      sendNotification({
        userId: result.application.testerId,
        title: result.action === 'pause' ? 'Testing paused' : 'Testing resumed',
        body: `${result.application.job.appName}: ${notificationText}`,
        url: '/dashboard/applications',
        type: result.action === 'pause' ? 'testing_paused' : 'testing_resumed',
      }),
      sendNotification({
        userId: result.application.job.developerId,
        title: result.action === 'pause' ? 'Tester clock paused' : 'Tester clock resumed',
        body: `${result.application.tester.name || 'A tester'} — ${result.application.job.appName}: ${notificationText}`,
        url: `/dashboard/jobs/${result.application.job.id}`,
        type: result.action === 'pause' ? 'testing_paused' : 'testing_resumed',
      }),
    ])
    notifications.forEach((notification) => {
      if (notification.status === 'rejected') {
        console.error('Failed to notify about testing pause state:', notification.reason)
      }
    })

    return NextResponse.json({
      success: true,
      action: result.action,
      effectiveAt: result.effectiveAt,
      message: result.action === 'pause' ? 'Testing paused' : 'Testing resumed',
    })
  } catch (error) {
    if (error instanceof Error) {
      const known: Record<string, { status: number; message: string }> = {
        APPLICATION_NOT_FOUND: { status: 404, message: 'Application not found' },
        APPLICATION_NOT_TESTING: { status: 409, message: 'Only an active testing application can be paused or resumed' },
        ALREADY_PAUSED: { status: 409, message: 'Testing is already paused' },
        NOT_PAUSED: { status: 409, message: 'Testing is not paused' },
        TESTING_DATES_MISSING: { status: 409, message: 'Testing dates are missing for this application' },
        TESTING_PERIOD_EXPIRED: { status: 409, message: 'This testing period has expired; do not pause it instead of processing completion' },
        PAYOUT_ALREADY_SETTLED: { status: 409, message: 'A payout has already been initiated or settled; contact support before changing testing state' },
        RESUME_ALREADY_SCHEDULED: { status: 409, message: 'A cohort resume is already scheduled; change or cancel that schedule first' },
        COHORT_NOT_READY: { status: 409, message: 'The full paid tester cohort is not active yet; assemble and schedule the cohort before resuming this tester' },
        INVALID_PAUSE_TIME: { status: 409, message: 'The pause timestamp is invalid' },
        PAUSE_AUDIT_MISSING: { status: 409, message: 'Pause history is missing; contact support before resuming' },
        STATE_CHANGED: { status: 409, message: 'The application state changed; refresh and try again' },
      }
      if (known[error.message]) {
        return NextResponse.json({ error: known[error.message].message }, { status: known[error.message].status })
      }
    }
    console.error('Application pause action failed:', error)
    return NextResponse.json({ error: 'Failed to update testing pause state' }, { status: 500 })
  }
}
