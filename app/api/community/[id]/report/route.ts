import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import {
  COMMUNITY_LIMITS,
  canReportContent,
  isRateLimited,
  validateReportReason,
} from '@/lib/community-rules'
import { countRecent } from '@/lib/community'

// Body: { reason, commentId? }. Reports the post, or one comment on it.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const viewer = { userId: user.userId, role: user.role }

    const { id } = await params
    const body = await request.json().catch(() => null)
    const reason = validateReportReason(body?.reason)
    if (!reason.ok) return NextResponse.json({ error: reason.error }, { status: 400 })
    const commentId = typeof body?.commentId === 'string' ? body.commentId : null

    const target = commentId
      ? await prisma.communityComment.findFirst({
          where: { id: commentId, postId: id },
          select: { id: true, authorId: true, status: true },
        })
      : await prisma.communityPost.findUnique({ where: { id }, select: { id: true, authorId: true, status: true } })

    if (!target || !canReportContent(viewer, target)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (isRateLimited(await countRecent(user.userId, 'reports'), COMMUNITY_LIMITS.reports)) {
      return NextResponse.json({ error: 'Too many reports today. Please try again tomorrow.' }, { status: 429 })
    }

    try {
      await prisma.communityReport.create({
        data: {
          reporterId: user.userId,
          reason: reason.value,
          ...(commentId ? { commentId } : { postId: id }),
        },
      })
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return NextResponse.json({ error: 'You already reported this.' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Community report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
