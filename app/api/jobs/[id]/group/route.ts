import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { validateThreadMessage } from '@/lib/thread-permissions'
import { isGroupRateLimited, loadGroupAccess } from '@/lib/group-chat'

const PAGE_SIZE = 50

/** GET /api/jobs/[id]/group — group status, and messages only when the viewer is a member. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const viewer = { userId: user.userId, role: user.role }

    const access = await loadGroupAccess(id, viewer)
    // Same answer for "missing" and "not allowed" unless the tester could still join.
    if (!access || (!access.canAccess && !access.canJoin)) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }
    if (!access.canAccess) {
      return NextResponse.json({ appName: access.job.appName, canAccess: false, canJoin: true })
    }

    const before = new URL(request.url).searchParams.get('before')
    const beforeDate = before ? new Date(before) : null
    const rows = await prisma.jobGroupMessage.findMany({
      where: { jobId: id, ...(beforeDate && !Number.isNaN(beforeDate.getTime()) ? { createdAt: { lt: beforeDate } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE + 1,
      select: { id: true, authorId: true, authorRole: true, body: true, createdAt: true, author: { select: { name: true } } },
    })
    const hasMore = rows.length > PAGE_SIZE
    const messages = rows.slice(0, PAGE_SIZE).reverse().map((m) => ({
      id: m.id,
      authorName: m.authorRole === 'ADMIN' ? 'TestForPay Admin' : m.author.name,
      authorRole: m.authorRole,
      body: m.body,
      createdAt: m.createdAt,
      mine: m.authorId === user.userId,
    }))
    const testerCount = await prisma.jobGroupMember.count({ where: { jobId: id } })

    return NextResponse.json({
      appName: access.job.appName,
      canAccess: true,
      canJoin: false,
      memberCount: testerCount + 1,
      hasMore,
      messages,
    })
  } catch (error) {
    console.error('Group chat load error:', error)
    return NextResponse.json({ error: 'Failed to load group chat' }, { status: 500 })
  }
}

/** POST /api/jobs/[id]/group — send a message to the group. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const viewer = { userId: user.userId, role: user.role }

    const access = await loadGroupAccess(id, viewer)
    if (!access || !access.canAccess) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

    const payload = (await request.json().catch(() => null)) as { body?: unknown } | null
    const message = validateThreadMessage(payload?.body)
    if (!message.ok) return NextResponse.json({ error: message.error }, { status: 400 })
    if (await isGroupRateLimited(user.userId)) {
      return NextResponse.json({ error: 'You are sending messages too fast. Please wait a minute.' }, { status: 429 })
    }

    const created = await prisma.jobGroupMessage.create({
      data: { jobId: id, authorId: user.userId, authorRole: user.role, body: message.body },
      select: { id: true, createdAt: true },
    })
    return NextResponse.json({ success: true, message: created }, { status: 201 })
  } catch (error) {
    console.error('Group chat send error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
