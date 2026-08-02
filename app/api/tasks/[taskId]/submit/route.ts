// app/api/tasks/[taskId]/submit/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const submitSchema = z.object({
  content: z.string().min(10, 'Please write at least 10 characters'),
  screenshotUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
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

    const { content, screenshotUrl } = parsed.data

    // Verify the task exists and the tester has an active application for its job
    const task = await prisma.dailyTask.findUnique({
      where: { id: params.taskId },
      include: {
        job: {
          include: {
            applications: {
              where: {
                testerId: currentUser.userId,
                status: { in: ['APPROVED', 'OPTED_IN', 'VERIFIED', 'TESTING'] },
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

    // Check for duplicate submission
    const existing = await prisma.taskSubmission.findUnique({
      where: {
        taskId_testerId: {
          taskId: params.taskId,
          testerId: currentUser.userId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You have already submitted this task' },
        { status: 409 }
      )
    }

    const submission = await prisma.taskSubmission.create({
      data: {
        taskId: params.taskId,
        testerId: currentUser.userId,
        content,
        screenshotUrl: screenshotUrl || null,
      },
    })

    return NextResponse.json({ success: true, submission })
  } catch (error) {
    console.error('Task submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit task' },
      { status: 500 }
    )
  }
}
