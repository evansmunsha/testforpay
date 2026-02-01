import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * POST /api/testers/[id]/update-reputation
 * Updates tester's reputation stats based on completed applications
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify tester exists
    const tester = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    })

    if (!tester || tester.role !== 'TESTER') {
      return NextResponse.json(
        { error: 'Tester not found' },
        { status: 404 }
      )
    }

    // Get all completed applications for this tester
    const completedApps = await prisma.application.findMany({
      where: {
        testerId: id,
        status: 'COMPLETED',
      },
      include: {
        payment: true,
      },
    })

    // Calculate statistics
    const totalTestsCompleted = completedApps.length
    const totalEarnings = completedApps.reduce((sum, app) => sum + (app.payment?.amount || 0), 0)
    const avgEngagementScore =
      totalTestsCompleted > 0
        ? completedApps.reduce((sum, app) => sum + (app.engagementScore || 0), 0) / totalTestsCompleted
        : 0

    // Get all ratings
    const withRatings = completedApps.filter(app => app.rating && app.rating > 0)
    const avgRating =
      withRatings.length > 0
        ? withRatings.reduce((sum, app) => sum + (app.rating || 0), 0) / withRatings.length
        : 0

    // Update user reputation
    const updated = await prisma.user.update({
      where: { id },
      data: {
        totalTestsCompleted,
        totalEarnings,
        averageEngagementScore: Math.round(avgEngagementScore * 100) / 100,
        averageRating: Math.round(avgRating * 100) / 100,
      },
      select: {
        totalTestsCompleted: true,
        totalEarnings: true,
        averageEngagementScore: true,
        averageRating: true,
      },
    })

    return NextResponse.json({
      success: true,
      reputation: updated,
    })
  } catch (error) {
    console.error('Update reputation error:', error)
    return NextResponse.json(
      { error: 'Failed to update reputation' },
      { status: 500 }
    )
  }
}
