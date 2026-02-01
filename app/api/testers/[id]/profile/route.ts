import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/testers/[id]/profile
 * Returns a tester's profile information
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const tester = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        averageEngagementScore: true,
        totalTestsCompleted: true,
        totalEarnings: true,
        averageRating: true,
        createdAt: true,
        deviceInfo: {
          select: {
            deviceModel: true,
            androidVersion: true,
            screenSize: true,
          },
        },
      },
    })

    if (!tester || tester.role !== 'TESTER') {
      return NextResponse.json(
        { error: 'Tester not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: tester,
    })
  } catch (error) {
    console.error('Get tester profile error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
