import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'
import { extendTestingEndDate, getPauseDurationMs } from '@/lib/mission-clock'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && !cronSecret) {
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const dueJobs = await prisma.testingJob.findMany({
      where: {
        status: { in: ['ACTIVE', 'IN_PROGRESS'] },
        scheduledStartAt: { lte: now },
      },
      select: {
        id: true,
        appName: true,
        scheduledStartAt: true,
        applications: {
          where: {
            cohortSelected: true,
            OR: [
              { status: 'SCHEDULED' },
              { status: 'TESTING', testingPausedAt: { not: null } },
            ],
          },
          select: { id: true, testerId: true, status: true },
        },
      },
    })

    let started = 0
    for (const dueJob of dueJobs) {
      const result = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "TestingJob" WHERE id = ${dueJob.id} FOR UPDATE`
        const job = await tx.testingJob.findUnique({
          where: { id: dueJob.id },
          select: {
            status: true,
            scheduledStartAt: true,
            startedAt: true,
            testersNeeded: true,
            applications: {
              where: {
                cohortSelected: true,
                OR: [
                  { status: 'SCHEDULED' },
                  { status: 'TESTING', testingPausedAt: { not: null } },
                ],
              },
              select: {
                id: true,
                testerId: true,
                status: true,
                testingPausedAt: true,
                testingEndDate: true,
                issueReports: {
                  where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
                  select: { id: true },
                },
                pauseHistory: {
                  where: { resumedAt: null },
                  select: {
                    id: true,
                    pausedAt: true,
                    resumeScheduledAt: true,
                    resumeReason: true,
                    resumeInitiatedById: true,
                  },
                },
              },
            },
          },
        })
        if (!job || !['ACTIVE', 'IN_PROGRESS'].includes(job.status) || !job.scheduledStartAt || job.scheduledStartAt > now) {
          return []
        }
        const ids = job.applications.map((application) => application.id)
        if (
          ids.length !== job.testersNeeded ||
          job.applications.some((application) =>
            application.issueReports.length > 0 ||
            (
              application.status === 'TESTING' &&
              (
                application.testingPausedAt === null ||
                application.testingEndDate === null ||
                application.pauseHistory.length !== 1 ||
                application.pauseHistory[0].resumeScheduledAt?.getTime() !== job.scheduledStartAt!.getTime() ||
                !application.pauseHistory[0].resumeReason ||
                !application.pauseHistory[0].resumeInitiatedById
              )
            ) ||
            !['SCHEDULED', 'TESTING'].includes(application.status)
          )
        ) return []
        const newStarts = job.applications.filter((application) => application.status === 'SCHEDULED')
        const startedApplications = await tx.application.updateMany({
          where: { id: { in: ids }, status: 'SCHEDULED' },
          data: { status: 'TESTING' },
        })
        if (startedApplications.count !== newStarts.length) throw new Error('START_STATE_CHANGED')

        const pausedApplications = job.applications.filter((application) => application.status === 'TESTING')
        for (const application of pausedApplications) {
          const pause = application.pauseHistory[0]
          const pausedDurationMs = getPauseDurationMs(application.testingPausedAt!, job.scheduledStartAt)
          if (pausedDurationMs === null) throw new Error('START_STATE_CHANGED')
          const testingEndDate = extendTestingEndDate(application.testingEndDate!, pausedDurationMs)
          if (!testingEndDate) throw new Error('START_STATE_CHANGED')
          const resumed = await tx.application.updateMany({
            where: {
              id: application.id,
              status: 'TESTING',
              testingPausedAt: application.testingPausedAt,
            },
            data: {
              testingPausedAt: null,
              testingPausedDurationMs: { increment: pausedDurationMs },
              testingEndDate,
            },
          })
          if (resumed.count !== 1) throw new Error('START_STATE_CHANGED')
          const pauseUpdated = await tx.applicationPause.updateMany({
            where: { id: pause.id, resumedAt: null },
            data: { resumedAt: job.scheduledStartAt },
          })
          if (pauseUpdated.count !== 1) throw new Error('START_STATE_CHANGED')
        }
        await tx.testingJob.update({
          where: { id: dueJob.id },
          data: { status: 'IN_PROGRESS', startedAt: job.startedAt ?? job.scheduledStartAt },
        })
        return job.applications.map((application) => ({
          id: application.id,
          testerId: application.testerId,
          resumed: application.status === 'TESTING',
        }))
      })
      if (result.length === 0) continue
      started += 1
      const notificationResults = await Promise.allSettled(result.map((application) =>
        sendNotification({
          userId: application.testerId,
          title: 'Testing has started',
          body: application.resumed
            ? `Testing for "${dueJob.appName}" has resumed. Your previous progress is preserved and only your saved remaining duration continues.`
            : `The testing period for "${dueJob.appName}" has begun. Your daily mission is now available.`,
          url: '/dashboard',
          type: 'testing_started',
        })
      ))
      notificationResults.forEach((notificationResult) => {
        if (notificationResult.status === 'rejected') {
          console.error('Failed to notify tester that testing started:', notificationResult.reason)
        }
      })
    }

    return NextResponse.json({ success: true, startedJobs: started })
  } catch (error) {
    console.error('Start scheduled tests error:', error)
    return NextResponse.json({ error: 'Failed to start scheduled testing' }, { status: 500 })
  }
}
