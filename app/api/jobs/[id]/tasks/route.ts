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

    // Only the developer who owns the job (or admin) can view the full grid
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
