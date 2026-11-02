import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { markSectionSeen } from '@/lib/nav-badges'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    // Opening the contact list clears the admin menu badge for contact messages.
    await markSectionSeen(currentUser.userId, 'contacts').catch((error) =>
      console.error('Failed to mark contacts seen:', error)
    )

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Admin contact fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch contact messages' }, { status: 500 })
  }
}
