import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { canBlockUser } from '@/lib/community-rules'

async function readTarget(request: Request) {
  const body = await request.json().catch(() => null)
  return typeof body?.userId === 'string' ? body.userId : null
}

// Body: { userId }. Blocking hides that person's posts and comments from you.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const targetId = await readTarget(request)
    if (!targetId) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, role: true } })
    if (!target || !canBlockUser({ userId: user.userId, role: user.role }, target.id, target.role)) {
      return NextResponse.json({ error: 'You cannot block this person' }, { status: 400 })
    }

    await prisma.communityBlock.upsert({
      where: { blockerId_blockedId: { blockerId: user.userId, blockedId: target.id } },
      create: { blockerId: user.userId, blockedId: target.id },
      update: {},
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Community block error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const targetId = await readTarget(request)
    if (!targetId) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    await prisma.communityBlock.deleteMany({ where: { blockerId: user.userId, blockedId: targetId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Community unblock error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
