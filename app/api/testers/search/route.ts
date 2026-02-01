import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/testers/search?q=john
 * Search for testers by name or email
 */
export async function GET(request: Request) {
  try {
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
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
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
