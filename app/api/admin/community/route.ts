import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { canModerate, canPin, validateModerationReason } from '@/lib/community-rules'
import { displayAuthor } from '@/lib/community'

const ACTIONS = [
  'HIDE_POST',
  'UNHIDE_POST',
  'PIN_POST',
  'UNPIN_POST',
  'HIDE_COMMENT',
  'MUTE_USER',
  'UNMUTE_USER',
  'DISMISS_REPORT',
  'ACTION_REPORT',
] as const
type Action = (typeof ACTIONS)[number]

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const viewer = { userId: user.userId, role: user.role }
  if (!canModerate(viewer)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { viewer }
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const reports = await prisma.communityReport.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        reason: true,
        createdAt: true,
        reporter: { select: { name: true } },
        post: { select: { id: true, body: true, status: true, pinned: true, authorId: true, author: { select: { name: true, role: true } } } },
        comment: {
          select: { id: true, body: true, status: true, postId: true, authorId: true, author: { select: { name: true, role: true } } },
        },
      },
    })

    return NextResponse.json({
      reports: reports.map((report) => {
        const content = report.post ?? report.comment
        return {
          id: report.id,
          reason: report.reason,
          createdAt: report.createdAt,
          reporterName: report.reporter.name?.trim() || 'Member',
          type: report.post ? 'POST' : 'COMMENT',
          postId: report.post ? report.post.id : report.comment?.postId ?? null,
          commentId: report.comment?.id ?? null,
          body: content?.body ?? '',
          status: content?.status ?? 'DELETED',
          authorId: content?.authorId ?? null,
          authorName: content ? displayAuthor(content.author).name : 'Unknown',
        }
      }),
    })
  } catch (error) {
    console.error('Community moderation queue error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Body: { action, reason, postId? | commentId? | userId? | reportId?, days? }
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error
    const actorId = auth.viewer.userId

    const body = await request.json().catch(() => null)
    if (!body || !(ACTIONS as readonly string[]).includes(body.action)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const action = body.action as Action
    const reason = validateModerationReason(body.reason)
    if (!reason.ok) return NextResponse.json({ error: reason.error }, { status: 400 })

    const str = (value: unknown) => (typeof value === 'string' && value ? value : null)
    const postId = str(body.postId)
    const commentId = str(body.commentId)
    const userId = str(body.userId)
    const reportId = str(body.reportId)

    const log = (targetType: string, targetId: string) =>
      prisma.communityModerationLog.create({
        data: { actorId, action, targetType, targetId, reason: reason.value },
      })

    switch (action) {
      case 'HIDE_POST':
      case 'UNHIDE_POST': {
        if (!postId) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
        const post = await prisma.communityPost.findUnique({ where: { id: postId }, select: { status: true } })
        if (!post || post.status === 'DELETED') return NextResponse.json({ error: 'Not found' }, { status: 404 })
        await prisma.$transaction([
          prisma.communityPost.update({
            where: { id: postId },
            data: action === 'HIDE_POST' ? { status: 'HIDDEN', pinned: false } : { status: 'VISIBLE' },
          }),
          log('POST', postId),
        ])
        break
      }
      case 'PIN_POST':
      case 'UNPIN_POST': {
        if (!postId || !canPin(auth.viewer)) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
        const post = await prisma.communityPost.findUnique({ where: { id: postId }, select: { status: true } })
        if (!post || post.status !== 'VISIBLE') return NextResponse.json({ error: 'Not found' }, { status: 404 })
        await prisma.$transaction([
          prisma.communityPost.update({ where: { id: postId }, data: { pinned: action === 'PIN_POST' } }),
          log('POST', postId),
        ])
        break
      }
      case 'HIDE_COMMENT': {
        if (!commentId) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
        const comment = await prisma.communityComment.findUnique({
          where: { id: commentId },
          select: { status: true, postId: true },
        })
        if (!comment || comment.status !== 'VISIBLE') return NextResponse.json({ error: 'Not found' }, { status: 404 })
        await prisma.$transaction([
          prisma.communityComment.update({ where: { id: commentId }, data: { status: 'HIDDEN' } }),
          prisma.communityPost.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } }),
          log('COMMENT', commentId),
        ])
        break
      }
      case 'MUTE_USER': {
        if (!userId) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
        const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
        if (!target || target.role === 'ADMIN') return NextResponse.json({ error: 'You cannot mute this person' }, { status: 400 })
        const days = Number(body.days)
        const mutedUntil = Number.isFinite(days) && days > 0 && days <= 365 ? new Date(Date.now() + days * 86400000) : null
        await prisma.$transaction([
          prisma.communityMute.upsert({
            where: { userId },
            create: { userId, mutedById: actorId, reason: reason.value, mutedUntil },
            update: { mutedById: actorId, reason: reason.value, mutedUntil },
          }),
          log('USER', userId),
        ])
        break
      }
      case 'UNMUTE_USER': {
        if (!userId) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
        await prisma.$transaction([prisma.communityMute.deleteMany({ where: { userId } }), log('USER', userId)])
        break
      }
      case 'DISMISS_REPORT':
      case 'ACTION_REPORT': {
        if (!reportId) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
        const updated = await prisma.communityReport.updateMany({
          where: { id: reportId, status: 'OPEN' },
          data: {
            status: action === 'DISMISS_REPORT' ? 'DISMISSED' : 'ACTIONED',
            handledById: actorId,
            handledAt: new Date(),
          },
        })
        if (updated.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        await log('REPORT', reportId)
        break
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Community moderation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
