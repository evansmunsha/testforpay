import prisma from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'
import { sendThreadReplyEmail } from '@/lib/email'
import {
  getThreadRecipientIds,
  type ThreadAccessContext,
  type ThreadKindName,
  type ThreadViewer,
} from '@/lib/thread-permissions'

export const THREAD_RATE_LIMIT = { maxMessages: 10, windowMs: 60_000 }

export const threadSelect = {
  id: true,
  kind: true,
  subject: true,
  testerId: true,
  jobId: true,
  issueReportId: true,
  taskSubmissionId: true,
  lastMessageAt: true,
  createdAt: true,
  job: { select: { developerId: true, appName: true } },
  tester: { select: { id: true, name: true, muteDeveloperReplies: true } },
} as const

type LoadedThread = {
  kind: ThreadKindName
  testerId: string
  job: { developerId: string } | null
  tester: { muteDeveloperReplies: boolean }
}

export function toAccessContext(thread: LoadedThread): ThreadAccessContext {
  return {
    kind: thread.kind,
    testerId: thread.testerId,
    developerId: thread.kind === 'ADMIN_MESSAGE' ? null : thread.job?.developerId ?? null,
    testerMutesDeveloperReplies: thread.tester.muteDeveloperReplies,
  }
}

export function threadPath(threadId: string) {
  return `/dashboard/messages/${threadId}`
}

export async function isRateLimited(authorId: string) {
  const since = new Date(Date.now() - THREAD_RATE_LIMIT.windowMs)
  const recent = await prisma.threadMessage.count({ where: { authorId, createdAt: { gte: since } } })
  return recent >= THREAD_RATE_LIMIT.maxMessages
}

/** Saves a message, then tells everyone else in the thread. Notification failures never block the reply. */
export async function addThreadMessage(params: {
  threadId: string
  author: ThreadViewer
  authorName: string | null
  body: string
}) {
  const { threadId, author, authorName, body } = params
  const [message] = await prisma.$transaction([
    prisma.threadMessage.create({
      data: { threadId, authorId: author.userId, authorRole: author.role, body },
      select: { id: true, authorId: true, authorRole: true, body: true, createdAt: true },
    }),
    prisma.conversationThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } }),
  ])

  try {
    const thread = await prisma.conversationThread.findUnique({ where: { id: threadId }, select: threadSelect })
    if (!thread) return message
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
    const context = toAccessContext(thread)
    const recipientIds = getThreadRecipientIds(author, context, admins.map((admin) => admin.id))
    const recipients = await prisma.user.findMany({
      where: { id: { in: recipientIds } },
      select: { id: true, email: true, name: true },
    })
    const authorLabel = author.role === 'ADMIN' ? 'TestForPay Admin' : authorName || (author.role === 'DEVELOPER' ? 'The developer' : 'The tester')
    await Promise.allSettled(
      recipients.flatMap((recipient) => [
        sendNotification({
          userId: recipient.id,
          title: `New reply from ${authorLabel}`,
          body: `${body.length > 120 ? `${body.slice(0, 120)}…` : body}`,
          url: threadPath(threadId),
          type: 'thread_reply',
        }),
        sendThreadReplyEmail(recipient.email, {
          recipientName: recipient.name,
          authorLabel,
          subject: thread.subject,
          preview: body,
          threadPath: threadPath(threadId),
        }),
      ])
    )
  } catch (error) {
    console.error('Failed to notify about thread message:', error)
  }
  return message
}
