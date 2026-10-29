import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { loadGroupAccess } from '@/lib/group-chat'

/** POST /api/jobs/[id]/group/join — a verified tester joins the group. Safe to press twice. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const access = await loadGroupAccess(id, { userId: user.userId, role: user.role })
    if (!access || (!access.canJoin && !access.canAccess)) {
      return NextResponse.json({ error: 'Only testers verified by this job’s developer can join.' }, { status: 403 })
    }
    if (access.isAlwaysMember) return NextResponse.json({ success: true, alreadyMember: true })

    await prisma.jobGroupMember.upsert({
      where: { jobId_userId: { jobId: id, userId: user.userId } },
      create: { jobId: id, userId: user.userId },
      update: {},
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Group join error:', error)
    return NextResponse.json({ error: 'Failed to join the group' }, { status: 500 })
  }
}
