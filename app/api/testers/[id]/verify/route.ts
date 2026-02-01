import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/testers/[id]/verify
 * Verify tester as high-quality
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Only developers can verify testers' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { note } = body

    // Check if tester exists
    const tester = await prisma.user.findUnique({
      where: { id },
    })

    if (!tester || tester.role !== 'TESTER') {
      return NextResponse.json(
        { error: 'Tester not found' },
        { status: 404 }
      )
    }

    // Check if already verified
    const existing = await prisma.verifiedTester.findUnique({
      where: {
        developerId_testerId: { developerId: currentUser.userId, testerId: id },
      },
    })

    if (existing) {
      // Update existing verification
      const updated = await prisma.verifiedTester.update({
        where: { id: existing.id },
        data: {
          note: note || existing.note,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Verification updated',
        verification: updated,
      })
    }

    // Create new verification
    const verification = await prisma.verifiedTester.create({
      data: {
        developerId: currentUser.userId,
        testerId: id,
        note,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Tester verified',
      verification,
    })
  } catch (error) {
    console.error('Verify tester error:', error)
    return NextResponse.json(
      { error: 'Failed to verify tester' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/testers/[id]/verify
 * Remove verification
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { id } = await params

    await prisma.verifiedTester.deleteMany({
      where: {
        developerId: currentUser.userId,
        testerId: id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Verification removed',
    })
  } catch (error) {
    console.error('Unverify tester error:', error)
    return NextResponse.json(
      { error: 'Failed to remove verification' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/testers/[id]/verify
 * Check if developer verified this tester
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return NextResponse.json({
        isVerified: false,
        note: null,
      })
    }

    const { id } = await params

    const verification = await prisma.verifiedTester.findUnique({
      where: {
        developerId_testerId: { developerId: currentUser.userId, testerId: id },
      },
    })

    return NextResponse.json({
      success: true,
      isVerified: !!verification,
      note: verification?.note || null,
    })
  } catch (error) {
    console.error('Check verification status error:', error)
    return NextResponse.json({
      isVerified: false,
      note: null,
    })
  }
}
