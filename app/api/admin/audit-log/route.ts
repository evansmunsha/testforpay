import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const entries = await prisma.$queryRaw<Array<{
      id: string
      actorId: string
      actorEmail: string
      action: string
      targetType: string
      targetId: string
      reason: string
      createdAt: Date
    }>>`
      SELECT "id", "actorId", "actorEmail", "action", "targetType", "targetId", "reason", "createdAt"
      FROM "AdminAuditLog"
      ORDER BY "createdAt" DESC
      LIMIT 25
    `
    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Admin audit log fetch error:', error)
    return NextResponse.json({ error: 'Audit log is unavailable until its database migration is applied' }, { status: 503 })
  }
}