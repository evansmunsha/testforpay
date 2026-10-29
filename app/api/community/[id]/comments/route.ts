import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import {
  COMMUNITY_LIMITS,
  canSeeContent,
  canWrite,
  isAdmin,
  isRateLimited,
  validateCommentBody,
} from '@/lib/community-rules'
import { communityPostPath, countRecent, displayAuthor, loadMute } from '@/lib/community'
import { sendNotification } from '@/lib/notifications'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const viewer = { userId: user.userId, role: user.role }

    if (!canWrite(viewer, await loadMute(user.userId))) {
      return NextResponse.json({ error: 'You cannot comment right now' }, { status: 403 })
    }

    const { id } = await params
    const post = await prisma.communityPost.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true },
    })
    if (!post || post.status !== 'VISIBLE' || !canSeeContent(viewer, post)) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const blockedByAuthor = await prisma.communityBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: post.authorId, blockedId: user.userId } },
      select: { id: true },
    })
    if (blockedByAuthor && !isAdmin(viewer)) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    const text = validateCommentBody(body?.body)
    if (!text.ok) return NextResponse.json({ error: text.error }, { status: 400 })

    if (!isAdmin(viewer) && isRateLimited(await countRecent(user.userId, 'comments'), COMMUNITY_LIMITS.comments)) {
      return NextResponse.json({ error: 'You are commenting too fast. Please try again later.' }, { status: 429 })
    }

    const [comment] = await prisma.$transaction([
      prisma.communityComment.create({
        data: { postId: id, authorId: user.userId, body: text.value },
        select: {
          id: true,
          body: true,
          status: true,
          createdAt: true,
          author: { select: { name: true, role: true } },
        },
      }),
      prisma.communityPost.update({ where: { id }, data: { commentCount: { increment: 1 } } }),
    ])

    if (post.authorId !== user.userId) {
      try {
        const who = displayAuthor(comment.author).name
        await sendNotification({
          userId: post.authorId,
          title: 'New comment on your post',
          body: `${who}: ${text.value.slice(0, 100)}`,
          url: communityPostPath(id),
          type: 'community_comment',
        })
      } catch (notifyError) {
        console.error('Community comment notification failed:', notifyError)
      }
    }

    return NextResponse.json(
      {
        success: true,
        comment: {
          id: comment.id,
          body: comment.body,
          status: comment.status,
          createdAt: comment.createdAt,
          author: displayAuthor(comment.author),
          mine: true,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Community comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
