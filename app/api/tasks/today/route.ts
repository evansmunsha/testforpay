// app/api/tasks/today/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getMissionDay } from '@/lib/mission-clock'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the tester's most recently started active application
    const application = await prisma.application.findFirst({
      where: {
        testerId: currentUser.userId,
        status: 'TESTING',
        issueReports: { none: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        job: {
          include: {
            dailyTasks: { orderBy: { dayNumber: 'asc' } },
          },
        },
      },
    })

    if (!application) {
      return NextResponse.json({ error: 'No active job' }, { status: 404 })
    }

    if (application.testingPausedAt) {
      return NextResponse.json({ error: 'Testing is paused for this application' }, { status: 409 })
    }

    if (!application.testingStartDate) {
      return NextResponse.json(
        { error: 'Testing has not started for this application' },
        { status: 400 }
      )
    }

    const dayNumber = getMissionDay(
      application.testingStartDate,
      new Date(),
      application.testingPausedDurationMs
    )

    if (dayNumber === null || dayNumber > application.job.testDuration) {
      return NextResponse.json(
        { error: 'Testing period not active' },
        { status: 400 }
      )
    }

    const todayTask = application.job.dailyTasks.find(
      (t) => t.dayNumber === dayNumber
    )

    if (!todayTask) {
      return NextResponse.json(
        { error: 'No mission defined for today' },
        { status: 404 }
      )
    }

    // Check if the tester already submitted for today
    const submission = await prisma.taskSubmission.findUnique({
      where: {
        taskId_testerId: {
          taskId: todayTask.id,
          testerId: currentUser.userId,
        },
      },
      include: { video: { select: { id: true, deletedAt: true } } },
    })

    return NextResponse.json({
      task: todayTask,
      dayNumber,
      totalDays: application.job.testDuration,
      isCompleted: !!submission,
      submission: submission ?? null,
      videoDeleteAfter: submission?.video && application.testingEndDate
        ? new Date(application.testingEndDate.getTime() + 14 * 24 * 60 * 60 * 1000)
        : null,
      jobName: application.job.appName,
    })
  } catch (error) {
    console.error('Today task fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch today\'s task' },
      { status: 500 }
    )
  }
}
