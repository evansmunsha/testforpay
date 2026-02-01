import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/leaderboards/top-testers
 * Returns top testers ranked by average engagement score
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const category = searchParams.get('category') || 'all-time'

    // Fetch top testers
    const topTesters = await prisma.user.findMany({
      where: {
        role: 'TESTER',
        suspended: false,
        totalTestsCompleted: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        email: true,
        averageEngagementScore: true,
        totalTestsCompleted: true,
        totalEarnings: true,
        averageRating: true,
        createdAt: true,
      },
      orderBy: {
        averageEngagementScore: 'desc',
      },
      take: limit,
      skip: offset,
    })

    // Get total count for pagination
    const totalTesters = await prisma.user.count({
      where: {
        role: 'TESTER',
        suspended: false,
        totalTestsCompleted: { gt: 0 },
      },
    })

    // Add rank to each tester
    const rankedTesters = topTesters.map((tester, index) => ({
      ...tester,
      rank: offset + index + 1,
      badge: getBadge(tester.averageEngagementScore || 0),
    }))

    return NextResponse.json({
      success: true,
      leaderboard: rankedTesters,
      pagination: {
        total: totalTesters,
        limit,
        offset,
        hasMore: offset + limit < totalTesters,
      },
    })
  } catch (error) {
    console.error('Get leaderboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}

function getBadge(score: number): string {
  if (score >= 85) return '🥇 Excellent'
  if (score >= 70) return '🥈 Good'
  if (score >= 50) return '🥉 Satisfactory'
  if (score >= 30) return 'Fair'
  return 'New'
}
