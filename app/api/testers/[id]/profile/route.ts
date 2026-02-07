import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/testers/[id]/profile
 * Returns a tester's profile information
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id } = await params

    // SECURITY: Only developers/admins (or the tester themself) can view profiles.
    if (
      currentUser.role !== 'ADMIN' &&
      currentUser.role !== 'DEVELOPER' &&
      currentUser.userId !== id
    ) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

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

    const isAdmin = currentUser.role === 'ADMIN'
    const isSelf = currentUser.userId === id
    const isDeveloper = currentUser.role === 'DEVELOPER'

    let hasWorkedTogether = false
    if (isDeveloper && !isAdmin && !isSelf) {
      const shared = await prisma.application.findFirst({
        where: {
          testerId: id,
          job: {
            developerId: currentUser.userId,
          },
        },
        select: { id: true },
      })
      hasWorkedTogether = !!shared
    }

    // Developers can see tester email only if they've worked together.
    const canSeeEmail = isAdmin || isSelf || hasWorkedTogether
    // Only admin or the tester can see earnings/device info.
    const canSeeEarnings = isAdmin || isSelf
    const canSeeDeviceInfo = isAdmin || isSelf

    return NextResponse.json({
      success: true,
      profile: {
        ...tester,
        email: canSeeEmail ? tester.email : null,
        totalEarnings: canSeeEarnings ? tester.totalEarnings : null,
        deviceInfo: canSeeDeviceInfo ? tester.deviceInfo : null,
      },
    })
  } catch (error) {
    console.error('Get tester profile error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
