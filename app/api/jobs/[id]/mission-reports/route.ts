import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getVideoDeleteAfter } from '@/lib/video-rules'

// Lists mission uploads and issue reports for one job. Only that job's developer or an admin may read it.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const job = await prisma.testingJob.findUnique({
      where: { id },
      select: { id: true, developerId: true },
    })
    if (!job || (currentUser.role !== 'ADMIN' && job.developerId !== currentUser.userId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const [submissions, issueReports] = await Promise.all([
      prisma.taskSubmission.findMany({
        where: { task: { jobId: id } },
        orderBy: { completedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          content: true,
          completedAt: true,
          task: { select: { dayNumber: true } },
          tester: { select: { id: true, name: true } },
          video: { select: { id: true, deletedAt: true } },
        },
      }),
      prisma.applicationIssueReport.findMany({
        where: { application: { jobId: id } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          details: true,
          createdAt: true,
          application: { select: { tester: { select: { id: true, name: true } } } },
        },
      }),
    ])
    const applicationEnds = await prisma.application.findMany({
      where: {
        jobId: id,
        testerId: { in: [...new Set(submissions.map((submission) => submission.tester.id))] },
      },
      select: { testerId: true, testingEndDate: true },
    })
    const endByTester = new Map(applicationEnds.map((application) => [application.testerId, application.testingEndDate]))

    return NextResponse.json({
      submissions: submissions.map((s) => ({
        id: s.id,
        dayNumber: s.task.dayNumber,
        content: s.content,
        completedAt: s.completedAt,
        tester: s.tester,
        video: s.video ? {
          id: s.video.id,
          deletedAt: s.video.deletedAt,
          deleteAfter: getVideoDeleteAfter(endByTester.get(s.tester.id) ?? null),
        } : null,
      })),
      issueReports: issueReports.map((r) => ({
        id: r.id,
        description: r.details,
        createdAt: r.createdAt,
        tester: r.application.tester,
      })),
    })
  } catch (error) {
    console.error('Mission reports error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
