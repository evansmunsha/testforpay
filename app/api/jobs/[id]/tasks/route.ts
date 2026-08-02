// app/api/jobs/[id]/tasks/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const job = await prisma.testingJob.findUnique({
      where: { id },
      include: {
        dailyTasks: {
          orderBy: { dayNumber: 'asc' },
          include: {
            submissions: {
              include: {
                tester: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        applications: {
          where: { status: { in: ['APPROVED', 'OPTED_IN', 'VERIFIED', 'TESTING', 'COMPLETED'] } },
          include: {
            tester: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (
      currentUser.role !== 'ADMIN' &&
      job.developerId !== currentUser.userId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      tasks: job.dailyTasks,
      testers: job.applications.map((a) => a.tester),
    })
  } catch (error) {
    console.error('Tasks fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// PATCH — replace all daily tasks for a job (developer only, DRAFT jobs only after testing starts)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const job = await prisma.testingJob.findUnique({
      where: { id },
      include: { _count: { select: { applications: { where: { status: { in: ['TESTING', 'COMPLETED'] } } } } } },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.developerId !== currentUser.userId && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prevent editing tasks once testers are actively testing
    if (job._count.applications > 0) {
      return NextResponse.json(
        { error: 'Cannot edit missions once testers have started testing' },
        { status: 409 }
      )
    }

    const body = await request.json() as { tasks?: unknown }
    if (!Array.isArray(body.tasks) || body.tasks.length === 0) {
      return NextResponse.json({ error: 'tasks must be a non-empty array of strings' }, { status: 400 })
    }

    const taskTexts = body.tasks as string[]

    // Replace all tasks atomically
    await prisma.$transaction([
      prisma.dailyTask.deleteMany({ where: { jobId: id } }),
      prisma.dailyTask.createMany({
        data: taskTexts.map((taskText, index) => ({
          jobId: id,
          dayNumber: index + 1,
          taskText,
        })),
      }),
    ])

    const updated = await prisma.dailyTask.findMany({
      where: { jobId: id },
      orderBy: { dayNumber: 'asc' },
    })

    return NextResponse.json({ success: true, tasks: updated })
  } catch (error) {
    console.error('Tasks update error:', error)
    return NextResponse.json({ error: 'Failed to update tasks' }, { status: 500 })
  }
}
