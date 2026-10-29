// app/api/tasks/[taskId]/submit/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { getMissionDay } from '@/lib/mission-clock'
import { isAllowedVideoPath } from '@/lib/video-rules'

const submitSchema = z.object({
  content: z.string().min(10, 'Please write at least 10 characters'),
  screenshotUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  video: z.object({
    pathname: z.string().min(1),
  }).optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = submitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { content, screenshotUrl, video } = parsed.data
    const { taskId } = await params

    // Verify the task exists and the tester has an active application for its job
    const task = await prisma.dailyTask.findUnique({
      where: { id: taskId },
      include: {
        job: {
          select: {
            testDuration: true,
            applications: {
              where: {
                testerId: currentUser.userId,
                status: 'TESTING',
                issueReports: { none: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } },
              },
              select: {
                id: true,
                testingStartDate: true,
                testingPausedAt: true,
                testingPausedDurationMs: true,
              },
            },
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.job.applications.length === 0) {
      return NextResponse.json(
        { error: 'You are not assigned to this task' },
        { status: 403 }
      )
    }

    const application = task.job.applications[0]
    if (!application.testingStartDate) {
      return NextResponse.json(
        { error: 'Testing has not started for this application' },
        { status: 400 }
      )
    }

    if (application.testingPausedAt) {
      return NextResponse.json({ error: 'Testing is paused for this application' }, { status: 409 })
    }

    const missionDay = getMissionDay(
      application.testingStartDate,
      new Date(),
      application.testingPausedDurationMs
    )
    if (
      missionDay === null ||
      missionDay > task.job.testDuration ||
      task.dayNumber !== missionDay
    ) {
      return NextResponse.json(
        { error: 'Only the mission for the current testing day can be submitted' },
        { status: 400 }
      )
    }

    let stagedVideo: { id: string } | null = null
    if (video) {
      if (!isAllowedVideoPath(video.pathname, currentUser.userId, taskId)) {
        return NextResponse.json({ error: 'This video does not belong to your mission' }, { status: 400 })
      }
      stagedVideo = await prisma.submissionVideo.findFirst({
        where: {
          applicationId: application.id,
          blobPathname: video.pathname,
          taskSubmissionId: null,
          deletedAt: null,
        },
        select: { id: true },
      })
      if (!stagedVideo) {
        return NextResponse.json({ error: 'Upload a valid video before submitting this mission' }, { status: 400 })
      }
    }

    let submission
    try {
      submission = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Application" WHERE id = ${application.id} FOR UPDATE`
        const fresh = await tx.application.findUnique({
          where: { id: application.id },
          select: {
            status: true,
            testingStartDate: true,
            testingPausedAt: true,
            testingPausedDurationMs: true,
            issueReports: {
              where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
              select: { id: true },
            },
          },
        })
        if (!fresh || fresh.status !== 'TESTING' || fresh.issueReports.length > 0) {
          throw new Error('TESTING_NOT_ACTIVE')
        }
        if (fresh.testingPausedAt) throw new Error('TESTING_PAUSED')
        if (!fresh.testingStartDate) throw new Error('TESTING_NOT_STARTED')
        const currentMissionDay = getMissionDay(
          fresh.testingStartDate,
          new Date(),
          fresh.testingPausedDurationMs
        )
        if (
          currentMissionDay === null ||
          currentMissionDay > task.job.testDuration ||
          task.dayNumber !== currentMissionDay
        ) {
          throw new Error('MISSION_NOT_CURRENT')
        }
        const existing = await tx.taskSubmission.findUnique({
          where: {
            taskId_testerId: {
              taskId,
              testerId: currentUser.userId,
            },
          },
          select: { id: true },
        })
        if (existing) throw new Error('DUPLICATE_SUBMISSION')

        const created = await tx.taskSubmission.create({
          data: {
            taskId,
            testerId: currentUser.userId,
            content,
            screenshotUrl: screenshotUrl || null,
          },
        })
        if (stagedVideo) {
          const attached = await tx.submissionVideo.updateMany({
            where: {
              id: stagedVideo.id,
              applicationId: application.id,
              taskSubmissionId: null,
              deletedAt: null,
            },
            data: { taskSubmissionId: created.id },
          })
          if (attached.count !== 1) throw new Error('VIDEO_ALREADY_ATTACHED')
        }
        return created
      })
    } catch (stateError) {
      if (stateError instanceof Error) {
        const errors: Record<string, { status: number; message: string }> = {
          TESTING_NOT_ACTIVE: { status: 409, message: 'Testing is not active for this application' },
          TESTING_PAUSED: { status: 409, message: 'Testing is paused for this application' },
          TESTING_NOT_STARTED: { status: 409, message: 'Testing has not started for this application' },
          MISSION_NOT_CURRENT: { status: 400, message: 'Only the mission for the current testing day can be submitted' },
          DUPLICATE_SUBMISSION: { status: 409, message: 'You have already submitted this task' },
          VIDEO_ALREADY_ATTACHED: { status: 409, message: 'This video is already attached to another submission' },
        }
        if (errors[stateError.message]) {
          return NextResponse.json(
            { error: errors[stateError.message].message },
            { status: errors[stateError.message].status }
          )
        }
      }
      throw stateError
    }

    return NextResponse.json({ success: true, submission })
  } catch (error) {
    console.error('Task submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit task' },
      { status: 500 }
    )
  }
}
