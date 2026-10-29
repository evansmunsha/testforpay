import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { canReadThread, canReplyToThread, validateThreadMessage } from '@/lib/thread-permissions'
import { addThreadMessage, isRateLimited, threadSelect, toAccessContext } from '@/lib/threads'

/** POST /api/threads/[id]/messages — reply in a conversation. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const thread = await prisma.conversationThread.findUnique({ where: { id }, select: threadSelect })
    const viewer = { userId: user.userId, role: user.role }
    if (!thread || !canReadThread(viewer, toAccessContext(thread))) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    if (!canReplyToThread(viewer, toAccessContext(thread))) {
      return NextResponse.json({ error: 'This tester has muted developer replies' }, { status: 403 })
    }

    const body = (await request.json().catch(() => null)) as { body?: unknown } | null
    const message = validateThreadMessage(body?.body)
    if (!message.ok) return NextResponse.json({ error: message.error }, { status: 400 })
    if (await isRateLimited(user.userId)) {
      return NextResponse.json({ error: 'You are sending messages too fast. Please wait a minute.' }, { status: 429 })
    }

    const author = await prisma.user.findUnique({ where: { id: user.userId }, select: { name: true } })
    const created = await addThreadMessage({
      threadId: thread.id,
      author: viewer,
      authorName: author?.name ?? null,
      body: message.body,
    })
    return NextResponse.json({ success: true, message: created }, { status: 201 })
  } catch (error) {
    console.error('Reply to thread error:', error)
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 })
  }
}
