import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { canSeeContent } from '@/lib/community-rules'

// Toggles the like. The unique (postId, userId) pair makes double taps safe.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const viewer = { userId: user.userId, role: user.role }

    const { id } = await params
    const post = await prisma.communityPost.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true },
    })
    if (!post || post.status !== 'VISIBLE' || !canSeeContent(viewer, post)) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const removed = await tx.communityLike.deleteMany({ where: { postId: id, userId: user.userId } })
      if (removed.count > 0) {
        const updated = await tx.communityPost.update({
          where: { id },
          data: { likeCount: { decrement: 1 } },
          select: { likeCount: true },
        })
        return { liked: false, likeCount: Math.max(0, updated.likeCount) }
      }
      await tx.communityLike.create({ data: { postId: id, userId: user.userId } })
      const updated = await tx.communityPost.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      })
      return { liked: true, likeCount: updated.likeCount }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    // A concurrent double tap can hit the unique constraint; the other request already liked it.
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Please try again' }, { status: 409 })
    }
    console.error('Community like error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
