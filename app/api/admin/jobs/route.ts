import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { loadJobOperations, readPageParam } from '@/lib/admin-job-operations'

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    // ?operationsJobId=<id> returns the full oversight view for one job.
    const { searchParams } = new URL(request.url)
    const operationsJobId = searchParams.get('operationsJobId')
    if (operationsJobId) {
      const operations = await loadJobOperations(operationsJobId, {
        applications: readPageParam(searchParams.get('applicationsPage')),
        submissions: readPageParam(searchParams.get('submissionsPage')),
        reports: readPageParam(searchParams.get('reportsPage')),
      })
      if (!operations) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      return NextResponse.json(operations)
    }

    const jobs = await prisma.testingJob.findMany({
      include: {
        developer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
        dailyTasks: {
          orderBy: { dayNumber: 'asc' },
          select: {
            id: true,
            dayNumber: true,
            taskText: true,
          },
        },
        applications: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            status: true,
            createdAt: true,
            testingStartDate: true,
            testingEndDate: true,
            payment: { select: { status: true } },
            tester: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const jobIds = jobs.map(job => job.id)
    const testerIds = [...new Set(jobs.flatMap(job => job.applications.map(application => application.tester.id)))]
    const taskSubmissions = jobIds.length && testerIds.length
      ? await prisma.taskSubmission.findMany({
          where: {
            testerId: { in: testerIds },
            task: { jobId: { in: jobIds } },
          },
          select: {
            testerId: true,
            task: { select: { jobId: true, dayNumber: true } },
          },
        })
      : []

    const missionProgress = new Map<string, Set<number>>()
    for (const submission of taskSubmissions) {
      const key = `${submission.task.jobId}:${submission.testerId}`
      const completedDays = missionProgress.get(key) ?? new Set<number>()
      completedDays.add(submission.task.dayNumber)
      missionProgress.set(key, completedDays)
    }

    const jobsWithProgress = jobs.map(job => ({
      ...job,
      applications: job.applications.map(application => ({
        ...application,
        completedMissionDays: missionProgress.get(`${job.id}:${application.tester.id}`)?.size ?? 0,
      })),
    }))

    return NextResponse.json({ jobs: jobsWithProgress })
  } catch (error) {
    console.error('Admin jobs fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
