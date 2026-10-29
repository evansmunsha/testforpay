import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { canReadThread } from '@/lib/thread-permissions'
import { threadSelect, toAccessContext } from '@/lib/threads'

/** GET /api/threads/[id] — the full conversation, only for people allowed to see it. */
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const thread = await prisma.conversationThread.findUnique({
      where: { id },
      select: {
        ...threadSelect,
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            authorId: true,
            authorRole: true,
            body: true,
            createdAt: true,
            author: { select: { name: true } },
          },
        },
      },
    })
    // Same answer for "missing" and "not yours" so ids cannot be probed.
    if (!thread || !canReadThread({ userId: user.userId, role: user.role }, toAccessContext(thread))) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Mark this conversation's notifications as read for the viewer.
    await prisma.notification.updateMany({
      where: { userId: user.userId, read: false, type: 'thread_reply', url: `/dashboard/messages/${thread.id}` },
      data: { read: true },
    }).catch((error) => console.error('Failed to mark thread notifications read:', error))

    return NextResponse.json({
      thread: {
        id: thread.id,
        kind: thread.kind,
        subject: thread.subject,
        appName: thread.job?.appName ?? null,
        testerName: thread.tester.name,
        createdAt: thread.createdAt,
        issueReportId: thread.issueReportId,
        taskSubmissionId: thread.taskSubmissionId,
        messages: thread.messages.map((message) => ({
          id: message.id,
          authorId: message.authorId,
          authorName: message.authorRole === 'ADMIN' ? 'TestForPay Admin' : message.author.name,
          authorRole: message.authorRole,
          body: message.body,
          createdAt: message.createdAt,
          mine: message.authorId === user.userId,
        })),
      },
    })
  } catch (error) {
    console.error('Get thread error:', error)
    return NextResponse.json({ error: 'Failed to load conversation' }, { status: 500 })
  }
}
