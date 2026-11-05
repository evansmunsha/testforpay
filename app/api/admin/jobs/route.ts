import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { loadJobOperations, readPageParam } from '@/lib/admin-job-operations'
import { activateJobAfterPayment } from '@/lib/job-activation'
import { recordAdminAction } from '@/lib/admin-audit'

// Admin confirms a developer payment received outside the website and makes the job live.
export async function POST(request: Request) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  try {
    let body: { jobId?: unknown; reason?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Send the job and how you got paid, then try again.' }, { status: 400 })
    }
    const jobId = typeof body.jobId === 'string' ? body.jobId : ''
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (!jobId) return NextResponse.json({ error: 'Job not found' }, { status: 400 })
    if (reason.length < 10) {
      return NextResponse.json({ error: 'Write the payment method, date and amount (at least 10 letters, for example: Dodo Payments, 12 Nov, 28 EUR), then try again.' }, { status: 400 })
    }

    const job = await prisma.testingJob.findUnique({ where: { id: jobId }, select: { id: true, status: true, isTraining: true } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    if (job.isTraining) return NextResponse.json({ error: 'Training jobs do not need payment.' }, { status: 409 })
    if (job.status !== 'DRAFT') {
      return NextResponse.json({ error: 'This job is already live or finished. Refresh the page and look again.' }, { status: 409 })
    }

    const activated = await activateJobAfterPayment(jobId, `manual:${jobId}`)
    if (!activated) {
      return NextResponse.json({ error: 'This job changed. Refresh the page and try again.' }, { status: 409 })
    }

    await recordAdminAction({
      actorId: currentUser.userId,
      actorEmail: currentUser.email,
      action: 'mark_job_paid_manually',
      targetType: 'job',
      targetId: jobId,
      reason,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark job paid error:', error)
    return NextResponse.json({ error: 'Could not save. Check your internet and try again.' }, { status: 500 })
  }
}

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
