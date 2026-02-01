import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/testers/[id]/follow
 * Add tester to bookmarks
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Only developers can bookmark testers' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Prevent self-follow
    if (id === currentUser.userId) {
      return NextResponse.json(
        { error: 'Cannot bookmark yourself' },
        { status: 400 }
      )
    }

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

    // Check if already following
    const existing = await prisma.followedTester.findUnique({
      where: {
        developerId_testerId: { developerId: currentUser.userId, testerId: id },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Already bookmarked' },
        { status: 400 }
      )
    }

    // Create bookmark
    await prisma.followedTester.create({
      data: {
        developerId: currentUser.userId,
        testerId: id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Tester bookmarked',
    })
  } catch (error) {
    console.error('Follow tester error:', error)
    return NextResponse.json(
      { error: 'Failed to bookmark tester' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/testers/[id]/follow
 * Remove tester from bookmarks
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

    await prisma.followedTester.deleteMany({
      where: {
        developerId: currentUser.userId,
        testerId: id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Bookmark removed',
    })
  } catch (error) {
    console.error('Unfollow tester error:', error)
    return NextResponse.json(
      { error: 'Failed to remove bookmark' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/testers/[id]/follow
 * Check if developer is following tester
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'DEVELOPER') {
      return NextResponse.json(
        { isFollowing: false }
      )
    }

    const { id } = await params

    const follow = await prisma.followedTester.findUnique({
      where: {
        developerId_testerId: { developerId: currentUser.userId, testerId: id },
      },
    })

    return NextResponse.json({
      success: true,
      isFollowing: !!follow,
    })
  } catch (error) {
    console.error('Check follow status error:', error)
    return NextResponse.json(
      { isFollowing: false }
    )
  }
}
