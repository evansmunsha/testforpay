import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import {
  canDeleteContent,
  canReadCommunity,
  canSeeContent,
  filterBlocked,
  isAdmin,
  validateModerationReason,
} from '@/lib/community-rules'
import { displayAuthor, likedPostIds, loadBlockedIds, postSelect, serializePost } from '@/lib/community'

const COMMENT_LIMIT = 200

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const viewer = { userId: user.userId, role: user.role }
    if (!canReadCommunity(viewer)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const post = await prisma.communityPost.findUnique({ where: { id }, select: postSelect })
    if (!post || !canSeeContent(viewer, post)) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const blocked = await loadBlockedIds(user.userId)
    if (blocked.has(post.authorId)) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const comments = await prisma.communityComment.findMany({
      where: { postId: id, status: { in: ['VISIBLE', 'HIDDEN'] } },
      select: {
        id: true,
        body: true,
        status: true,
        createdAt: true,
        authorId: true,
        author: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: COMMENT_LIMIT,
    })

    const visibleComments = filterBlocked(
      comments.filter((comment) => canSeeContent(viewer, comment)),
      blocked
    )
    const liked = await likedPostIds(user.userId, [id])

    return NextResponse.json({
      post: serializePost(post, viewer, liked),
      comments: visibleComments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        status: comment.status,
        createdAt: comment.createdAt,
        author: displayAuthor(comment.author),
        mine: comment.authorId === user.userId,
      })),
      isAdmin: isAdmin(viewer),
    })
  } catch (error) {
    console.error('Community post error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const viewer = { userId: user.userId, role: user.role }

    const { id } = await params
    const post = await prisma.communityPost.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true, kind: true },
    })
    if (!post || post.status === 'DELETED') return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    if (!canDeleteContent(viewer, post.authorId)) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const deletingAsAdmin = isAdmin(viewer) && post.authorId !== user.userId
    let reason = ''
    if (deletingAsAdmin) {
      const body = await request.json().catch(() => null)
      const checked = validateModerationReason(body?.reason)
      if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 })
      reason = checked.value
    }

    await prisma.$transaction([
      prisma.communityPost.update({ where: { id }, data: { status: 'DELETED', pinned: false } }),
      ...(deletingAsAdmin
        ? [
            prisma.communityModerationLog.create({
              data: { actorId: user.userId, action: 'DELETE_POST', targetType: 'POST', targetId: id, reason },
            }),
          ]
        : []),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Community delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
