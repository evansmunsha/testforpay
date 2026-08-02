// app/api/tasks/today/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

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
        status: { in: ['APPROVED', 'OPTED_IN', 'VERIFIED', 'TESTING'] },
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

    // Use testingStartDate if set, otherwise fall back to job createdAt
    const startDate: Date = application.testingStartDate
      ? new Date(application.testingStartDate)
      : new Date(application.job.createdAt)

    const now = new Date()
    const diffMs = now.getTime() - startDate.getTime()
    const dayNumber = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1

    if (dayNumber < 1 || dayNumber > 14) {
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
    })

    return NextResponse.json({
      task: todayTask,
      dayNumber,
      totalDays: 14,
      isCompleted: !!submission,
      submission: submission ?? null,
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
