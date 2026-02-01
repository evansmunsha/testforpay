import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/developers/me/verified-testers
 * Get all verified testers for current developer
 */
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Only developers can view verified testers' },
        { status: 403 }
      )
    }

    const verified = await prisma.verifiedTester.findMany({
      where: { developerId: currentUser.userId },
      include: {
        tester: {
          select: {
            id: true,
            name: true,
            email: true,
            averageEngagementScore: true,
            totalTestsCompleted: true,
            averageRating: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      count: verified.length,
      verifiedTesters: verified.map(v => ({
        ...v.tester,
        verificationNote: v.note,
        verifiedAt: v.createdAt,
      })),
    })
  } catch (error) {
    console.error('Get verified testers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch verified testers' },
      { status: 500 }
    )
  }
}
