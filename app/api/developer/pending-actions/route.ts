import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Get applications waiting for approval (status PENDING)
    const pendingApprovals = await prisma.application.findMany({
      where: {
        job: { developerId: currentUser.userId },
        status: 'PENDING'
      },
      include: {
        job: true,
        tester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 2. Get applications waiting for verification (status OPTED_IN)
    const pendingVerifications = await prisma.application.findMany({
      where: {
        job: { developerId: currentUser.userId },
        status: 'OPTED_IN'
      },
      include: {
        job: true,
        tester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json({
      pendingApprovals,
      pendingVerifications
    })

  } catch (error) {
    console.error('Developer pending actions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending actions' },
      { status: 500 }
    )
  }
}
