import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { calculateEngagementScore, explainEngagementScore } from '@/lib/engagement-scoring'

/**
 * GET /api/applications/[id]/engagement-score
 * Returns engagement score breakdown for an application
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          select: { developerId: true },
        },
        tester: {
          select: { name: true, email: true },
        },
      },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Only developer or admin can view the score
    if (
      currentUser.userId !== application.job.developerId &&
      currentUser.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const score = calculateEngagementScore(application as any)
    const breakdown = explainEngagementScore(application as any)

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      engagementScore: score,
      breakdown: breakdown.breakdown,
      total: breakdown.total,
    })
  } catch (error) {
    console.error('Get engagement score error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate engagement score' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/applications/[id]/engagement-score
 * Recalculates and saves engagement score
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          select: { developerId: true },
        },
        tester: {
          select: { name: true, email: true },
        },
      },
    }) as any

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Only developer or admin can recalculate
    if (
      currentUser.userId !== application.job.developerId &&
      currentUser.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Calculate score and save it
    const score = calculateEngagementScore(application as any)

    // Update engagement score and feedback submission time with raw SQL
    // (engagementScore field exists in DB but not yet in Prisma types)
    
    await prisma.$executeRaw`
      UPDATE "Application" 
      SET "engagementScore" = ${score}, "feedbackSubmittedAt" = NOW() 
      WHERE "id" = ${id}
    `

    return NextResponse.json({
      success: true,
      applicationId: id,
      engagementScore: score,
      testerName: application.tester?.name || 'Tester',
    })
  } catch (error) {
    console.error('Update engagement score error:', error)
    return NextResponse.json(
      { error: 'Failed to update engagement score' },
      { status: 500 }
    )
  }
}
