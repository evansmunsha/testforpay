import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { canReadThread, validateThreadMessage, type ThreadKindName } from '@/lib/thread-permissions'
import { addThreadMessage, isRateLimited, threadSelect, toAccessContext } from '@/lib/threads'

const createSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ADMIN_MESSAGE'), subject: z.string().trim().min(3).max(120), body: z.string() }),
  z.object({ kind: z.literal('ISSUE_REPORT'), issueReportId: z.string().min(1), body: z.string() }),
  z.object({ kind: z.literal('MISSION_SUBMISSION'), taskSubmissionId: z.string().min(1), body: z.string() }),
])

/** GET /api/threads — conversations the current user is allowed to see. Optional ?issueReportId= or ?taskSubmissionId= */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const issueReportId = searchParams.get('issueReportId')
    const taskSubmissionId = searchParams.get('taskSubmissionId')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const pageSize = 20

    const access =
      user.role === 'ADMIN'
        ? {}
        : user.role === 'TESTER'
          ? { testerId: user.userId }
          : { kind: { not: 'ADMIN_MESSAGE' as const }, job: { developerId: user.userId } }

    const threads = await prisma.conversationThread.findMany({
      where: {
        ...access,
        ...(issueReportId ? { issueReportId } : {}),
        ...(taskSubmissionId ? { taskSubmissionId } : {}),
      },
      select: {
        ...threadSelect,
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true, authorRole: true, createdAt: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
    })

    return NextResponse.json({
      threads: threads.slice(0, pageSize).map((thread) => ({
        id: thread.id,
        kind: thread.kind,
        subject: thread.subject,
        appName: thread.job?.appName ?? null,
        testerName: thread.tester.name,
        lastMessageAt: thread.lastMessageAt,
        messageCount: thread._count.messages,
        lastMessage: thread.messages[0] ?? null,
      })),
      hasMore: threads.length > pageSize,
    })
  } catch (error) {
    console.error('List threads error:', error)
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 })
  }
}

/** POST /api/threads — start (or continue) a conversation about a report, a mission, or privately with the admin. */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = createSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    const input = parsed.data

    const message = validateThreadMessage(input.body)
    if (!message.ok) return NextResponse.json({ error: message.error }, { status: 400 })
    if (await isRateLimited(user.userId)) {
      return NextResponse.json({ error: 'You are sending messages too fast. Please wait a minute.' }, { status: 429 })
    }

    let threadId: string

    if (input.kind === 'ADMIN_MESSAGE') {
      if (user.role !== 'TESTER') {
        return NextResponse.json({ error: 'Only testers can start a private message to the admin' }, { status: 403 })
      }
      const thread = await prisma.conversationThread.create({
        data: { kind: 'ADMIN_MESSAGE', testerId: user.userId, subject: input.subject },
        select: { id: true },
      })
      threadId = thread.id
    } else if (input.kind === 'ISSUE_REPORT') {
      const report = await prisma.applicationIssueReport.findUnique({
        where: { id: input.issueReportId },
        select: { id: true, testerId: true, jobId: true, category: true, job: { select: { developerId: true, appName: true } } },
      })
      if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
      const context = {
        kind: 'ISSUE_REPORT' as ThreadKindName,
        testerId: report.testerId,
        developerId: report.job.developerId,
      }
      if (!canReadThread({ userId: user.userId, role: user.role }, context)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const thread = await prisma.conversationThread.upsert({
        where: { issueReportId: report.id },
        update: {},
        create: {
          kind: 'ISSUE_REPORT',
          testerId: report.testerId,
          jobId: report.jobId,
          issueReportId: report.id,
          subject: `Issue report: ${report.job.appName}`,
        },
        select: { id: true },
      })
      threadId = thread.id
    } else {
      const submission = await prisma.taskSubmission.findUnique({
        where: { id: input.taskSubmissionId },
        select: {
          id: true,
          testerId: true,
          task: { select: { dayNumber: true, jobId: true, job: { select: { developerId: true, appName: true } } } },
        },
      })
      if (!submission) return NextResponse.json({ error: 'Mission report not found' }, { status: 404 })
      const context = {
        kind: 'MISSION_SUBMISSION' as ThreadKindName,
        testerId: submission.testerId,
        developerId: submission.task.job.developerId,
      }
      if (!canReadThread({ userId: user.userId, role: user.role }, context)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const thread = await prisma.conversationThread.upsert({
        where: { taskSubmissionId: submission.id },
        update: {},
        create: {
          kind: 'MISSION_SUBMISSION',
          testerId: submission.testerId,
          jobId: submission.task.jobId,
          taskSubmissionId: submission.id,
          subject: `Day ${submission.task.dayNumber} mission: ${submission.task.job.appName}`,
        },
        select: { id: true },
      })
      threadId = thread.id
    }

    const author = await prisma.user.findUnique({ where: { id: user.userId }, select: { name: true } })
    const created = await addThreadMessage({
      threadId,
      author: { userId: user.userId, role: user.role },
      authorName: author?.name ?? null,
      body: message.body,
    })
    return NextResponse.json({ success: true, threadId, message: created }, { status: 201 })
  } catch (error) {
    console.error('Create thread error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
