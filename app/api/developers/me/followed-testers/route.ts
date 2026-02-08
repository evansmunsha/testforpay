import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/developers/me/followed-testers
 * Get all bookmarked testers for current developer
 */
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Only developers can view bookmarks' },
        { status: 403 }
      )
    }

    const followed = await prisma.followedTester.findMany({
      where: { developerId: currentUser.userId },
      include: {
        tester: {
          select: {
            id: true,
            name: true,
            averageEngagementScore: true,
            totalTestsCompleted: true,
            averageRating: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const testerIds = followed.map(f => f.tester.id)
    const sharedApplications = await prisma.application.findMany({
      where: {
        testerId: { in: testerIds },
        job: { developerId: currentUser.userId },
      },
      select: { testerId: true },
    })
    const testersWithApps = new Set(sharedApplications.map(a => a.testerId))

    const testersWithEmail = await prisma.user.findMany({
      where: { id: { in: testerIds } },
      select: { id: true, email: true },
    })
    const emailById = new Map(testersWithEmail.map(t => [t.id, t.email]))

    return NextResponse.json({
      success: true,
      count: followed.length,
      followedTesters: followed.map(f => ({
        ...f.tester,
        email: testersWithApps.has(f.tester.id) ? (emailById.get(f.tester.id) || null) : null,
        bookmarkedAt: f.createdAt,
      })),
    })
  } catch (error) {
    console.error('Get followed testers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookmarks' },
      { status: 500 }
    )
  }
}
