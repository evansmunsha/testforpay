import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/testers/search?q=john
 * Search for testers by name
 */
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // SECURITY: Limit tester search to developers/admins to prevent public scraping.
    if (currentUser.role !== 'DEVELOPER' && currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    if (query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const testers = await prisma.user.findMany({
      where: {
        role: 'TESTER',
        suspended: false,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        averageEngagementScore: true,
        totalTestsCompleted: true,
        averageRating: true,
        createdAt: true,
      },
      take: limit,
      orderBy: { averageEngagementScore: 'desc' },
    })

    return NextResponse.json({
      success: true,
      count: testers.length,
      testers,
    })
  } catch (error) {
    console.error('Tester search error:', error)
    return NextResponse.json(
      { error: 'Failed to search testers' },
      { status: 500 }
    )
  }
}
